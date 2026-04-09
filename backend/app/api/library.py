from fastapi import APIRouter, Depends
from typing import List
from ..models.library import LibraryDocument
from .dashboard import get_current_user, get_db

router = APIRouter()

@router.get("/library", response_model=List[LibraryDocument])
async def get_library_documents(current_user: dict = Depends(get_current_user), db=Depends(get_db)):
    audits_collection = db["audits"]
    
    user_id_str = str(current_user["_id"])
    query = {"user_id": user_id_str}

    cursor = audits_collection.find(query).sort("created_at", -1)
    audits = await cursor.to_list(length=None)
    
    formatted_docs = []
    for a in audits:
        doc_id = str(a["_id"])
        file_name = a.get("file_name", "Unknown Document")
        
        if "." in file_name:
            doc_type = file_name.split(".")[-1].upper()
        else:
            doc_type = "UNKNOWN"
            
        doc_size = "1.2 MB" # Mock size
        
        created_at = a.get("created_at")
        if created_at:
            doc_date = created_at.strftime("%Y-%m-%d")
        else:
            doc_date = "N/A"
            
        formatted_docs.append(
            LibraryDocument(
                id=doc_id,
                name=file_name,
                type=doc_type,
                size=doc_size,
                date=doc_date
            )
        )
        
    return formatted_docs
