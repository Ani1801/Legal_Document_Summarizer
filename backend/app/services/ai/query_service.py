"""
Query Service — Vector Retrieval Logic for RAG Chat.

Takes a user's question, converts it to a vector using the same HuggingFace
embedding model (all-MiniLM-L6-v2), and fetches the top-k most relevant chunks
from Pinecone for a specific audit_id.
"""

from typing import List, Dict, Any
from app.services.ai.vector_store import VectorStoreService


class QueryService:
    def __init__(self):
        self.vector_store = VectorStoreService()

    def retrieve_relevant_chunks(
        self,
        question: str,
        user_id: str,
        audit_id: str,
        top_k: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Retrieves the top-k most relevant document chunks for a given question.

        Args:
            question: The user's natural language question.
            user_id: The authenticated user's ID (Pinecone namespace).
            audit_id: The specific audit/document to search within.
            top_k: Number of chunks to retrieve (default: 5).

        Returns:
            List of dicts with keys: text, page_number, file_name
        """
        # Use the existing VectorStoreService.search_similar() method
        # which handles embedding the query and searching Pinecone
        documents = self.vector_store.search_similar(
            query=question,
            user_id=user_id,
            audit_id=audit_id,
            k=top_k
        )

        # Transform LangChain Document objects into clean dicts
        results = []
        for doc in documents:
            results.append({
                "text": doc.page_content,
                "page_number": doc.metadata.get("page_number", 1),
                "file_name": doc.metadata.get("file_name", "Unknown"),
            })

        return results
