# How to Run Auditor AI

This document provides concise instructions for running the Auditor AI project. For detailed setup requirements and API key configuration, please refer to the `SETUP.md` file.

**Important:** Before running, ensure you have created a `.env` file in the project root (you can copy `.env.example` and fill in your keys).

---

## Method 1: Using Docker (Recommended)

This is the easiest method if you have Docker and Docker Compose installed.

1. Open a terminal in the root directory of the project.
2. Build and start the containers by running:
   ```bash
   docker-compose up --build
   ```
3. Once the containers are running, you can access the application:
   - **Frontend UI:** [http://localhost](http://localhost)
   - **Backend API:** [http://localhost:8000](http://localhost:8000)

To stop the servers, press `Ctrl+C` in the terminal, or run `docker-compose down`.

---

## Method 2: Native Local Setup

This method runs the backend and frontend directly on your host machine. It requires **Python 3.10+** and **Node.js 18+**.

### Option A: One-Click Script (Windows Only)
Simply double-click the `setup.bat` file in the root folder. It will check your environment, install any missing dependencies, and start the application.

### Option B: Manual Terminal Execution
You will need to run the backend and frontend in **two separate terminal windows**.

#### Terminal 1: Start the Backend Server
```bash
cd backend

# 1. Create and activate a virtual environment
# Windows:
python -m venv venv
.\venv\Scripts\activate
# Mac/Linux:
# python3 -m venv venv
# source venv/bin/activate

# 2. Install Python dependencies (first time only)
pip install -r requirements.txt

# 3. Run the FastAPI server
uvicorn main:app --reload --port 8000
```

#### Terminal 2: Start the Frontend Server
```bash
cd frontend

# 1. Install Node modules (first time only)
npm install

# 2. Run the Vite development server
npm run dev
```

### Access the Application
Once both servers are running locally, open your browser and navigate to:
**[http://localhost:5173](http://localhost:5173)**
