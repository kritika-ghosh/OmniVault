import re
import json
from pathlib import Path
from typing import Set, Dict, List
from litellm import completion
from tree_sitter_languages import get_parser
from app.services.vector_store import VectorStoreService
from app.config import settings

class SmartGapDetector:
    def __init__(self):
        self.model = settings.DEFAULT_LLM_MODEL
        self.fallback_patterns = [
            re.compile(r"import\s+(?:.*\s+from\s+)?['\"]([^'\"]+)['\"]"),
            re.compile(r"from\s+([^\s.]+)(?:\.[^\s.]+)*\s+import")
        ]
        self.vector_store = VectorStoreService()
        self.term_sources = {}

    def analyze_project_concepts_with_llm(self, project_files: List[Dict[str, str]]) -> List[Dict]:
        """
        Uses LLM as a Principal AI Software Architect to perform deep conceptual gap scanning.
        Identifies high-level software engineering concepts, architectural paradigms, security patterns,
        and domain logic topics instead of raw package imports or dependency names.
        Prioritizes README.md to assess project depth & complexity.
        """
        # Separate README/documentation files to place at top of context
        readme_files = []
        other_files = []
        for f in project_files:
            path = f.get("path", "").lower()
            if "readme" in path or path.endswith(".md"):
                readme_files.append(f)
            else:
                other_files.append(f)

        ordered_files = readme_files + other_files

        # Prepare codebase summary for LLM context (up to 45 files with smarter previews)
        file_summaries = []
        for f in ordered_files[:45]:
            path = f.get("path", "")
            content = f.get("content", "")
            # Truncate content preview to capturing structural logic
            preview = content[:1200] if "readme" in path.lower() else (content[:650] + "\n..." if len(content) > 650 else content)
            file_summaries.append(f"File: {path}\nContent Preview:\n{preview}\n")
            
        codebase_text = "\n---\n".join(file_summaries)
        
        system_prompt = (
            "You are a Principal AI Software Architect & Curriculum Engineer.\n"
            "Your objective is to identify CANONICAL CONCEPTUAL KNOWLEDGE TOPICS in the codebase.\n\n"
            "PROJECT DEPTH & COMPLEXITY ASSESSMENT:\n"
            "- First, carefully evaluate the overall PROJECT ARCHITECTURAL DEPTH & DOMAIN COMPLEXITY from the README and codebase files (e.g. enterprise production service vs simple utility library).\n"
            "- Calibrate each topic's 'required_expertise' ('beginner', 'intermediate', 'advanced') and technical depth based on this project's evaluated complexity.\n\n"
            "CRITICAL CANONICAL TERM RULES FOR OBSIDIAN WIKILINKS [[Term]]:\n"
            "1. 'term' MUST be a CONCISE, CANONICAL WIKI-LINKABLE TITLE (1 to 3 words max, with proper capitalization, e.g. 'FastAPI', 'JWT Authentication', 'Vector Search', 'CORS').\n"
            "2. DO NOT create long multi-word sentence titles (e.g. DO NOT output 'Decoupled Multi-Agent Orchestration & Communication'). Keep titles short (1-3 words) so developers can easily link them using [[Term]] in Markdown notes.\n"
            "3. DO NOT output duplicate terms with different casing. Return each canonical term ONCE.\n"
            "4. DO NOT output low-level sub-dependency micro-packages (e.g. DO NOT output 'urllib3', 'certifi', 'six', 'zipp', 'idna', 'attrs', 'tqdm', etc.).\n"
            "5. 'aliases': provide 2-3 common synonyms or alternative wiki-link names (e.g. for \"CORS\", aliases: [\"Cross-Origin Resource Sharing\", \"CORS Middleware\"]).\n\n"
            "Return a JSON array of objects with keys:\n"
            "- \"term\": concise 1-3 word canonical wiki-link title (e.g. \"CORS\", \"JWT Authentication\", \"Vector Search\", \"FastAPI\")\n"
            "- \"aliases\": array of 2-3 alternative wiki-link synonyms (e.g. [\"Cross-Origin Resource Sharing\"])\n"
            "- \"classification\": category (\"architecture\", \"security\", \"algorithm\", \"framework\", \"database\", \"networking\")\n"
            "- \"required_expertise\": level (\"beginner\", \"intermediate\", \"advanced\")\n"
            "- \"reason\": 1-sentence technical justification considering the project's architecture\n\n"
            "Return ONLY a valid JSON array. No conversational text or markdown code fences outside JSON."
        )

        user_prompt = f"Codebase Context & Project Architecture:\n{codebase_text[:12000]}"

        try:
            response = completion(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ]
            )
            raw_text = response.choices[0].message.content.strip()
            # Clean JSON markdown fences if present
            if raw_text.startswith("```"):
                raw_text = re.sub(r"^```(?:json)?\n?", "", raw_text)
                raw_text = re.sub(r"\n?```$", "", raw_text)
            
            concepts = json.loads(raw_text)
            if isinstance(concepts, list) and len(concepts) > 0:
                # Case-insensitive deduplication of concepts returned by LLM
                deduped = []
                seen_keys = set()
                for c in concepts:
                    if isinstance(c, dict) and "term" in c and c["term"]:
                        key = c["term"].strip().lower()
                        if key not in seen_keys:
                            seen_keys.add(key)
                            deduped.append(c)
                return deduped
        except Exception as e:
            print(f"LLM concept analysis fallback: {e}")
            
        return []

    def evaluate_note_expertise_level(self, note_content: str, metadata: Dict) -> str:
        """
        Determines the current expertise level of a note based on depth, word count,
        frontmatter metadata, and code block complexity.
        Returns 'beginner', 'intermediate', or 'advanced'.
        """
        if not note_content or len(note_content.strip()) < 80:
            return "beginner"

        # Check frontmatter confidence level if available
        conf = metadata.get("confidence_level")
        if conf is not None:
            try:
                c_val = float(conf)
                if c_val >= 0.75:
                    return "advanced"
                elif c_val >= 0.45:
                    return "intermediate"
                else:
                    return "beginner"
            except (ValueError, TypeError):
                pass

        # Heuristic based on word count & code examples
        words = len(note_content.split())
        has_code_blocks = "```" in note_content
        has_subheadings = "##" in note_content

        if words > 250 and has_code_blocks and has_subheadings:
            return "advanced"
        elif words > 100 or has_code_blocks:
            return "intermediate"
        return "beginner"

    def compute_smart_gaps_with_llm(
        self, 
        project_files: List[Dict[str, str]], 
        existing_notes_meta: Dict[str, Dict], 
        notes_files: List[Dict[str, str]] = None,
        collection = None
    ) -> List[Dict]:
        """
        LLM-driven gap and expertise analysis:
        1. Uses LLM to extract required concepts and required expertise levels based on project depth.
        2. Compares concepts against user's notes vault.
        3. Evaluates current note expertise level vs required expertise level.
        4. Identifies critical missing gaps AND expertise/depth gaps (deduplicated by slug).
        """
        # 1. Attempt LLM concept extraction
        llm_concepts = self.analyze_project_concepts_with_llm(project_files)
        
        # Build map of note contents for quick lookup
        note_contents_map = {}
        if notes_files:
            for nf in notes_files:
                path = nf.get("path", "")
                stem = path.split("/")[-1].replace(".md", "").lower().strip()
                note_contents_map[stem] = nf.get("content", "")

        gap_report = []
        seen_slugs = set()

        if llm_concepts:
            for item in llm_concepts:
                term = item.get("term", "").strip()
                if not term:
                    continue

                term_slug = term.lower().replace(" ", "-").strip()
                term_clean = term.lower().strip()

                if term_clean in seen_slugs or term_slug in seen_slugs:
                    continue
                seen_slugs.add(term_clean)
                seen_slugs.add(term_slug)

                req_exp = item.get("required_expertise", "intermediate").lower()

                # Find matching note file metadata
                matching_slug = None
                for slug in existing_notes_meta.keys():
                    if slug == term_slug or slug == term_clean:
                        matching_slug = slug
                        break

                sources = list(self.term_sources.get(term, ["Project Analysis"]))

                if matching_slug:
                    meta = existing_notes_meta[matching_slug]
                    content = note_contents_map.get(matching_slug, "")
                    current_exp = self.evaluate_note_expertise_level(content, meta)

                    # Compare expertise levels: beginner < intermediate < advanced
                    exp_rank = {"beginner": 1, "intermediate": 2, "advanced": 3}
                    curr_rank = exp_rank.get(current_exp, 1)
                    req_rank = exp_rank.get(req_exp, 2)

                    if meta.get("is_empty", True) or meta.get("status") == "gap":
                        gap_report.append({
                            "term": term,
                            "classification": "knowledge_debt",
                            "expertise_level": current_exp,
                            "required_expertise": req_exp,
                            "reason": f"Note '{term}.md' exists as an empty placeholder. Project architecture requires '{req_exp}' expertise.",
                            "detected_from": sources
                        })
                    elif curr_rank < req_rank:
                        gap_report.append({
                            "term": term,
                            "classification": "expertise_gap",
                            "expertise_level": current_exp,
                            "required_expertise": req_exp,
                            "reason": f"Note '{term}.md' has '{current_exp}' depth, but project architecture requires '{req_exp}' expertise.",
                            "detected_from": sources
                        })
                else:
                    # Semantic search vector fallback check
                    is_covered = False
                    if collection is not None:
                        matches = self.vector_store.semantic_search_on_collection(collection, query=term, limit=1)
                        if matches and matches[0]["score"] <= 0.35:
                            is_covered = True

                    if not is_covered:
                        gap_report.append({
                            "term": term,
                            "classification": "critical_gap",
                            "expertise_level": "missing",
                            "required_expertise": req_exp,
                            "reason": item.get("reason", f"Project architecture requires '{req_exp}' expertise on {term}, but no note exists."),
                            "detected_from": sources
                        })

            if gap_report:
                return gap_report

        # 2. Fallback to AST/Regex term extraction if LLM is unconfigured or yields empty
        declared_deps = self.extract_dependencies_in_memory(project_files)
        code_imports = self.scan_workspace_codebase_in_memory(project_files)
        all_terms = declared_deps.union(code_imports)
        
        return self.compute_smart_gaps(all_terms, existing_notes_meta, collection)

    def _extract_ast_imports_js_ts(self, file_content: str, language: str) -> Set[str]:
        imports = set()
        try:
            parser = get_parser(language)
            tree = parser.parse(bytes(file_content, "utf8"))
            root_node = tree.root_node
            def traverse(node):
                if node.type == "import_statement" or node.type == "from_clause":
                    for child in node.children:
                        if child.type == "string":
                            text = child.text.decode("utf8").strip("'\"")
                            if text and not text.startswith("."):
                                imports.add(text.split("/")[0])
                for child in node.children:
                    traverse(child)
            traverse(root_node)
        except Exception:
            pass
        return imports

    def _extract_ast_imports_python(self, file_content: str) -> Set[str]:
        imports = set()
        try:
            import ast
            tree = ast.parse(file_content)
            for node in ast.walk(tree):
                if isinstance(node, ast.Import):
                    for alias in node.names:
                        imports.add(alias.name.split('.')[0].lower())
                elif isinstance(node, ast.ImportFrom):
                    if node.module and node.level == 0:
                        imports.add(node.module.split('.')[0].lower())
        except Exception:
            pass
        return imports

    def extract_dependencies(self, project_path: Path) -> Set[str]:
        detected_terms = set()
        package_json = project_path / "package.json"
        if package_json.exists():
            try:
                with open(package_json, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    deps = {**data.get("dependencies", {}), **data.get("devDependencies", {})}
                    for d in deps.keys():
                        term = d.lower()
                        detected_terms.add(term)
                        self.term_sources.setdefault(term, set()).add("package.json")
            except Exception: pass
            
        requirements = project_path / "requirements.txt"
        if requirements.exists():
            try:
                with open(requirements, 'r', encoding='utf-8') as f:
                    for line in f:
                        line = line.strip()
                        if line and not line.startswith('#'):
                            pkg = re.split(r'==|>=|<=|>|<|~=', line)[0].strip()
                            if pkg:
                                term = pkg.lower()
                                detected_terms.add(term)
                                self.term_sources.setdefault(term, set()).add("requirements.txt")
            except Exception: pass
        return detected_terms

    def scan_workspace_codebase(self, project_path: Path) -> Set[str]:
        imported_terms = set()
        for file_path in project_path.rglob("*"):
            if any(p in file_path.parts for p in [".obsidian", "node_modules", "venv", ".git", "__pycache__"]):
                continue
            if not file_path.is_file():
                continue
            try:
                content = file_path.read_text(encoding="utf-8", errors="ignore")
                ext = file_path.suffix
                rel_path = str(file_path.relative_to(project_path))
                terms = set()
                if ext == ".py":
                    terms = self._extract_ast_imports_python(content)
                elif ext in [".js", ".jsx"]:
                    terms = self._extract_ast_imports_js_ts(content, "javascript")
                elif ext in [".ts", ".tsx"]:
                    terms = self._extract_ast_imports_js_ts(content, "typescript")
                elif ext in [".html", ".css", ".md"]:
                    continue
                else:
                    for line in content.splitlines():
                        for pattern in self.fallback_patterns:
                            match = pattern.search(line)
                            if match:
                                term = match.group(1).split('/')[0] if '/' in match.group(1) else match.group(1)
                                if term and not term.startswith('.'):
                                    terms.add(term.strip().lower())
                for t in terms:
                    imported_terms.add(t)
                    self.term_sources.setdefault(t, set()).add(rel_path)
            except Exception:
                pass
        return imported_terms

    def extract_dependencies_in_memory(self, project_files: List[Dict[str, str]]) -> Set[str]:
        detected_terms = set()
        for f in project_files:
            filename = f.get("path", "").lower()
            content = f.get("content", "")
            if filename.endswith("package.json"):
                try:
                    data = json.loads(content)
                    deps = {**data.get("dependencies", {}), **data.get("devDependencies", {})}
                    for d in deps.keys():
                        term = d.lower()
                        detected_terms.add(term)
                        self.term_sources.setdefault(term, set()).add("package.json")
                except Exception: pass
            elif filename.endswith("requirements.txt"):
                try:
                    for line in content.splitlines():
                        line = line.strip()
                        if line and not line.startswith('#'):
                            pkg = re.split(r'==|>=|<=|>|<|~=', line)[0].strip()
                            if pkg:
                                term = pkg.lower()
                                detected_terms.add(term)
                                self.term_sources.setdefault(term, set()).add("requirements.txt")
                except Exception: pass
        return detected_terms

    def scan_workspace_codebase_in_memory(self, project_files: List[Dict[str, str]]) -> Set[str]:
        imported_terms = set()
        for f in project_files:
            rel_path = f.get("path", "")
            content = f.get("content", "")
            parts = rel_path.replace("\\", "/").split("/")
            if any(p in parts for p in [".obsidian", "node_modules", "venv", ".git", "__pycache__"]):
                continue
            ext = "." + rel_path.split(".")[-1] if "." in rel_path else ""
            try:
                terms = set()
                if ext == ".py":
                    terms = self._extract_ast_imports_python(content)
                elif ext in [".js", ".jsx"]:
                    terms = self._extract_ast_imports_js_ts(content, "javascript")
                elif ext in [".ts", ".tsx"]:
                    terms = self._extract_ast_imports_js_ts(content, "typescript")
                elif ext in [".html", ".css", ".md"]:
                    continue
                else:
                    for line in content.splitlines():
                        for pattern in self.fallback_patterns:
                            match = pattern.search(line)
                            if match:
                                term = match.group(1).split('/')[0] if '/' in match.group(1) else match.group(1)
                                if term and not term.startswith('.'):
                                    terms.add(term.strip().lower())
                for t in terms:
                    imported_terms.add(t)
                    self.term_sources.setdefault(t, set()).add(rel_path)
            except Exception:
                pass
        return imported_terms

    def compute_smart_gaps(self, technical_terms: Set[str], existing_notes_meta: Dict[str, Dict], collection = None) -> List[Dict]:
        gap_report = []
        seen_slugs = set()
        for term in technical_terms:
            term_clean = term.lower().strip()
            if term_clean in seen_slugs:
                continue
            seen_slugs.add(term_clean)

            sources = list(self.term_sources.get(term, []))
            if term in existing_notes_meta or term_clean in existing_notes_meta:
                meta = existing_notes_meta.get(term) or existing_notes_meta.get(term_clean)
                if meta.get("is_empty", True) or meta.get("status") == "gap":
                    gap_report.append({
                        "term": term,
                        "classification": "knowledge_debt",
                        "expertise_level": "beginner",
                        "required_expertise": "intermediate",
                        "reason": f"Note file '{term}.md' exists but lacks clear conceptual content body definitions.",
                        "detected_from": sources
                    })
                continue
            if collection is not None:
                semantic_matches = self.vector_store.semantic_search_on_collection(collection, query=term, limit=1)
            else:
                semantic_matches = self.vector_store.semantic_search(query=term, limit=1)
            
            is_covered_semantically = False
            if semantic_matches:
                best_match = semantic_matches[0]
                if best_match["score"] <= 0.35:  
                    is_covered_semantically = True
                    
            if not is_covered_semantically:
                gap_report.append({
                    "term": term,
                    "classification": "critical_gap", 
                    "expertise_level": "missing",
                    "required_expertise": "intermediate",
                    "reason": "This module is executed dynamically within your repository code, but has no semantic documentation trace.",
                    "detected_from": sources
                })
        return gap_report