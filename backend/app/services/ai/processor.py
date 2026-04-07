import os
from typing import List
from langchain_community.document_loaders import PyMuPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.documents import Document

class PDFProcessor:
    def __init__(self):
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200,
            separators=["\n\n", "\n", ".", " ", ""]
        )

    def load_and_split_pdf(self, file_path: str) -> List[Document]:
        """
        Loads a PDF using PyMuPDF and splits the text into chunks.
        Adds original file_name and page_number to each chunk's metadata.
        """
        loader = PyMuPDFLoader(file_path)
        documents = loader.load()
        
        file_name = os.path.basename(file_path)
        
        for doc in documents:
            doc.metadata["file_name"] = file_name
            if "page" in doc.metadata:
                doc.metadata["page_number"] = doc.metadata["page"] + 1 # PyMuPDF is 0-indexed typically
            else:
                doc.metadata["page_number"] = 1
                
        chunks = self.text_splitter.split_documents(documents)
        return chunks
