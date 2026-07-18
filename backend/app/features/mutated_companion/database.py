import sys
from app.features.mutated_companion.config import settings

# Adaptive dependency check to bypass Windows C++ compilation traps
try:
    import chromadb
    CHROMA_AVAILABLE = True
except ImportError:
    CHROMA_AVAILABLE = False
    print("\nWARNING: chromadb not found. Falling back to clean In-Memory vector store for local debugging.\n")

class InMemoryVectorStore:
    """Zero-dependency local fallback store to keep hackathon progress moving."""
    def __init__(self):
        self.storage = {}

    def add(self, ids, documents, metadatas=None, embeddings=None):
        for idx, doc_id in enumerate(ids):
            self.storage[doc_id] = {
                "document": documents[idx],
                "metadata": metadatas[idx] if metadatas else {},
                "embedding": embeddings[idx] if embeddings else None
            }

    def query(self, query_texts, n_results=5):
        # Basic keyword scan to simulate vector search locally without dependencies
        results = []
        query_words = set(query_texts[0].lower().split())
        
        for doc_id, data in self.storage.items():
            doc_lower = data["document"].lower()
            score = sum(1 for word in query_words if word in doc_lower)
            results.append((score, data["document"], data["metadata"], doc_id))
        
        # Sort by highest match score
        results.sort(key=lambda x: x[0], reverse=True)
        top_k = results[:n_results]
        
        return {
            "documents": [[item[1] for item in top_k]],
            "metadatas": [[item[2] for item in top_k]],
            "ids": [[item[3] for item in top_k]]
        }

class DatabaseManager:
    def __init__(self):
        if CHROMA_AVAILABLE:
            # Full configuration for production Render environment
            self.client = chromadb.PersistentClient(path=settings.CHROMA_PERSIST_DIR)
            self.collection = self.client.get_or_create_collection(name="mutated_corpus")
            self.is_fallback = False
        else:
            # Local Windows development mode
            self.collection = InMemoryVectorStore()
            self.is_fallback = True

    def get_collection(self):
        return self.collection

# Global database accessor instance
db = DatabaseManager()
