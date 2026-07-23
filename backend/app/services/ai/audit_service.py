"""
Audit Service — Structured Legal Risk Analysis with Gemini.

Takes PDF chunks, sends them to Gemini with a structured prompt,
and returns a JSON report with: Summary, Risks, and Missing Clauses.
Includes automatic model fallback on 503/429 quota errors.
"""

import os
import json
import asyncio
from typing import List
from dotenv import load_dotenv
load_dotenv()

from langchain_core.documents import Document
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import PromptTemplate

# Fallback chain: try each model in order
GEMINI_MODELS = ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-pro"]
MAX_RETRIES = 2
RETRY_DELAY = 3  # seconds


AUDIT_PROMPT = PromptTemplate(
    input_variables=["context"],
    template="""You are an expert legal analyst. Analyze the following excerpts from a legal document and produce a structured risk assessment.

DOCUMENT EXCERPTS:
{context}

---

INSTRUCTIONS:
1. Write a comprehensive 3-5 sentence summary of the document's purpose, key obligations, and overall risk profile.
2. Identify and list the TOP risks, ambiguities, or unfavorable clauses. For each risk, provide a concise title and a clear 1-2 sentence description of why it is a risk and its potential impact. Determine whether each risk is "High", "Medium", or "Low" severity.
3. Identify any standard legal clauses or protections that appear to be MISSING from this document (e.g., limitation of liability, indemnification, dispute resolution, governing law, data privacy terms).

Respond ONLY in valid JSON format with this exact structure:
{{
    "Summary": "A 3-5 sentence summary of the document here.",
    "Risks": [
        {{
            "title": "Risk Title",
            "severity": "High",
            "description": "Clear description of what this risk means and its potential impact."
        }}
    ],
    "Missing Clauses": [
        "Name of missing clause or protection"
    ]
}}
"""
)


class AuditService:
    def __init__(self):
        self.api_key = os.getenv("GOOGLE_API_KEY")

    def _get_llm(self, model_name: str) -> ChatGoogleGenerativeAI:
        return ChatGoogleGenerativeAI(
            model=model_name,
            google_api_key=self.api_key,
            temperature=0.2,
        )

    async def generate_analysis(self, chunks: List[Document]) -> dict:
        """
        Generates a structured risk analysis from document chunks using Gemini.
        Returns a dict with 'Summary', 'Risks', and 'Missing Clauses'.
        """
        if not chunks:
            return {
                "Summary": "No content could be extracted from this document.",
                "Risks": [],
                "Missing Clauses": []
            }

        # Build context string from chunks
        context_parts = []
        for i, chunk in enumerate(chunks, 1):
            page = chunk.metadata.get("page_number", "?")
            context_parts.append(f"[Excerpt {i} — Page {page}]\n{chunk.page_content}")

        context_text = "\n\n---\n\n".join(context_parts)

        formatted_prompt = AUDIT_PROMPT.format(context=context_text)

        last_error = None

        for model_name in GEMINI_MODELS:
            for attempt in range(MAX_RETRIES):
                try:
                    print(f"[AuditService] Trying model: {model_name}, attempt {attempt + 1}")
                    llm = self._get_llm(model_name)
                    response = await llm.ainvoke(formatted_prompt)
                    content = response.content

                    # Strip markdown code fences if present
                    if "```json" in content:
                        content = content.replace("```json", "", 1)
                        content = content.replace("```", "")
                    elif "```" in content:
                        content = content.replace("```", "")

                    # Find the JSON object boundaries
                    if not content.strip().startswith("{"):
                        start = content.find("{")
                        end = content.rfind("}") + 1
                        if start != -1 and end > start:
                            content = content[start:end]

                    try:
                        result = json.loads(content.strip())
                        print(f"[AuditService] ✅ Successfully generated analysis with {model_name}")
                        return result
                    except json.JSONDecodeError as je:
                        print(f"[AuditService] JSON parse failed: {je}. Raw:\n{content[:300]}")
                        # Return a graceful fallback instead of crashing
                        return {
                            "Summary": "Analysis generated but could not be fully parsed. The document has been processed.",
                            "Risks": [],
                            "Missing Clauses": []
                        }

                except Exception as e:
                    last_error = e
                    error_str = str(e).lower()
                    is_retryable = any(
                        code in error_str
                        for code in ["503", "429", "unavailable", "overloaded", "quota", "rate"]
                    )

                    if is_retryable:
                        print(f"[AuditService] {model_name} attempt {attempt + 1} failed (retryable): {e}")
                        if attempt < MAX_RETRIES - 1:
                            await asyncio.sleep(RETRY_DELAY)
                        continue
                    else:
                        print(f"[AuditService] {model_name} failed (non-retryable): {e}")
                        raise e

            print(f"[AuditService] All retries exhausted for {model_name}, trying next model...")

        raise Exception(f"All Gemini models failed for audit analysis. Last error: {last_error}")
