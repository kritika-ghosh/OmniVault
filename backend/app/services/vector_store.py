import os
import yaml
from pathlib import Path
from typing import Dict, List, Tuple
import chromadb
import re
from chromadb.utils import embedding_functions
from app.config import settings

class VectorStoreService:
    def __init__(self):
        # Initialize the persistent local ChromaDB client
        self.client = chromadb.PersistentClient(path=settings.CHROMADB_DIR)
        
        # Defaulting to a lightweight, fast local embedding function suitable for hackathons
        self.embedding_fn = embedding_functions.DefaultEmbeddingFunction()
        
        # Get or create our core knowledge graph collection
        self.collection = self.client.get_or_create_collection(
            name="omnivault_notes",
            embedding_function=self.embedding_fn,
            metadata={"hnsw:space": "cosine"}  # Optimal for text similarity
        )

    def _parse_markdown_file(self, file_path: Path) -> Tuple[dict, str, bool]:
        """
        Extracts YAML frontmatter metadata and raw content from a markdown note.
        """
        content = ""
        metadata = {}
        is_empty = True

        try:
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                text = f.read()
                
            # Regex to match frontmatter delimited by ---
            match = re.match(r"^---\s*\n(.*?)\n---\s*\n(.*)", text, re.DOTALL)
            if match:
                frontmatter_raw = match.group(1)
                content = match.group(2).strip()
                metadata = yaml.safe_load(frontmatter_raw) or {}
            else:
                content = text.strip()

            is_empty = len(content) == 0
        except Exception:
            pass

        return metadata, content, is_empty

    def _parse_markdown_content(self, text: str) -> Tuple[dict, str, bool]:
        """
        Extracts YAML frontmatter metadata and raw content from a raw markdown string.
        """
        content = ""
        metadata = {}
        is_empty = True

        try:
            # Regex to match frontmatter delimited by ---
            match = re.match(r"^---\s*\n(.*?)\n---\s*\n(.*)", text, re.DOTALL)
            if match:
                frontmatter_raw = match.group(1)
                content = match.group(2).strip()
                metadata = yaml.safe_load(frontmatter_raw) or {}
            else:
                content = text.strip()

            is_empty = len(content) == 0
        except Exception:
            pass

        return metadata, content, is_empty

    def index_notes_vault_in_memory(self, notes_files: List[dict]) -> Tuple[chromadb.Collection, Dict[str, Dict]]:
        """
        Indexes a list of in-memory note files into an ephemeral, stateless ChromaDB collection.
        """
        client = chromadb.EphemeralClient()
        collection = client.get_or_create_collection(
            name="temp_omnivault_notes",
            embedding_function=self.embedding_fn,
            metadata={"hnsw:space": "cosine"}
        )
        
        existing_notes_meta = {}
        ids = []
        documents = []
        metadatas = []

        for f in notes_files:
            rel_path = f.get("path", "")
            content_raw = f.get("content", "")
            filename = os.path.basename(rel_path)
            stem = os.path.splitext(filename)[0]

            frontmatter, content, is_empty = self._parse_markdown_content(content_raw)
            
            slug = frontmatter.get("slug", stem).lower().strip()
            title = frontmatter.get("title", stem)
            status = frontmatter.get("status", "draft")

            meta_record = {
                "title": title,
                "status": status,
                "is_empty": is_empty,
                "file_path": rel_path
            }
            
            existing_notes_meta[slug] = meta_record

            if not is_empty:
                ids.append(slug)
                documents.append(content)
                metadatas.append({
                    "title": title,
                    "status": status
                })

        if ids:
            collection.upsert(
                ids=ids,
                documents=documents,
                metadatas=metadatas
            )

        return collection, existing_notes_meta

    def semantic_search_on_collection(self, collection: chromadb.Collection, query: str, limit: int = 1) -> List[Dict]:
        """
        Queries an ephemeral ChromaDB collection for text similarity.
        """
        results = collection.query(
            query_texts=[query],
            n_results=limit
        )
        
        parsed_results = []
        if results and results['ids'] and results['ids'][0]:
            for i in range(len(results['ids'][0])):
                parsed_results.append({
                    "id": results['ids'][0][i],
                    "score": results['distances'][0][i] if 'distances' in results else 1.0,
                    "metadata": results['metadatas'][0][i] if 'metadatas' in results else {}
                })
        return parsed_results

    def index_notes_vault(self, notes_dir_path: str) -> Dict[str, Dict]:
        """
        Scans the notes directory, builds metadata records, and indexes notes into ChromaDB.
        Returns a dictionary mapping sanitized titles/slugs to file metadata for the Gap Detector.
        """
        vault_path = Path(notes_dir_path)
        existing_notes_meta = {}

        if not vault_path.exists():
            return existing_notes_meta

        ids = []
        documents = []
        metadatas = []

        for file_path in vault_path.rglob("*.md"):
            frontmatter, content, is_empty = self._parse_markdown_file(file_path)
            
            # Use lowercase file stem (slug) or explicit title as the unique cross-reference key
            slug = frontmatter.get("slug", file_path.stem).lower().strip()
            title = frontmatter.get("title", file_path.stem)
            status = frontmatter.get("status", "draft")

            # Document metadata strictly restricted to primitive types for ChromaDB compatibility
            meta_record = {
                "title": title,
                "status": status,
                "is_empty": is_empty,
                "file_path": str(file_path)
            }
            
            existing_notes_meta[slug] = meta_record

            # Only index into the vector store if it actually has substantive content to embed
            if not is_empty:
                ids.append(slug)
                documents.append(content)
                metadatas.append({
                    "title": title,
                    "status": status
                })

        # Batch upsert to indexer
        if ids:
            self.collection.upsert(
                ids=ids,
                documents=documents,
                metadatas=metadatas
            )

        return existing_notes_meta

    def semantic_search(self, query: str, limit: int = 1) -> List[Dict]:
        """
        Queries ChromaDB vector collection to check for semantically close notes.
        """
        results = self.collection.query(
            query_texts=[query],
            n_results=limit
        )
        
        parsed_results = []
        if results and results['ids'] and results['ids'][0]:
            for i in range(len(results['ids'][0])):
                parsed_results.append({
                    "id": results['ids'][0][i],
                    "score": results['distances'][0][i] if 'distances' in results else 1.0,
                    "metadata": results['metadatas'][0][i] if 'metadatas' in results else {}
                })
        return parsed_results