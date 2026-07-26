import re
from typing import List, Dict

class CodebaseCrawler:
    """
    Scans project workspace files to find actual function definitions, class declarations,
    decorator usages, and code snippets related to a target technical concept.
    """
    def __init__(self):
        # Exclude standard built-in or noise words
        self.stop_words = {"and", "the", "for", "with", "from", "import", "code", "data", "app", "api", "service", "system"}

    def extract_search_keywords(self, term: str) -> List[str]:
        """
        Derives relevant search keywords from the concept term.
        """
        keywords = set()
        clean_term = term.strip()
        
        # Add full term
        keywords.add(clean_term.lower())
        
        # Add sub-words if multi-word term
        words = [w.lower() for w in re.split(r"[-\s_]+", clean_term) if len(w) > 2 and w.lower() not in self.stop_words]
        for w in words:
            keywords.add(w)
            
        # Add camelCase / PascalCase variants if applicable (e.g. FastAPI -> fastapi, FastApi)
        no_spaces = clean_term.replace(" ", "")
        if len(no_spaces) > 2:
            keywords.add(no_spaces.lower())
            
        return list(keywords)

    def crawl_related_code_snippets(self, term: str, project_files: List[Dict[str, str]], max_snippets: int = 5) -> str:
        """
        Crawls project_files for functions, methods, classes, and code usage related to term.
        Returns a formatted markdown string of actual project code references.
        """
        if not project_files or not term:
            return "No codebase snippets available."

        keywords = self.extract_search_keywords(term)
        if not keywords:
            return "No valid search keywords extracted."

        matched_references = []

        for f in project_files:
            if len(matched_references) >= max_snippets:
                break

            path = f.get("path", "")
            content = f.get("content", "")
            if not content or any(p in path.lower() for p in [".obsidian", "node_modules", "venv", "__pycache__", ".git"]):
                continue

            lines = content.splitlines()
            path_lower = path.lower()

            matched_file_snippets = []

            for idx, line in enumerate(lines):
                line_str = line.strip()
                if not line_str or line_str.startswith("#") or line_str.startswith("//"):
                    continue

                line_lower = line_str.lower()
                # Check if line contains any keyword
                if any(kw in line_lower for kw in keywords):
                    # Capture surrounding lines context (1 line before, 3 lines after)
                    start_idx = max(0, idx - 1)
                    end_idx = min(len(lines), idx + 4)
                    snippet_block = "\n".join(lines[start_idx:end_idx]).strip()

                    # Truncate overly long snippet block
                    if len(snippet_block) > 350:
                        snippet_block = snippet_block[:350] + "\n..."

                    matched_file_snippets.append((idx + 1, line_str, snippet_block))
                    if len(matched_file_snippets) >= 2:
                        break

            if matched_file_snippets:
                snippet_text_parts = []
                for line_num, line_match, snippet_body in matched_file_snippets:
                    snippet_text_parts.append(
                        f"  - Line {line_num}: `{line_match}`\n"
                        f"    ```\n{snippet_body}\n    ```"
                    )
                
                formatted_ref = f"**File:** `{path}`\n" + "\n".join(snippet_text_parts)
                matched_references.append(formatted_ref)

        if not matched_references:
            return f"No direct function/code references found in codebase for '{term}'."

        return "\n\n".join(matched_references)
