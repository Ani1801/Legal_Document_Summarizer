# Auditor AI — Legal Document Summarizer & Auditor

An AI-powered legal-tech platform that analyzes PDFs for risks, generates structured audit reports, enables multi-document comparison, runs compliance checks against global regulations, and lets you **chat with your documents** using Retrieval-Augmented Generation (RAG).

---

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

### Phase 3 — RAG Chat
- **Chat with Document**: Ask natural-language questions about any audited PDF
- Retrieval-Augmented Generation: Answers grounded in actual document content
- Page-number citations for every response
- Strict anti-hallucination system prompt
- Rate limiting + Redis caching for performance
- Slide-out chat drawer with typing indicators, suggested questions, and source badges

### Phase 4 — Multi-Document Comparison
- **Compare two contracts** side-by-side (e.g., Old vs. New version)
- Clause-by-clause analysis with match/modified/missing status
- **Risk Shift Score** (-100 to +100) showing if the new version is safer
- Missing protections highlighted per document

### Phase 5 — Agentic Compliance Checker
- Proactive compliance auditing against **GDPR**, **CCPA**, and **2026 EU AI Act**
- Specific redline suggestions for each violation
- Prioritized action items for remediation
- Overall compliance score (0-100)

### Phase 6 — Production Hardening
- **PDF/DOCX Export**: Download branded audit reports with cover page, risk table, chat history
- **Redis Caching**: Optional Upstash/Redis chat response caching with graceful fallback
- **Docker**: Full Dockerfile + docker-compose for backend, frontend, and MongoDB
- **Render.com**: Deployment blueprint for one-click cloud hosting
- **Notification System**: Real-time audit event notifications in the header
- **Gemini Model Fallback**: Auto-retry with backup models on API overload (503/429)

---

## 🏗 Architecture

```
Frontend (React + Vite)  ──→  Backend (FastAPI)  ──→  MongoDB (Metadata)
        │                          │                    
        │                          ├──→  Pinecone (Vectors, 384-dim)
        │                          │
        │                          ├──→  Gemini 2.0 Flash (AI)
        │                          │         ↑
        │                          │    HuggingFace Embeddings
        │                          │    (all-MiniLM-L6-v2)
        │                          │
        │                          └──→  Redis/Upstash (Cache, optional)
```

---

## 🚀 Quick Start

> **Full detailed guide**: See [`SETUP.md`](./SETUP.md)

```bash
# 1. Clone & configure
git clone https://github.com/Ani1801/Legal_Document_Summarizer.git
cd Legal_Document_Summarizer
copy .env.example .env     # Fill in your API keys

# 2. Backend
cd backend
python -m venv venv
.\venv\Scripts\activate     # Windows
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# 3. Frontend (new terminal)
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173** in your browser.

---

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
| GET | `/api/notifications` | ✅ | Audit event notifications |
| POST | `/api/chat` | ✅ | RAG chat with document |
| POST | `/api/compare` | ✅ | Compare two documents |
| POST | `/api/compliance/check` | ✅ | Run compliance check |
| GET | `/api/export/{id}?format=pdf` | ✅ | Export report as PDF |
| GET | `/api/export/{id}?format=docx` | ✅ | Export report as DOCX |

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, Tailwind CSS 3.4, Framer Motion |
| Backend | FastAPI, Python 3.11+, Uvicorn |
| Auth | PyJWT, bcrypt |
| Database | MongoDB (Motor async driver) |
| Vector DB | Pinecone (Starter, 384-dim, cosine) |
| Embeddings | HuggingFace `all-MiniLM-L6-v2` |
| LLM | Google Gemini 2.0 Flash (free tier) |
| PDF Parser | PyMuPDF |
| Reports | ReportLab (PDF), python-docx (DOCX) |
| Caching | Redis / Upstash (optional) |
| Orchestration | LangChain |
| Deployment | Docker, Render.com |

---

## 📄 License

This project is for educational purposes.
