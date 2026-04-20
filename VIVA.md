# 📚 Auditor AI — Viva Preparation Guide

> A simple, easy-to-explain overview of the entire project for your viva.

---

## 1. What is this project?

**Auditor AI** is a web application that helps users **upload legal documents (PDFs)** and automatically:
- **Summarize** the document using AI
- **Identify legal risks** (e.g., risky clauses, missing protections)
- **Suggest missing clauses** that should be present in a standard legal document
- **Chat with the document** — ask questions and get AI-generated answers based on the document's content

---

## 2. Tech Stack (What technologies are used?)

### Frontend (What the user sees)
| Technology | Purpose |
|---|---|
| **React 18** | JavaScript library for building the user interface (UI) |
| **Vite** | Fast development server and build tool for React |
| **Tailwind CSS** | Utility-first CSS framework for styling |
| **React Router** | Client-side navigation between pages (Dashboard, Audit, Library, etc.) |
| **Framer Motion** | Smooth animations and transitions in the UI |
| **Lucide React** | Icon library used throughout the interface |

### Backend (Server-side logic)
| Technology | Purpose |
|---|---|
| **Python 3.13** | Programming language for backend logic |
| **FastAPI** | Modern, high-performance Python web framework for building REST APIs |
| **Uvicorn** | ASGI server that runs the FastAPI application |
| **Motor** | Async MongoDB driver for Python (used to read/write data) |
| **PyJWT** | Library for creating and verifying JSON Web Tokens (authentication) |
| **LangChain** | Framework for connecting AI models with external data sources |
| **PyPDF (PDFPlumber)** | Library to extract text content from uploaded PDF files |

### AI / Machine Learning
| Technology | Purpose |
|---|---|
| **Google Gemini API** | Large Language Model (LLM) used for document analysis and chat responses |
| **HuggingFace Embeddings** | Converts text into numerical vectors (384-dimension) for similarity search |
| **Pinecone** | Cloud vector database — stores document embeddings for RAG-based chat |

### Database
| Technology | Purpose |
|---|---|
| **MongoDB Atlas** | Cloud NoSQL database — stores users, audits, and document metadata |

### DevOps / Other
| Technology | Purpose |
|---|---|
| **Docker** | Containerization tool (optional) for packaging the full application |
| **dotenv** | Loads environment variables from `.env` file (API keys, DB credentials) |

---

## 3. Project Architecture (How is it structured?)

```
Legal_Document_Summarizer/
├── frontend/               ← React app (what user sees in browser)
│   ├── src/
│   │   ├── components/     ← Reusable UI pieces (Sidebar, Header, ChatPanel)
│   │   ├── pages/          ← Full pages (Dashboard, AuditNew, Library, Auth)
│   │   ├── context/        ← Global state (AuthContext, ThemeContext)
│   │   └── App.jsx         ← Main app with routing
│   └── package.json
│
├── backend/                ← FastAPI server (handles all logic)
│   ├── main.py             ← Entry point — starts the server, registers routes
│   ├── app/
│   │   ├── api/            ← API route handlers
│   │   │   ├── auth.py     ← Login / Signup endpoints
│   │   │   ├── audits.py   ← Upload PDF + generate audit report
│   │   │   ├── chat.py     ← RAG-based document chat
│   │   │   ├── dashboard.py← Stats + recent audits
│   │   │   ├── library.py  ← List all past audits
│   │   │   └── export.py   ← Export audit report as PDF/DOCX
│   │   ├── models/         ← Data models (Pydantic schemas)
│   │   ├── services/
│   │   │   ├── ai/         ← AI services
│   │   │   │   ├── processor.py     ← PDF text extraction
│   │   │   │   ├── vector_store.py  ← Pinecone vector operations
│   │   │   │   ├── audit_service.py ← Gemini-based document analysis
│   │   │   │   ├── chat_service.py  ← Gemini-based chat responses
│   │   │   │   └── query_service.py ← Vector similarity search
│   │   │   └── database.py ← MongoDB connection + helpers
│   │   └── core/
│   │       └── config.py   ← Environment variable configuration
│   └── requirements.txt
│
├── .env                    ← API keys and secrets (never commit this!)
└── docker-compose.yml      ← Optional Docker setup
```

---

## 4. Complete Application Flow (Step-by-Step)

### Step 1: User Registration / Login
```
Browser → POST /api/auth/signup → FastAPI → MongoDB (save user) → JWT Token → Browser (stored in localStorage)
```
- User enters name, email, password on the Auth page
- Backend hashes the password using **bcrypt**
- A **JWT (JSON Web Token)** is generated and sent back
- Frontend stores the token in `localStorage` for future API calls

### Step 2: Upload a Legal Document (PDF)
```
Browser → POST /api/audits/upload (with PDF file) → FastAPI
   → Step A: Save PDF to server's /uploads/ folder
   → Step B: Extract text from PDF using PyPDF/PDFPlumber
   → Step C: Split text into small "chunks" (paragraphs)
   → Step D: Send chunks to Google Gemini for analysis
   → Step E: Gemini returns: Summary + Risks + Missing Clauses
   → Step F: Save audit result to MongoDB
   → Return JSON result to browser
```

