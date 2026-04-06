from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from motor.motor_asyncio import AsyncIOMotorClient
import jwt
from bson import ObjectId
from app.core.config import settings
from typing import List, Dict, Any

router = APIRouter()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")

def get_db():
    client = AsyncIOMotorClient(settings.MONGO_URI, serverSelectionTimeoutMS=5000)
    db = client[settings.DATABASE_NAME]
    return db

async def get_current_user(token: str = Depends(oauth2_scheme), db=Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except jwt.PyJWTError:
        raise credentials_exception
    
    user = await db["users"].find_one({"email": email})
    if user is None:
        raise credentials_exception
    return user

@router.get("/dashboard/stats")
async def get_dashboard_stats(current_user: dict = Depends(get_current_user), db=Depends(get_db)):
    audits_collection = db["audits"]
    
    # We might have stored user_id in audits as string or ObjectId. Let's check both or just string, since user id in auth is string usually
    user_id_str = str(current_user["_id"])
    
    # Try ObjectId conversion in case we stored it that way
    try:
        user_id_obj = ObjectId(user_id_str)
        query = {"$or": [{"user_id": user_id_str}, {"user_id": user_id_obj}]}
    except:
        query = {"user_id": user_id_str}

    audits = await audits_collection.find(query).to_list(length=None)
    
    total_audits = len(audits)
    if total_audits == 0:
        return {
            "Total Audits": 0,
            "Critical Risks": 0,
            "Average Compliance": 0
        }
        
    critical_risks = 0
    total_score = 0
    
    for audit in audits:
        total_score += audit.get("risk_score", 0)
        
        # Check if any risk is high severity
        risks = audit.get("risks", [])
        if any(r.get("severity", "").lower() == "high" for r in risks):
            critical_risks += 1
            
    average_compliance = round(total_score / total_audits, 2)
    
    return {
        "Total Audits": total_audits,
        "Critical Risks": critical_risks,
        "Average Compliance": average_compliance
    }

@router.get("/audits/recent")
async def get_recent_audits(current_user: dict = Depends(get_current_user), db=Depends(get_db)):
    audits_collection = db["audits"]
    
    user_id_str = str(current_user["_id"])
    
    try:
        user_id_obj = ObjectId(user_id_str)
        query = {"$or": [{"user_id": user_id_str}, {"user_id": user_id_obj}]}
    except:
        query = {"user_id": user_id_str}

    cursor = audits_collection.find(query).sort("created_at", -1).limit(5)
    audits = await cursor.to_list(length=5)
    
    # Format the result directly matching how the 'Recent Audits' react card expects if possible
    # We will safely return a generic format
    formatted_audits = []
    for a in audits:
        a["_id"] = str(a["_id"])
        if "user_id" in a:
            a["user_id"] = str(a["user_id"])
        formatted_audits.append(a)
        
    return formatted_audits
