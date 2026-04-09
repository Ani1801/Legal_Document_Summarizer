# Auditor AI — Setup & Run Guide

> Complete instructions to get the project running on **any machine** (Windows / macOS / Linux).

---

## Prerequisites

| Tool | Version | Check Command |
|------|---------|---------------|
| **Python** | 3.10+ (recommended 3.12) | `python --version` |
| **Node.js** | 18+ (LTS) | `node --version` |
| **npm** | 9+ | `npm --version` |
| **MongoDB** | 6+ (Community or Atlas) | `mongosh --version` |
| **Git** | Any | `git --version` |

---

## 1. Clone the Repository

```bash
git clone <your-repo-url>
cd Legal_Document_Summarizer
```

---

## 2. Environment Variables

Create a `.env` file in the **project root** with the following keys:

```env
# ──────────── Authentication ────────────
SECRET_KEY=09d25e094faa6ca2556c818166b7a9563b93f7099f6f0f4caa6cf63b88e8d3e7
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# ──────────── MongoDB ────────────
MONGO_URI=mongodb://localhost:27017
DATABASE_NAME=auditor_ai

# ──────────── Google Gemini (AI Studio) ────────────
# Get your free key from: https://aistudio.google.com/apikey
GOOGLE_API_KEY=<your-google-api-key>

# ──────────── Pinecone (Vector DB) ────────────
# Sign up at: https://app.pinecone.io
# Create an index: name=legal-auditor, dimension=384, metric=cosine
PINECONE_API_KEY=<your-pinecone-api-key>
PINECONE_INDEX_NAME=legal-auditor
PINECONE_HOST=<your-pinecone-host-url>
```

> **⚠️ IMPORTANT**: Never commit the `.env` file to Git. It is already in `.gitignore`.

---

## 3. Backend Setup

### 3a. Create a Python Virtual Environment

```bash
cd backend

# Windows
python -m venv venv
.\venv\Scripts\activate

# macOS / Linux
python3 -m venv venv
source venv/bin/activate
```

### 3b. Install Python Dependencies

```bash
pip install -r requirements.txt
```

**Full `requirements.txt` should include:**
```
fastapi
uvicorn[standard]
motor
pyjwt
passlib[bcrypt]
python-dotenv
pydantic-settings
email-validator
python-multipart
pymupdf
langchain-core
langchain-community
langchain-text-splitters
langchain-huggingface
langchain-pinecone
langchain-google-genai
sentence-transformers
pinecone-client
google-generativeai
```

> **Note on first run**: The HuggingFace `all-MiniLM-L6-v2` model (~80MB) will be downloaded automatically the first time embeddings are generated. This requires an internet connection.

### 3c. Start MongoDB

Make sure MongoDB is running locally:

```bash
# If installed as a service (Windows)
net start MongoDB

# macOS (Homebrew)
brew services start mongodb-community

# Linux (systemd)
sudo systemctl start mongod

# Or use MongoDB Atlas (cloud) — just update MONGO_URI in .env
```

### 3d. Run the Backend Server

```bash
# From the /backend directory, with venv activated
uvicorn main:app --reload --port 8000
```

The API will be available at: **http://localhost:8000**  
Swagger docs at: **http://localhost:8000/docs**

---

## 4. Frontend Setup

### 4a. Install Node Dependencies

```bash
cd frontend
npm install
```

### 4b. Run the Development Server

```bash
npm run dev
```

The frontend will be available at: **http://localhost:5173**

---

## 5. Pinecone Index Setup (One-Time)

If you don't already have the Pinecone index:

1. Go to [Pinecone Console](https://app.pinecone.io)
2. Create a new index:
   - **Name**: `legal-auditor`
   - **Dimensions**: `384`
   - **Metric**: `cosine`
   - **Cloud**: AWS `us-east-1` (Starter Plan)
3. Copy the **Host URL** and **API Key** to your `.env` file

---

## 6. Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (React + Vite)               │
│              http://localhost:5173                        │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │
│  │ Landing  │ │  Auth    │ │Dashboard │ │  Audit   │   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘   │
│  ┌──────────┐ ┌──────────┐ ┌──────────────────────┐    │
│  │ Library  │ │ Settings │ │ ChatPanel (Phase 3)  │    │
│  └──────────┘ └──────────┘ └──────────────────────┘    │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTP / REST
┌──────────────────────▼──────────────────────────────────┐
│                   BACKEND (FastAPI)                       │
│              http://localhost:8000                        │
│                                                          │
│  ┌─────────────────── API Routes ───────────────────┐   │
│  │ /api/auth/*  │ /api/dashboard/*  │ /api/audits/* │   │
│  │ /api/library │ /api/chat (Phase 3)               │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  ┌─────────────────── Services ─────────────────────┐   │
│  │ processor.py      │ vector_store.py               │   │
│  │ audit_service.py  │ query_service.py (Phase 3)   │   │
│  │ chat_service.py (Phase 3)                         │   │
│  └──────────────────────────────────────────────────┘   │
└──────┬───────────────────────┬──────────────────────────┘
       │                       │
┌──────▼──────┐        ┌───────▼──────┐
│  MongoDB    │        │  Pinecone    │
│ (Metadata)  │        │ (Vectors)    │
│             │        │ 384-dim      │
│ - users     │        │ cosine       │
│ - audits    │        │ ns: user_id  │
└─────────────┘        └──────────────┘
                              │
                       ┌──────▼──────┐
                       │   Gemini    │
                       │  2.5 Flash  │
                       │ (AI Studio) │
                       └─────────────┘
```

---

## 7. Common Issues & Troubleshooting

| Issue | Solution |
|-------|----------|
| `ModuleNotFoundError: No module named 'langchain_huggingface'` | Run `pip install langchain-huggingface sentence-transformers` |
| CORS errors in browser | Ensure backend is running on port 8000 and frontend on 5173 |
| `Pinecone Connection Error` | Check `PINECONE_API_KEY` and `PINECONE_HOST` in `.env` |
| MongoDB connection refused | Make sure `mongod` service is running |
| `422 Unprocessable Entity` on file upload | Install `python-multipart`: `pip install python-multipart` |
| HuggingFace model download hangs | Check internet connection; model is ~80MB on first load |
| Gemini API 429 (rate limit) | Free tier has 15 RPM — wait or upgrade to paid tier |

---

## 8. Running Both Servers Together

Open **two terminals**:

**Terminal 1 — Backend:**
```bash
cd backend
.\venv\Scripts\activate   # Windows
uvicorn main:app --reload --port 8000
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
```

---

## 9. Tech Stack Reference

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | React 18 + Vite | UI Framework |
| Styling | Tailwind CSS 3.4 | Utility-first CSS |
| Animations | Framer Motion | Page transitions & micro-animations |
| Icons | Lucide React | Icon library |
| Backend | FastAPI (Python) | REST API server |
| Auth | PyJWT + bcrypt | Token-based authentication |
| Database | MongoDB + Motor | Async document storage |
| Vector DB | Pinecone (Starter) | Semantic search over embeddings |
| Embeddings | HuggingFace `all-MiniLM-L6-v2` | 384-dim sentence embeddings |
| AI / LLM | Google Gemini 2.5 Flash | Document analysis & RAG chat |
| PDF Parser | PyMuPDF | Extract text from PDFs |
| Orchestration | LangChain | LLM prompt templates & integrations |
