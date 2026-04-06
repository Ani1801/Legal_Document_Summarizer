import motor.motor_asyncio
from bson import ObjectId
from app.core.config import settings

# Initialize Database Connection
client = motor.motor_asyncio.AsyncIOMotorClient(settings.MONGO_URI)
db = client[settings.DATABASE_NAME]
audits_collection = db["audits"]

async def save_audit(audit_data: dict) -> str:
    """
    Inserts an audit record into the 'audits' collection.
    Converts user_id string to an ObjectId for proper indexing.
    """
    # Ensure user_id is an ObjectId
    if "user_id" in audit_data and isinstance(audit_data["user_id"], str):
        try:
            audit_data["user_id"] = ObjectId(audit_data["user_id"])
        except Exception:
            pass # Keep as string if it's not a valid hex representation of ObjectId
            
    result = await audits_collection.insert_one(audit_data)
    return str(result.inserted_id)
