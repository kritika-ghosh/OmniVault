import re
import json
from pathlib import Path
from typing import Set, Dict, List
from tree_sitter_languages import get_parser
from app.services.vector_store import VectorStoreService

class SmartGapDetector:
    def __init__(self):
        # Keep regex as a fast initial fallback strategy
        self.fallback_patterns = [
            re.compile(r"import\s+(?:.*\s+from\s+)?['\"]([^'\"]+)['\"]"),
            re.compile(r"from\s+([^\s.]+)(?:\.[^\s.]+)*\s+import")
        ]
        # Core vector store service for semantic similarity checks
        self.vector_store = VectorStoreService()
        # Track where terms were detected
        self.term_sources = {}

    def _extract_ast_imports_js_ts(self, file_content: str, language: str) -> Set[str]:
        """
        Parses JavaScript/TypeScript files into an Abstract Syntax Tree (AST) 
        and extracts authenticated top-level modules from import declarations.
        """
        imports = set()
        try:
            parser = get_parser(language)
            tree = parser.parse(bytes(file_content, "utf8"))
            root_node = tree.root_node
            
            # Query to target exact import declaration syntax nodes
            query_string = "(import_statement source: (string) @import_src)" if language == "javascript" else """
                (import_statement source: (string) @import_src)
                (import_alias_declaration) @alias
            """
            # Utilizing simple AST node traversal for safety across versions
            def traverse(node):
                if node.type == "import_statement" or node.type == "from_clause":
                    # Look for string literals containing paths/modules
                    for child in node.children:
                        if child.type == "string":
                            text = child.text.decode("utf8").strip("'\"")
                            # Filter local relative imports (e.g., ./components)
                            if text and not text.startswith("."):
                                imports.add(text.split("/")[0])
                for child in node.children:
                    traverse(child)
                    
            traverse(root_node)
        except Exception:
            pass
        return imports

    def _extract_ast_imports_python(self, file_content: str) -> Set[str]:
        """
        Compiles Python modules into standard AST syntax graphs to capture definitions.
        """
        imports = set()
        try:
            import ast
            tree = ast.parse(file_content)
            for node in ast.walk(tree):
                if isinstance(node, ast.Import):
                    for alias in node.names:
                        imports.add(alias.name.split('.')[0].lower())
                elif isinstance(node, ast.ImportFrom):
                    if node.module and node.level == 0: # 0 means absolute import
                        imports.add(node.module.split('.')[0].lower())
        except Exception:
            pass
        return imports

    def extract_dependencies(self, project_path: Path) -> Set[str]:
        """
        Extracts declared requirements from configuration files.
        """
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
        """
        Intelligently routes files to specific AST parsers or regex fallbacks.
        """
        imported_terms = set()
        
        for file_path in project_path.rglob("*"):
            if any(p in file_path.parts for p in ["node_modules", "venv", ".git", "__pycache__"]):
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
        """
        Extracts declared requirements from configuration files in memory.
        """
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
        """
        Extracts import statements from project files in memory.
        """
        imported_terms = set()
        for f in project_files:
            rel_path = f.get("path", "")
            content = f.get("content", "")
            
            parts = rel_path.replace("\\", "/").split("/")
            if any(p in parts for p in ["node_modules", "venv", ".git", "__pycache__"]):
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
        """
        Cross-references terms with defensive vector checks. Even if an explicit 
        note file doesn't match the term name, a semantic vector check verifies 
        if the concept is safely explained inside an alternative note.
        """
        gap_report = []
        
        for term in technical_terms:
            sources = list(self.term_sources.get(term, []))
            
            # Step A: Check metadata matching direct tags/slug names
            if term in existing_notes_meta:
                meta = existing_notes_meta[term]
                if meta.get("is_empty", True) or meta.get("status") == "gap":
                    gap_report.append({
                        "term": term,
                        "classification": "knowledge_debt",
                        "reason": f"Note file '{term}.md' exists but lacks clear conceptual content body definitions.",
                        "detected_from": sources
					})
                continue

            # Step B: Semantic Search Guardrail 
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
                    "reason": "This module is executed dynamically within your repository code, but has no semantic documentation trace.",
                    "detected_from": sources
                })
                
        return gap_report