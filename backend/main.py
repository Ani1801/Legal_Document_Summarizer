from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from app.api import auth, dashboard, library, audits, chat, compare, compliance, export
import os
import tempfile
import uuid
from app.services.ai.processor import PDFProcessor
from app.services.ai.vector_store import VectorStoreService

app = FastAPI(title="Auditor AI Backend")

# 1. Expanded Origins 
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
]

# 2. CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# 3. Include Routers
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(dashboard.router, prefix="/api", tags=["dashboard"])
app.include_router(library.router, prefix="/api", tags=["library"])
app.include_router(audits.router, prefix="/api", tags=["audits"])
app.include_router(chat.router, prefix="/api", tags=["chat"])
app.include_router(compare.router, prefix="/api", tags=["compare"])
app.include_router(compliance.router, prefix="/api", tags=["compliance"])
app.include_router(export.router, prefix="/api", tags=["export"])

@app.get("/")
def read_root():
    return {"message": "Welcome to Auditor AI Backend API"}

@app.post("/api/test/process")
async def test_process(file: UploadFile = File(...)):
    temp_path = os.path.join(tempfile.gettempdir(), file.filename)
    content = await file.read()
    with open(temp_path, "wb") as f:
        f.write(content)
        
    try:
        processor = PDFProcessor()
        chunks = processor.load_and_split_pdf(temp_path)
        
        vector_store = VectorStoreService()
        vector_store.upsert_chunks(chunks, "test_user_id", str(uuid.uuid4()))
        
        return {
            "success": True,
            "total_chunks": len(chunks),
            "message": "Successfully Embedded"
        }
    except Exception as e:
        return {"success": False, "error": str(e)}
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)