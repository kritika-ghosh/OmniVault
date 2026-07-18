import uuid
import os
from typing import List
from pypdf import PdfReader
from app.features.mutated_companion.database import db

class RAGService:
    @staticmethod
    def extract_text_from_pdf(file_path: str) -> str:
        """Extracts raw text content from a text-based PDF file."""
        reader = PdfReader(file_path)
        full_text = []
        for page in reader.pages:
            text = page.extract_text()
            if text:
                full_text.append(text)
        return "\n".join(full_text)

    @staticmethod
    def extract_text_from_markdown(file_path: str) -> str:
        """Extracts text content from a pure text Markdown file."""
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            return f.read()

    @staticmethod
    def chunk_text(text: str, chunk_size: int = 500, overlap: int = 50) -> List[str]:
        """Splits raw text into smaller overlapping chunks to maintain semantic context."""
        words = text.split()
        chunks = []
        
        for i in range(0, len(words), chunk_size - overlap):
            chunk = " ".join(words[i : i + chunk_size])
            if chunk.strip():
                chunks.append(chunk)
                
        return chunks

    @classmethod
    def process_and_store_document(cls, file_path: str, filename: str) -> List[str]:
        """Runs the extraction, chunking, and storage loop based on file type."""
        # Check the file extension to decide the extraction method
        if filename.lower().endswith(('.md', '.txt')):
            raw_text = cls.extract_text_from_markdown(file_path)
        else:
            raw_text = cls.extract_text_from_pdf(file_path)
            
        chunks = cls.chunk_text(raw_text)
        
        ids = [f"chunk_{uuid.uuid4().hex[:8]}" for _ in chunks]
        metadatas = [{"filename": filename} for _ in chunks]
        
        collection = db.get_collection()
        collection.add(
            ids=ids,
            documents=chunks,
            metadatas=metadatas
        )
        
        return ids

    @classmethod
    def process_and_store_directory(cls, dir_path: str) -> List[str]:
        """Scans a local workspace directory, processing and indexing all PDFs and Markdown files."""
        all_ids = []
        if not os.path.exists(dir_path):
            return all_ids
            
        for root_dir, _, files in os.walk(dir_path):
            for file in files:
                if file.lower().endswith(('.md', '.txt', '.pdf')):
                    file_path = os.path.join(root_dir, file)
                    try:
                        ids = cls.process_and_store_document(file_path, file)
                        all_ids.extend(ids)
                    except Exception as e:
                        print(f"Error processing folder file {file}: {e}")
        return all_ids

    @staticmethod
    def retrieve_relevant_context(query: str, n_results: int = 5) -> str:
        """Queries the store for the top-k most semantically matching text blocks."""
        collection = db.get_collection()
        results = collection.query(query_texts=[query], n_results=n_results)
        
        documents = results.get("documents", [[]])[0]
        return "\n\n---\n\n".join(documents)
