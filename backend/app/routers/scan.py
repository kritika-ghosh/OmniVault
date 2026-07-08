from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from pathlib import Path
from app.agents.gap_detector import SmartGapDetector  # <-- Import the new Smart class
from app.services.vector_store import VectorStoreService

router = APIRouter(prefix="/api/scan", tags=["scan"])
smart_detector = SmartGapDetector()
vector_store = VectorStoreService()

class ScanRequest(BaseModel):
    project_path: str
    notes_path: str

@router.post("")
async def execute_workspace_scan(payload: ScanRequest):
    proj_path = Path(payload.project_path)
    notes_path = Path(payload.notes_path)

    if not proj_path.exists() or not notes_path.exists():
        raise HTTPException(status_code=400, detail="Invalid directory paths supplied.")

    # 1. Rebuild the semantic store from your Markdown folder [cite: 74, 153]
    existing_notes_meta = vector_store.index_notes_vault(str(notes_path)) 

    # 2. Run AST scanning across your codebase [cite: 73]
    declared_deps = smart_detector.extract_dependencies(proj_path)
    code_imports = smart_detector.scan_workspace_codebase(proj_path)
    
    all_terms = declared_deps.union(code_imports)

    # 3. Process gaps with semantic safety checks 
    detected_gaps = smart_detector.compute_smart_gaps(all_terms, existing_notes_meta)

    return {
        "status": "success",
        "total_terms_scanned": len(all_terms),
        "gaps_found": len(detected_gaps),
        "report": detected_gaps
    }