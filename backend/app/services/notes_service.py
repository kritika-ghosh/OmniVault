import os
import yaml
import re
from pathlib import Path
from datetime import date
from typing import Dict, Tuple, Optional, List

class NotesService:
    @staticmethod
    def parse_markdown_file(file_path: Path) -> Tuple[dict, str, bool]:
        """
        Extracts YAML frontmatter metadata and raw content from a markdown note.
        """
        content = ""
        metadata = {}
        is_empty = True

        try:
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                text = f.read()
                
            # Regex to match frontmatter delimited by ---
            match = re.match(r"^---\s*\n(.*?)\n---\s*\n(.*)", text, re.DOTALL)
            if match:
                frontmatter_raw = match.group(1)
                content = match.group(2).strip()
                metadata = yaml.safe_load(frontmatter_raw) or {}
            else:
                content = text.strip()

            is_empty = len(content) == 0
        except Exception:
            pass

        return metadata, content, is_empty

    @staticmethod
    def write_note_to_disk(file_path: Path, frontmatter: dict, content_body: str):
        """
        Serializes YAML frontmatter and writes the markdown note back to disk.
        """
        file_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Serialize YAML frontmatter
        frontmatter_str = yaml.dump(frontmatter, default_flow_style=False, sort_keys=False).strip()
        
        full_text = f"---\n{frontmatter_str}\n---\n\n{content_body.strip()}\n"
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(full_text)

    @staticmethod
    def create_or_update_gap_note(notes_dir: Path, term: str, classification: str, project_sources: List[str] = None) -> Path:
        """
        Creates a new gap note or updates an existing note to ensure it is marked as a gap.
        """
        if project_sources is None:
            project_sources = []
            
        slug = term.lower().strip().replace(" ", "-")
        file_path = notes_dir / f"{slug}.md"
        today_str = date.today().isoformat()
        
        if file_path.exists():
            # Update existing note frontmatter
            frontmatter, content, is_empty = NotesService.parse_markdown_file(file_path)
            
            # Keep existing frontmatter details, but update status and detection info
            frontmatter["status"] = "gap"
            frontmatter["updated"] = today_str
            if "detected_at" not in frontmatter:
                frontmatter["detected_at"] = today_str
                
            existing_sources = frontmatter.get("detected_from", [])
            if not isinstance(existing_sources, list):
                existing_sources = [existing_sources] if existing_sources else []
            for src in project_sources:
                if src not in existing_sources:
                    existing_sources.append(src)
            frontmatter["detected_from"] = existing_sources
            
            NotesService.write_note_to_disk(file_path, frontmatter, content)
        else:
            # Create a new boilerplate gap note
            frontmatter = {
                "title": term.capitalize(),
                "slug": slug,
                "tags": [term.lower()],
                "status": "gap",
                "created": today_str,
                "updated": today_str,
                "detected_at": today_str,
                "detected_from": project_sources,
                "review_interval_days": 1,
                "last_reviewed": today_str,
                "next_review": today_str
            }
            
            body = (
                f"# {term.capitalize()}\n\n"
                f"## Overview\n\n"
                f"Draft placeholder for '{term}'.\n\n"
                f"## Core Syntax / API\n\n\n"
                f"## Common Pitfalls\n\n\n"
                f"## Related Concepts\n\n"
            )
            NotesService.write_note_to_disk(file_path, frontmatter, body)
            
        return file_path
