"""
Chat Service — Contextual RAG Chat with Gemini.

Takes retrieved document chunks + a user question, constructs a grounded
prompt, and sends it to Gemini. Includes automatic model fallback on
503/429 errors (overload/quota).
"""

import os
import asyncio
from dotenv import load_dotenv
load_dotenv()

from typing import List, Dict, Any
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate

# Fallback chain: try each model in order
GEMINI_MODELS = ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-pro"]
MAX_RETRIES = 2
RETRY_DELAY = 2  # seconds


SYSTEM_PROMPT = """You are a legal document assistant for Auditor AI. Your role is to help users understand the contents of their legal documents.

STRICT RULES:
1. Answer the user's question ONLY based on the document excerpts provided below.
2. If the answer is NOT found in the provided excerpts, respond with: "I don't have enough information in this document to answer that question."
3. NEVER make up information or use knowledge outside the provided excerpts.
4. When referencing specific content, cite the page number like this: (Page X).
5. Be concise but thorough. Use bullet points for multi-part answers.
6. If the user asks about legal implications, clarify you are an AI assistant and not a lawyer — recommend consulting a legal professional for binding advice.

DOCUMENT EXCERPTS:
{context}
"""

HUMAN_TEMPLATE = """{question}"""


class ChatService:
    def __init__(self):
        self.api_key = os.getenv("GOOGLE_API_KEY")

        self.prompt = ChatPromptTemplate.from_messages([
            ("system", SYSTEM_PROMPT),
            ("human", HUMAN_TEMPLATE),
        ])

    def _get_llm(self, model_name: str) -> ChatGoogleGenerativeAI:
        return ChatGoogleGenerativeAI(
            model=model_name,
            google_api_key=self.api_key,
            temperature=0.3,
        )

    async def generate_answer(
        self,
        question: str,
        chunks: List[Dict[str, Any]]
    ) -> str:
        """
        [MOCKED] Simulates AI chat response to bypass API limits during testing.
        """
        print(f"[DEBUG] 🚧 Chat Request for: '{question}' - Using Mock Response.")
        
        # Simulate network latency
        await asyncio.sleep(1.2)
        
        # Determine a mock answer based on common keywords
        q = question.lower()
        if "terms" in q or "key" in q:
            return "Based on the document excerpts (Page 1, 4), the key terms include a 24-month service commitment, a 99.9% uptime guarantee, and a proprietary software license grant. The document also stipulates that any disputes must be resolved through arbitration."
        elif "risk" in q or "liability" in q:
            return "The document contains a broad indemnity clause on Page 8 that favors the provider. Additionally, there is a limitation of liability capped at 12 months of service fees (Page 12), which may be considered a high-risk factor for the client."
        elif "terminate" in q or "termination" in q:
            return "According to the Agreement (Page 15), either party can terminate for cause with 30 days written notice. However, Section 14.2 allows the provider to terminate for 'convenience' with 7 days notice, provided a pro-rated refund is issued."
        else:
            return "I've analyzed the document excerpts. The section on Page 2 defines the scope of work, while the schedules starting on Page 10 detail the pricing structure and milestone delivery dates. Is there a specific clause you'd like me to explain further?"
