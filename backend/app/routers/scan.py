# pyrefly: ignore [missing-import]
from fastapi import APIRouter, HTTPException
# pyrefly: ignore [missing-import]
from pydantic import BaseModel
from typing import List, Optional
from pathlib import Path
from app.agents.gap_detector import SmartGapDetector
from app.services.vector_store import VectorStoreService
from app.services.notes_service import NotesService
from app.routers.websocket import manager

router = APIRouter(prefix="/v1/scan", tags=["scan"])
smart_detector = SmartGapDetector()
vector_store = VectorStoreService()

class FilePayload(BaseModel):
    path: str
    content: str

class ScanRequest(BaseModel):
    project_path: Optional[str] = None
    notes_path: Optional[str] = None
    project_files: Optional[List[FilePayload]] = None
    notes_files: Optional[List[FilePayload]] = None

@router.post("")
async def execute_workspace_scan(payload: ScanRequest):
    # 1. Stateless In-Memory Mode
    if payload.project_files is not None and payload.notes_files is not None:
        smart_detector.term_sources = {}
        
        # Format payload structure
        p_files = [{"path": f.path, "content": f.content} for f in payload.project_files]
        n_files = [{"path": f.path, "content": f.content} for f in payload.notes_files]
        
        # Ephemerally index notes
        collection, existing_notes_meta = vector_store.index_notes_vault_in_memory(n_files)
        
        # Scan code files
        declared_deps = smart_detector.extract_dependencies_in_memory(p_files)
        code_imports = smart_detector.scan_workspace_codebase_in_memory(p_files)
        all_terms = declared_deps.union(code_imports)
        
        # Perform similarity safety checks and gap analysis
        detected_gaps = smart_detector.compute_smart_gaps(all_terms, existing_notes_meta, collection)
        
        # Broadcast graph updates via WebSockets
        await manager.broadcast({
            "type": "graph_update",
            "total_terms_scanned": len(all_terms),
            "gaps_found": len(detected_gaps)
        })
        
        return {
            "status": "success",
            "total_terms_scanned": len(all_terms),
            "gaps_found": len(detected_gaps),
            "report": detected_gaps
        }

    # 2. Local Directory Mode (Fallback)
    if not payload.project_path or not payload.notes_path:
        raise HTTPException(status_code=400, detail="Invalid directory paths or file payloads supplied.")

    proj_path = Path(payload.project_path)
    notes_path = Path(payload.notes_path)

    if not proj_path.exists() or not notes_path.exists():
        raise HTTPException(status_code=400, detail="Invalid directory paths supplied.")

    smart_detector.term_sources = {}

    # Index existing notes on disk
    existing_notes_meta = vector_store.index_notes_vault(str(notes_path)) 

    # Scan dependencies and codebase imports
    declared_deps = smart_detector.extract_dependencies(proj_path)
    code_imports = smart_detector.scan_workspace_codebase(proj_path)
    all_terms = declared_deps.union(code_imports)
    
    detected_gaps = smart_detector.compute_smart_gaps(all_terms, existing_notes_meta)

    # Save gap notes to disk
    for gap in detected_gaps:
        NotesService.create_or_update_gap_note(
            notes_dir=notes_path,
            term=gap["term"],
            classification=gap["classification"],
            project_sources=gap.get("detected_from", [])
        )

    # Re-index
    vector_store.index_notes_vault(str(notes_path))

    await manager.broadcast({
        "type": "graph_update",
        "total_terms_scanned": len(all_terms),
        "gaps_found": len(detected_gaps)
    })

    return {
        "status": "success",
        "total_terms_scanned": len(all_terms),
        "gaps_found": len(detected_gaps),
        "report": detected_gaps
    }