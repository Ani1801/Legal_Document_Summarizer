"""
Compliance Service — Agentic Compliance Checker with Gemini.

Checks document chunks against global regulations (GDPR, CCPA, 2026 AI Act)
and generates specific redline suggestions for compliance remediation.
"""

import os
import json
import asyncio
from dotenv import load_dotenv
load_dotenv()

from typing import List, Dict, Any
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import PromptTemplate

GEMINI_MODELS = ["gemini-2.0-flash", "gemini-1.5-flash"]
MAX_RETRIES = 2
RETRY_DELAY = 2


COMPLIANCE_PROMPT = PromptTemplate(
    input_variables=["context", "regulations"],
    template="""You are an expert legal compliance auditor. Analyze the following document excerpts for compliance violations against these regulations: {regulations}.

DOCUMENT EXCERPTS:
{context}

---

REGULATION KNOWLEDGE BASE:
- **GDPR** (EU General Data Protection Regulation): Covers data subject consent (Art. 6-7), right to erasure (Art. 17), data portability (Art. 20), breach notification (Art. 33-34), DPO requirements (Art. 37), cross-border transfers (Art. 44-49).
- **CCPA** (California Consumer Privacy Act): Covers right to know (§1798.100), right to delete (§1798.105), right to opt-out of sale (§1798.120), non-discrimination (§1798.125), service provider obligations.
- **AI_ACT** (EU AI Act 2026): Covers high-risk AI system requirements, transparency obligations, human oversight mandates, prohibited AI practices, conformity assessments, and AI-generated content disclosure.

INSTRUCTIONS:
1. Check each clause/section against the specified regulations.
2. Identify specific violations with the EXACT text that is problematic.
3. For each violation, provide a concrete redline suggestion (the exact edit needed).
4. Generate a prioritized list of action items.
5. Calculate a compliance score (0-100, where 100 = fully compliant).

Respond ONLY in valid JSON:
{{
    "compliance_score": 75,
    "summary": "Brief 2-sentence compliance overview.",
    "violations": [
        {{
            "regulation": "GDPR",
            "clause": "Section or clause reference in the document",
            "severity": "High",
            "description": "What exactly violates the regulation",
            "suggestion": "Specific redline edit: Replace 'X' with 'Y' to comply with...",
            "article_reference": "GDPR Art. 17"
        }}
    ],
    "action_items": [
        "1. [HIGH] Add explicit data deletion clause per GDPR Art. 17",
        "2. [MEDIUM] Include opt-out mechanism per CCPA §1798.120"
    ]
}}
"""
)


class ComplianceService:
    def __init__(self):
        self.api_key = os.getenv("GOOGLE_API_KEY")

    def _get_llm(self, model_name: str) -> ChatGoogleGenerativeAI:
        return ChatGoogleGenerativeAI(
            model=model_name,
            google_api_key=self.api_key,
            temperature=0.1,  # Low temp for precise compliance analysis
        )

    async def check_compliance(
        self,
        chunks: List[Dict[str, Any]],
        regulations: List[str] = None
    ) -> dict:
        """
        Checks document chunks against specified regulations.
        Returns violations, action items, and compliance score.
        """
        if regulations is None:
            regulations = ["GDPR", "CCPA", "AI_ACT"]

        context_text = "\n\n".join([
            f"[Page {c.get('page_number', '?')}] {c.get('text', '')}"
            for c in chunks
        ])

        regulations_str = ", ".join(regulations)

        formatted_prompt = COMPLIANCE_PROMPT.format(
            context=context_text,
            regulations=regulations_str
        )

        last_error = None
        for model_name in GEMINI_MODELS:
            for attempt in range(MAX_RETRIES):
                try:
                    llm = self._get_llm(model_name)
                    response = await llm.ainvoke(formatted_prompt)
                    content = response.content

                    # Clean markdown
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
                        print(f"[ComplianceService] JSON parse failed. Raw:", content[:200])
                        return {
                            "compliance_score": 0,
                            "summary": "Failed to parse compliance analysis.",
                            "violations": [],
                            "action_items": []
                        }

                except Exception as e:
                    last_error = e
                    error_str = str(e).lower()
                    is_retryable = any(code in error_str for code in ["503", "429", "unavailable", "overloaded", "quota"])
                    if is_retryable:
                        print(f"[ComplianceService] {model_name} attempt {attempt + 1} failed: {e}")
                        if attempt < MAX_RETRIES - 1:
                            await asyncio.sleep(RETRY_DELAY)
                        continue
                    else:
                        raise e

        raise Exception(f"All Gemini models failed for compliance check. Last error: {last_error}")
