# Auditor AI — Legal Document Summarizer & Auditor

An AI-powered legal-tech platform that analyzes PDFs for risks, generates structured audit reports, and lets you **chat with your documents** using Retrieval-Augmented Generation (RAG).

## ✨ Features

### Phase 1 — Authentication
- Secure signup/login with JWT tokens + bcrypt password hashing
- Protected routes with persistent sessions (localStorage)

### Phase 2 — Document Audit
- Upload PDF documents for automated legal analysis
- Text extraction via PyMuPDF, chunked into semantic segments
- Vector embeddings stored in Pinecone (384-dim, `all-MiniLM-L6-v2`)
- AI-powered audit reports via Google Gemini (Summary, Risks, Risk Score)
- Interactive dashboard with stat cards and recent audits
- Document library with search and filtering

### Phase 3 — RAG Chat *(New)*
- **Chat with Document**: Ask natural-language questions about any audited PDF
- Retrieval-Augmented Generation: Answers grounded in actual document content
- Page-number citations for every response
- Strict anti-hallucination system prompt
- Rate limiting for Gemini free tier compliance (4s cooldown)
- Slide-out chat drawer with typing indicators, suggested questions, and source badges
- Chat available from both Audit results and Library pages

## 🏗 Architecture

```
Frontend (React + Vite)  ──→  Backend (FastAPI)  ──→  MongoDB (Metadata)
        │                          │                    
        │                          ├──→  Pinecone (Vectors, 384-dim)
        │                          │
        │                          └──→  Gemini 2.5 Flash (AI)
        │                                    ↑
        │                          HuggingFace Embeddings
        │                          (all-MiniLM-L6-v2)
```

## 🚀 Quick Start

See [`SETUP.md`](./SETUP.md) for detailed instructions.

```bash
# 1. Clone & configure
git clone <repo-url> && cd Legal_Document_Summarizer
cp .env.example .env   # Fill in your API keys

# 2. Backend
cd backend
python -m venv venv && .\venv\Scripts\activate   # Windows
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# 3. Frontend (new terminal)
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173** in your browser.

## 📁 Project Structure

```
├── .env.example            # Template for environment variables
├── SETUP.md                # Full setup & troubleshooting guide
├── backend/
│   ├── main.py             # FastAPI app entry point
│   ├── requirements.txt    # Python dependencies
│   └── app/
│       ├── api/
│       │   ├── auth.py     # Signup/Login routes
│       │   ├── audits.py   # PDF upload & audit pipeline
│       │   ├── chat.py     # RAG chat endpoint (Phase 3)
│       │   ├── dashboard.py# Stats & recent audits
│       │   └── library.py  # Document library
│       ├── core/
│       │   ├── config.py   # Settings (Pydantic)
│       │   └── security.py # JWT + bcrypt
│       ├── models/
│       │   ├── audit.py    # Audit Pydantic model
│       │   ├── chat.py     # Chat request/response models
│       │   ├── library.py  # Library document model
│       │   └── user.py     # User auth models
│       └── services/
│           ├── database.py # MongoDB operations
│           └── ai/
│               ├── audit_service.py  # Gemini audit analysis
│               ├── chat_service.py   # Gemini RAG chat (Phase 3)
│               ├── processor.py      # PDF loading & chunking
│               ├── query_service.py  # Vector retrieval (Phase 3)
│               └── vector_store.py   # Pinecone embeddings
└── frontend/
    └── src/
        ├── App.jsx             # Routes & layout
        ├── components/
        │   ├── ChatPanel.jsx   # Slide-out chat drawer (Phase 3)
        │   ├── Header.jsx
        │   ├── RecentAudits.jsx
        │   ├── Sidebar.jsx
        │   └── StatCards.jsx
        ├── context/
        │   ├── AuthContext.jsx # Auth state management
        │   └── ThemeContext.jsx# Dark/light mode
        └── pages/
            ├── AuditNew.jsx   # Upload → Audit → Chat
            ├── Auth.jsx       # Login/Signup
            ├── Dashboard.jsx  # Stats overview
            ├── Landing.jsx    # Public landing page
            ├── Library.jsx    # Document library + chat
            └── Settings.jsx   # User settings
```

## 🔌 API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/signup` | ❌ | Create new account |
| POST | `/api/auth/login` | ❌ | Login & get JWT |
| GET | `/api/dashboard/stats` | ✅ | Dashboard statistics |
| GET | `/api/audits/recent` | ✅ | Recent 5 audits |
| POST | `/api/audits/upload` | ✅ | Upload PDF & run audit |
| GET | `/api/audits/file/{id}` | ✅ | Serve PDF for preview |
| GET | `/api/library` | ✅ | All user documents |
| **POST** | **`/api/chat`** | ✅ | **RAG chat with document** |

### Chat API

```bash
POST /api/chat
Authorization: Bearer <token>
Content-Type: application/json

{
  "audit_id": "abc123",
  "question": "What are the payment terms?"
}

# Response
{
  "answer": "According to the document, payment is due within 30 days... (Page 3)",
  "sources": [
    { "text": "Payment shall be made...", "page_number": 3, "file_name": "contract.pdf" }
  ]
}
```

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, Tailwind CSS 3.4, Framer Motion |
| Backend | FastAPI, Python 3.12, Uvicorn |
| Auth | PyJWT, bcrypt |
| Database | MongoDB (Motor async driver) |
| Vector DB | Pinecone (Starter, 384-dim, cosine) |
| Embeddings | HuggingFace `all-MiniLM-L6-v2` |
| LLM | Google Gemini 2.5 Flash (free tier) |
| PDF Parser | PyMuPDF |
| Orchestration | LangChain |

## 📄 License

This project is for educational purposes.
