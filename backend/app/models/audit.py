from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class Risk(BaseModel):
    title: str
    severity: str
    description: str

class Audit(BaseModel):
    user_id: str
    file_name: str
    status: str = "Pending"
    risk_score: int = Field(default=0, ge=0, le=100)
    summary: str = ""
    risks: List[Risk] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)
