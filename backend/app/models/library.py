from pydantic import BaseModel
from typing import Optional

class LibraryDocument(BaseModel):
    id: str
    name: str
    type: str
    size: str
    date: str
