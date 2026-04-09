from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from app.api import auth, dashboard, library, audits
import os
import tempfile
import uuid
from app.services.ai.processor import PDFProcessor
from app.services.ai.vector_store import VectorStoreService

app = FastAPI(title="Auditor AI Backend")

# 1. Expanded Origins 
# Some browsers resolve 'localhost' to '127.0.0.1', so we include both.
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000", # Common fallback
]

# 2. CORS Middleware (Must be defined before routers)
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"], # Helps some frontend libraries see custom headers
)

# 3. Include Routers
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(dashboard.router, prefix="/api", tags=["dashboard"])
app.include_router(library.router, prefix="/api", tags=["library"])
app.include_router(audits.router, prefix="/api", tags=["audits"])

@app.get("/")
def read_root():
    return {"message": "Welcome to Auditor AI Backend API"}

@app.post("/api/test/process")
async def test_process(file: UploadFile = File(...)):
    # Standard temp directory logic
    temp_path = os.path.join(tempfile.gettempdir(), file.filename)
    
    # Save uploaded file temporarily
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
        # Cleanup: Ensure the file is deleted even if processing fails
        if os.path.exists(temp_path):
            os.remove(temp_path)