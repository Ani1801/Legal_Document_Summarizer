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
GEMINI_MODELS = ["gemini-2.0-flash", "gemini-2.0-flash-lite", "gemini-2.5-flash"]
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
        Generates an AI answer using Gemini based on real document context.
        Falls back through multiple models on API errors.
        """
        # Build context string from document chunks
        context = "\n\n".join([
            f"[Page {c.get('page_number', '?')}] {c.get('text', '')}"
            for c in chunks
        ])

        formatted_prompt = self.prompt.format_messages(
            context=context,
            question=question
        )

        last_error = None

        for model_name in GEMINI_MODELS:
            for attempt in range(MAX_RETRIES):
                try:
                    llm = self._get_llm(model_name)
                    response = await llm.ainvoke(formatted_prompt)
                    return response.content
                except Exception as e:
                    last_error = e
                    error_str = str(e).lower()
                    is_retryable = any(code in error_str for code in ["503", "429", "unavailable", "overloaded", "quota"])
                    if is_retryable:
                        print(f"[ChatService] {model_name} attempt {attempt + 1} failed: {e}")
                        if attempt < MAX_RETRIES - 1:
                            await asyncio.sleep(RETRY_DELAY)
                        continue
                    else:
                        raise e

            print(f"[ChatService] All retries exhausted for {model_name}")

        raise Exception(f"All Gemini models failed. Last error: {last_error}")
