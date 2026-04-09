import os
from dotenv import load_dotenv
load_dotenv()

from typing import List
from langchain_core.documents import Document
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import PromptTemplate
import json

class AuditService:
    def __init__(self):
        self.llm = ChatGoogleGenerativeAI(
            model="gemini-2.5-flash",
            google_api_key=os.getenv("GOOGLE_API_KEY"),
            temperature=0.2,
        )
        
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

    async def generate_analysis(self, chunks: List[Document]) -> dict:
        """
        Analyzes chunks using Gemini and returns a parsed JSON dictionary.
        """
        # Combine chunk content
        context_text = "\n\n".join([chunk.page_content for chunk in chunks])
        
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
                "Risks": [],
                "Missing Clauses": []
            }
