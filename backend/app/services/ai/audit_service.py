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
GEMINI_MODELS = ["gemini-2.0-flash", "gemini-2.0-flash-lite", "gemini-2.5-flash"]
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
        Analyzes document chunks using Gemini and returns structured JSON.
        Falls back through multiple models on API errors.
        """
        context = "\n\n".join([c.page_content for c in chunks])
        formatted_prompt = self.prompt.format(context=context)

        last_error = None

        for model_name in GEMINI_MODELS:
            for attempt in range(MAX_RETRIES):
                try:
                    llm = self._get_llm(model_name)
                    response = await llm.ainvoke(formatted_prompt)
                    content = response.content

                    # Clean markdown code blocks
                    if "```json" in content:
                        content = content.replace("```json", "", 1)
                        content = content.replace("```", "")
                    if not content.strip().startswith("{"):
                        start = content.find("{")
                        end = content.rfind("}") + 1
                        if start != -1 and end > start:
                            content = content[start:end]

                    try:
                        return json.loads(content.strip())
                    except json.JSONDecodeError:
                        print(f"[AuditService] Failed to parse JSON. Raw:", content[:200])
                        return {
                            "Summary": "AI analysis completed but response format was unexpected.",
                            "Risks": [],
                            "Missing Clauses": []
                        }

                except Exception as e:
                    last_error = e
                    error_str = str(e).lower()
                    is_retryable = any(code in error_str for code in ["503", "429", "unavailable", "overloaded", "quota"])
                    if is_retryable:
                        print(f"[AuditService] {model_name} attempt {attempt + 1} failed: {e}")
                        if attempt < MAX_RETRIES - 1:
                            await asyncio.sleep(RETRY_DELAY)
                        continue
                    else:
                        raise e

            print(f"[AuditService] All retries exhausted for {model_name}")

        raise Exception(f"All Gemini models failed for analysis. Last error: {last_error}")
