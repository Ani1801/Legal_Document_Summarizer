"""
Compare Service — Multi-Document Comparison with Gemini.

Takes chunks from two documents, sends them to Gemini with a structured
comparison prompt, and returns a detailed difference analysis with
risk shift scoring.
"""

import os
import json
import asyncio
from dotenv import load_dotenv
load_dotenv()

from typing import List, Dict, Any
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import PromptTemplate

# Fallback chain
# Fallback chain: try each model in order
GEMINI_MODELS = ["gemini-2.0-flash", "gemini-2.0-flash-lite", "gemini-2.5-flash"]
MAX_RETRIES = 2
RETRY_DELAY = 2


COMPARE_PROMPT = PromptTemplate(
    input_variables=["doc_a_name", "doc_b_name", "doc_a_context", "doc_b_context"],
    template="""You are a senior legal analyst comparing two documents. Analyze the following excerpts from Document A ("{doc_a_name}") and Document B ("{doc_b_name}").

DOCUMENT A EXCERPTS:
{doc_a_context}

---

DOCUMENT B EXCERPTS:
{doc_b_context}

---

INSTRUCTIONS:
1. Identify clauses that exist in both documents and note key DIFFERENCES.
2. Identify clauses or protections that are MISSING in one document but present in the other.
3. Provide a "Risk Shift Score" from -100 to +100:
   - Negative = Document B is MORE risky than Document A
   - Zero = Similar risk levels
   - Positive = Document B is LESS risky (improved protections)
4. Write a brief natural-language summary of the key differences.

Respond ONLY in valid JSON format:
{{
    "difference_summary": "A 2-3 sentence summary of the key differences between the documents.",
    "risk_shift_score": 0,
    "clauses": [
        {{
            "topic": "Clause Topic Name",
            "doc_a_text": "Brief relevant text from Doc A",
            "doc_b_text": "Brief relevant text from Doc B",
            "status": "matched|modified|missing_in_a|missing_in_b",
            "risk_note": "What this difference means for legal risk"
        }}
    ],
    "missing_in_a": ["Protection/clause missing in Document A"],
    "missing_in_b": ["Protection/clause missing in Document B"]
}}
"""
)


class CompareService:
    def __init__(self):
        self.api_key = os.getenv("GOOGLE_API_KEY")

    def _get_llm(self, model_name: str) -> ChatGoogleGenerativeAI:
        return ChatGoogleGenerativeAI(
            model=model_name,
            google_api_key=self.api_key,
            temperature=0.2,
        )

    async def compare_documents(
        self,
        doc_a_chunks: List[Dict[str, Any]],
        doc_b_chunks: List[Dict[str, Any]],
        doc_a_name: str = "Document A",
        doc_b_name: str = "Document B"
    ) -> dict:
        """
        Compares two sets of document chunks using Gemini.
        Returns structured comparison results.
        """
        # Build context strings
        doc_a_context = "\n\n".join([
            f"[Page {c.get('page_number', '?')}] {c.get('text', '')}"
            for c in doc_a_chunks
        ])
        doc_b_context = "\n\n".join([
            f"[Page {c.get('page_number', '?')}] {c.get('text', '')}"
            for c in doc_b_chunks
        ])

        formatted_prompt = COMPARE_PROMPT.format(
            doc_a_name=doc_a_name,
            doc_b_name=doc_b_name,
            doc_a_context=doc_a_context,
            doc_b_context=doc_b_context
        )

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
                        print(f"[CompareService] Failed to parse JSON. Raw:", content[:200])
                        return {
                            "difference_summary": "Failed to parse AI comparison response.",
                            "risk_shift_score": 0,
                            "clauses": [],
                            "missing_in_a": [],
                            "missing_in_b": []
                        }

                except Exception as e:
                    last_error = e
                    error_str = str(e).lower()
                    is_retryable = any(code in error_str for code in ["503", "429", "unavailable", "overloaded", "quota"])
                    if is_retryable:
                        print(f"[CompareService] {model_name} attempt {attempt + 1} failed: {e}")
                        if attempt < MAX_RETRIES - 1:
                            await asyncio.sleep(RETRY_DELAY)
                        continue
                    else:
                        raise e

            print(f"[CompareService] All retries exhausted for {model_name}")

        raise Exception(f"All Gemini models failed for comparison. Last error: {last_error}")