### Step 3: View Audit Results
- **Summary Tab**: Shows the AI-generated overview of the document
- **Risks Tab**: Lists identified legal risks with severity
- **Suggestions Tab**: Shows clauses that are typically expected but missing
- **PDF Preview**: The original PDF is displayed in an embedded viewer (iframe)

### Step 4: Chat with Document (RAG)
```
Browser → POST /api/chat (question + audit_id) → FastAPI
   → Step A: Verify user owns this audit
   → Step B: Retrieve relevant text chunks (context)
   → Step C: Send question + context to Gemini
   → Step D: Gemini generates a grounded answer
   → Return answer + source citations to browser
```
- **RAG = Retrieval-Augmented Generation**: The AI only answers based on what's actually in the document, not from general knowledge. This prevents hallucination.

### Step 5: Dashboard
- Shows total audits, critical risks count, and average compliance score
- Lists recent audits for quick access

### Step 6: Library
- Shows all past audits with their risk scores and dates
- Users can click to review any previous audit

---

## 5. Key Concepts to Explain in Viva

### What is RAG (Retrieval-Augmented Generation)?
> RAG is a technique where we first **retrieve** relevant information from a database, then **augment** the AI's prompt with that information, so the AI **generates** an answer grounded in real data. This prevents the AI from making things up.

### What is a Vector Database (Pinecone)?
> Text is converted into numerical arrays called "embeddings" (using HuggingFace). Similar text produces similar numbers. Pinecone stores these embeddings and can quickly find the most similar text chunks when we ask a question.

### What is JWT Authentication?
> JWT (JSON Web Token) is a secure way to authenticate users. After login, the server creates a signed token containing the user's identity. The frontend sends this token with every API request so the server knows who is making the request — without needing to store sessions.

### What is FastAPI?
> FastAPI is a modern Python web framework. It automatically generates API documentation, validates request data using Pydantic models, and supports async/await for high performance.

### What is MongoDB?
> MongoDB is a NoSQL database that stores data as JSON-like documents (called BSON). Unlike SQL databases with rigid tables, MongoDB is flexible — each document can have a different structure. We use it to store users, audits, and their results.

### Why use LangChain?
> LangChain is a framework that simplifies working with LLMs (Large Language Models). It provides ready-made tools for: connecting to Gemini, splitting documents into chunks, managing prompts, and integrating with vector databases like Pinecone.

---

## 6. API Endpoints Summary

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/signup` | Create a new user account |
| `POST` | `/api/auth/login` | Login and receive JWT token |
| `POST` | `/api/audits/upload` | Upload PDF and get AI analysis |
| `GET` | `/api/audits/recent` | Get 5 most recent audits |
| `GET` | `/api/audits/file/{id}` | Download/preview the original PDF |
| `POST` | `/api/chat` | Ask a question about a document |
| `GET` | `/api/dashboard/stats` | Get dashboard statistics |
| `GET` | `/api/library` | Get all past audits |
| `GET` | `/api/export/{id}?format=pdf` | Export audit report as PDF |
| `GET` | `/api/export/{id}?format=docx` | Export audit report as DOCX |

---

## 7. Common Viva Questions & Answers

**Q: What problem does your project solve?**
> Legal professionals manually review contracts which is time-consuming and error-prone. Our tool automates this by using AI to instantly identify risks, missing clauses, and provide summaries.

**Q: Why did you choose FastAPI over Flask/Django?**
> FastAPI is faster (async support), auto-generates API docs, and has built-in data validation with Pydantic — making it ideal for AI-powered REST APIs.

**Q: Why MongoDB instead of MySQL?**
> Legal documents have varying structures (different risks, clauses, metadata). MongoDB's flexible document model handles this naturally without rigid table schemas.

**Q: How do you ensure the AI doesn't hallucinate?**
> We use RAG (Retrieval-Augmented Generation). The AI only receives actual text from the uploaded document as context, and is instructed to answer only based on that context.

**Q: How is user data secured?**
> Passwords are hashed with bcrypt (never stored in plain text). API access is protected with JWT tokens. Each user can only access their own audits.

**Q: Can this handle multiple users?**
> Yes. Each audit is tagged with a `user_id`. MongoDB queries filter by user, and JWT tokens ensure only authenticated users access their own data.

---

## 8. How to Run the Project

```bash
# Terminal 1 — Backend
cd backend
uvicorn main:app --reload --port 8000

# Terminal 2 — Frontend
cd frontend
npm run dev

# Open browser at http://localhost:5173
```

**Prerequisites:** Python 3.10+, Node.js 18+, MongoDB Atlas account, Google Gemini API key.

---

*Good luck with your viva! 🎓*
