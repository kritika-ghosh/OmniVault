import json
import httpx
import re
import ast
from litellm import completion
from typing import AsyncGenerator, List, Dict
from app.config import settings

class ContentSynthesizer:
    def __init__(self):
        self.model = settings.DEFAULT_LLM_MODEL
        
    def formulate_query(self, term: str, project_context: str) -> str:
        """
        Formulates search queries using the tech stack and term context.
        """
        try:
            response = completion(
                model=self.model,
                messages=[
                    {"role": "user", "content": f"Given a tech term '{term}' used in a project with tech stack '{project_context}', generate a single, highly effective search query to find official documentation, core syntax, or best practices. Reply with ONLY the query text, no quotes, no conversational filler."}
                ]
            )
            query = response.choices[0].message.content.strip().strip("'\"")
            return query if query else f"{term} documentation syntax"
        except Exception:
            return f"{term} documentation syntax"

    async def fetch_web_context(self, query: str) -> str:
        """
        Queries DuckDuckGo's API to capture clean documentation context.
        """
        url = f"https://api.duckduckgo.com/?q={query}&format=json&no_html=1"
        try:
            async with httpx.AsyncClient(timeout=6.0) as client:
                response = await client.get(url)
                if response.status_code == 200:
                    data = response.json()
                    abstract = data.get("AbstractText", "")
                    if abstract:
                        return f"Authoritative Reference for {query}: {abstract}"
        except Exception:
            pass
        return "No explicit web reference scraped. Relying on default LLM documentation parameters."

    def validate_code_blocks(self, markdown_text: str) -> List[Dict]:
        """
        Parses code blocks in synthesized markdown and validates Python AST/JS syntax.
        """
        warnings = []
        # Find code blocks like ```python ... ``` or ```javascript ... ```
        pattern = re.compile(r"```(python|py|javascript|js|typescript|ts)\n(.*?)\n```", re.DOTALL)
        matches = pattern.findall(markdown_text)
        
        for lang, code in matches:
            code = code.strip()
            if lang in ["python", "py"]:
                try:
                    ast.parse(code)
                except SyntaxError as e:
                    warnings.append({
                        "language": lang,
                        "error": f"Python SyntaxError: {e.msg} at line {e.lineno}",
                        "snippet": code[:100] + "..." if len(code) > 100 else code
                    })
            elif lang in ["javascript", "js", "typescript", "ts"]:
                # Basic brackets and brace balancing verification
                brackets = {'(': ')', '[': ']', '{': '}'}
                stack = []
                is_balanced = True
                for char in code:
                    if char in brackets.keys():
                        stack.append(char)
                    elif char in brackets.values():
                        if not stack or brackets[stack.pop()] != char:
                            is_balanced = False
                            break
                if not is_balanced:
                    warnings.append({
                        "language": lang,
                        "error": "JavaScript/TypeScript syntax balance warning (mismatched brackets or braces).",
                        "snippet": code[:100] + "..." if len(code) > 100 else code
                    })
        return warnings

    async def generate_note_stream(self, term: str, project_context: str) -> AsyncGenerator[str, None]:
        """
        Orchestrates background reference scraping, applies the target template with Wikipedia & Wiki links,
        streams markdown content chunk-by-chunk, and appends code validation reports.
        """
        # Formulate query
        search_query = self.formulate_query(term, project_context)
        
        # Fetch grounding info
        web_reference = await self.fetch_web_context(search_query)

        # Build clean Wikipedia reference URL slug
        wiki_slug = re.sub(r"[^\w\s-]", "", term).strip().replace(" ", "_")
        wiki_url = f"https://en.wikipedia.org/wiki/{wiki_slug}"
        
        system_prompt = (
            "You are an expert technical writer creating a highly structured, self-contained "
            f"Markdown guide on '{term}' for a developer.\n\n"
            "MANDATORY STRUCTURAL TEMPLATE:\n"
            "1. YAML Frontmatter block containing title, tags, status: draft, confidence_level: 0.5, created, and updated dates.\n"
            f"2. # {term}\n"
            "3. ## Overview & Architectural Role\n"
            "4. ## Core Syntax & Implementation Patterns\n"
            "5. ## Common Pitfalls & Edge Cases\n"
            "6. ## Related Concepts\n"
            "7. ## External References & Wiki Links\n\n"
            "CRITICAL WIKIPEDIA & REFERENCE LINK RULES:\n"
            "- Throughout the body text, embed inline Markdown links to Wikipedia and official documentation for key technical terms (e.g. `[Wikipedia Overview](https://en.wikipedia.org/wiki/...)` and `[[Obsidian-Style-Wiki-Link]]`).\n"
            f"- Under `## External References & Wiki Links`, you MUST list at least 3-4 authoritative reference links, including `[{term} on Wikipedia]({wiki_url})` and official documentation links (e.g. MDN, Python Docs, FastAPI Docs, React Docs, etc.).\n"
            "- Output pure Markdown only. Do not wrap the whole document in top-level backticks."
        )
        
        user_prompt = (
            f"Target Concept: {term}\n"
            f"Associated Tech Environment: {project_context}\n"
            f"Scraped Technical Summary: {web_reference}\n"
            f"Wikipedia Target Slug: {wiki_url}\n\n"
            "Synthesize and stream the complete document now with Wikipedia and Wiki links."
        )

        full_content = ""
        try:
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
                    full_content += token
                    yield token
        except Exception as e:
            err_msg = f"\n\n[Synthesis Stream Interrupted]: {str(e)}"
            full_content += err_msg
            yield err_msg
            return

        # Ensure Wiki Links section exists if omitted
        if "## External References" not in full_content and "Wikipedia" not in full_content:
            wiki_appendix = (
                "\n\n---\n\n## External References & Wiki Links\n"
                f"- 🌐 [{term} - Wikipedia Article]({wiki_url})\n"
                f"- 📚 [{term} Official Documentation Search](https://devdocs.io/#q={wiki_slug})\n"
            )
            yield wiki_appendix

        # Perform code block validation at the end of synthesis
        try:
            warnings = self.validate_code_blocks(full_content)
            if warnings:
                yield "\n\n---\n\n### ⚠️ Code Syntax Validation Warnings\n"
                for w in warnings:
                    yield f"- **{w['language'].upper()}** snippet has warnings: {w['error']}\n"
        except Exception:
            pass