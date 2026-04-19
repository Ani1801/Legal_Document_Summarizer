import os
from dotenv import load_dotenv
load_dotenv()

from typing import List
from langchain_core.documents import Document
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import PromptTemplate
import json
import asyncio

# Fallback chain: try each model in order
GEMINI_MODELS = ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-pro"]
MAX_RETRIES = 2
RETRY_DELAY = 2  # seconds


class AuditService:
    def __init__(self):
        self.api_key = os.getenv("GOOGLE_API_KEY")

        self.prompt = PromptTemplate(
            input_variables=["context"],
            template="""Analyze these legal document chunks for risks, missing clauses, and a general summary. Return the response as a structured JSON object with categories: Summary, Risks, and Missing Clauses.

Extracted Text:
{context}

Respond ONLY in valid JSON format matching the structure below:
{{
    "Summary": "A 3-sentence overview of the document.",
    "Risks": [
        {{
            "title": "Risk Title",
            "description": "A potentially harmful clause"
        }}
    ],
    "Missing Clauses": [
        "What is standard in legal docs but missing here?"
    ]
}}
"""
        )

    def _get_llm(self, model_name: str) -> ChatGoogleGenerativeAI:
        return ChatGoogleGenerativeAI(
            model=model_name,
            google_api_key=self.api_key,
            temperature=0.2,
        )

    async def generate_analysis(self, chunks: List[Document]) -> dict:
        """
        [MOCKED] Simulates AI analysis to bypass API limits during testing.
        """
        print("[DEBUG] 🚧 API Limit Reached - Using Mock Data for Testing.")
        
        # Simulate network latency
        await asyncio.sleep(1.5)
        
        return {
            "Summary": "MOCK ANALYSIS: This document is a Service Level Agreement (SLA) between the provider and the client. It defines uptime guarantees and support response times.",
            "Risks": [
                {"title": "Arbitration Clause", "description": "Section 8.1 forces mandatory arbitration in a specific jurisdiction, limiting legal recourse."},
                {"title": "Termination for Convenience", "description": "The provider can terminate with 7 days notice, which is high-risk for business continuity."}
            ],
            "Missing Clauses": ["Data Breach Notification", "Force Majeure Clause"]
        }
