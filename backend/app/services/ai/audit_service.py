import os
from typing import List
from langchain_core.documents import Document
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import PromptTemplate
import json

class AuditService:
    def __init__(self):
        # Use Google_API_KEY or GOOGLE_API_KEY from environment variables
        google_api_key = os.getenv("Google_API_KEY") or os.getenv("GOOGLE_API_KEY")
        self.llm = ChatGoogleGenerativeAI(
            model="gemini-1.5-flash",
            google_api_key=google_api_key,
            temperature=0.2,
        )
        
        self.prompt = PromptTemplate(
            input_variables=["context"],
            template="""Analyze these legal document chunks for risks, missing clauses, and a general summary. Return the response as a structured JSON object with categories: Summary, Critical Risks, and Suggestions.

Extracted Text:
{context}

Respond ONLY in valid JSON format matching the structure below:
{{
    "Summary": "A general summary of the contract.",
    "Critical Risks": [
        {{
            "title": "Risk Title",
            "description": "Why this is a risk based exactly on the provided text."
        }}
    ],
    "Suggestions": [
        "Suggestion on missing clauses or improvements"
    ]
}}
"""
        )

    async def generate_audit_report(self, context_chunks: List[Document]) -> dict:
        """
        Analyzes chunks using Gemini and returns a parsed JSON dictionary.
        """
        # Combine chunk content
        context_text = "\n\n".join([chunk.page_content for chunk in context_chunks])
        
        formatted_prompt = self.prompt.format(context=context_text)
        
        response = await self.llm.ainvoke(formatted_prompt)
        content = response.content
        
        # Clean up Markdown JSON blocks if model includes them
        if content.startswith("```json"):
            content = content.replace("```json", "", 1)
            content = content.replace("```", "")
        
        try:
            return json.loads(content.strip())
        except json.JSONDecodeError:
            print("Failed to parse JSON. Raw content:", content)
            # Fallback handling
            return {
                "Summary": "Failed to parse AI response into JSON.",
                "Critical Risks": [],
                "Suggestions": []
            }
