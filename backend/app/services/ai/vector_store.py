import os
from dotenv import load_dotenv
load_dotenv()

from langchain_huggingface import HuggingFaceEmbeddings
from langchain_pinecone import PineconeVectorStore
from typing import List
from langchain_core.documents import Document

class VectorStoreService:
    def __init__(self):
        # HuggingFace Embeddings (100% Free)
        self.embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
        self.index_name = os.getenv("PINECONE_INDEX_NAME", "legal-auditor")
        self.pinecone_api_key = os.getenv("PINECONE_API_KEY")
        self.pinecone_host = os.getenv("PINECONE_HOST")
        
    def upsert_chunks(self, chunks: List[Document], user_id: str, audit_id: str):
        """
        Upserts document chunks into Pinecone.
        WARNING: Ensure your Pinecone index is configured with dimension=384 for this to work.
        """
        for chunk in chunks:
            chunk.metadata["user_id"] = user_id
            chunk.metadata["audit_id"] = audit_id

        # Create or update PineconeVectorStore
        vector_store = PineconeVectorStore.from_documents(
            documents=chunks,
            embedding=self.embeddings,
            index_name=self.index_name,
            namespace=user_id
        )
        return True

    def search_similar(self, query: str, user_id: str, audit_id: str, k: int = 5) -> List[Document]:
        """
        Searches the Pinecone store for documents similar to the query.
        """
        vector_store = PineconeVectorStore(
            index_name=self.index_name,
            embedding=self.embeddings,
            namespace=user_id
        )
        
        filter_dict = {
            "user_id": user_id,
            "audit_id": audit_id
        }
        
        return vector_store.similarity_search(query, k=k, filter=filter_dict)
