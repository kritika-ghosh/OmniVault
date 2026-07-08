import json
import httpx
from bs4 import BeautifulSoup
from litellm import completion
from typing import AsyncGenerator, List
from app.config import settings

class ContentSynthesizer:
    def __init__(self):
        # Defaulting to local Ollama (privacy mode) or fallback configurations
        self.model = settings.DEFAULT_LLM_MODEL
        
    async def fetch_web_context(self, term: str) -> str:
        """
        Queries DuckDuckGo's HTML search or instant API to capture clean 
        documentation context without requiring external paid API keys.
        """
        url = f"https://api.duckduckgo.com/?q={term}&format=json&no_html=1"
        try:
            async with httpx.AsyncClient(timeout=6.0) as client:
                response = await client.get(url)
                if response.status_code == 200:
                    data = response.json()
                    abstract = data.get("AbstractText", "")
                    if abstract:
                        return f"Authoritative Reference for {term}: {abstract}"
        except Exception:
            pass
        return "No explicit web reference scraped. Relying on default LLM documentation parameters."

    async def generate_note_stream(self, term: str, project_context: str) -> AsyncGenerator[str, None]:
        """
        Orchestrates background reference scraping, applies the target PRD template, 
        and streams markdown content chunk-by-chunk over an SSE connection.
        """
        # Fetch grounding info
        web_reference = await self.fetch_web_context(term)
        
        # System instructions matching Appendix A specifications
        system_prompt = (
            "You are an expert technical writer creating a highly structured, self-contained "
            f"Markdown guide on '{term}' for an intermediate developer[cite: 324].\n"
            "You must follow this exact structural template layout[cite: 326]:\n"
            "1. YAML Frontmatter block containing title, tags, status: draft, and created date[cite: 326].\n"
            "2. # Concept Name\n"
            "3. ## Overview [cite: 326]\n"
            "4. ## Core Syntax / API [cite: 326]\n"
            "5. ## Common Pitfalls [cite: 326]\n"
            "6. ## Related Concepts [cite: 326]\n"
            "Rules: Output pure Markdown only. Do not wrap the whole response in a code block. "
            "Never hallucinate or invent unverified syntax parameters[cite: 327]."
        )
        
        user_prompt = (
            f"Target Concept: {term}\n"
            f"Associated Environment Technologies: {project_context} [cite: 325]\n"
            f"Scraped Technical Reference: {web_reference} [cite: 329]\n\n"
            "Synthesize and stream the finalized document now."
        )

        try:
            # LiteLLM streaming connection gateway
            response = completion(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                stream=True
            )
            
            for chunk in response:
                token = chunk.choices[0].delta.content
                if token:
                    yield token
        except Exception as e:
            yield f"\n\n[Synthesis Stream Interrupted]: {str(e)}"