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

class ChunkScanRequest(BaseModel):
    session_id: str
    chunk_type: str  # "notes" or "project"
    chunk_index: int
    total_chunks: int
    files: List[FilePayload]
    is_final: bool = False

# In-memory storage for active chunked scan sessions
chunk_sessions: dict = {}

class SearchRequest(BaseModel):
    query: str
    notes_files: Optional[List[FilePayload]] = None
    limit: Optional[int] = 5

@router.post("/search")
async def semantic_vault_search(payload: SearchRequest):
    """
    Queries ChromaDB vector store or in-memory notes for semantic similarity matches.
    """
    if payload.notes_files:
        n_files = [{"path": f.path, "content": f.content} for f in payload.notes_files]
        collection, _ = vector_store.index_notes_vault_in_memory(n_files)
        matches = vector_store.semantic_search_on_collection(collection, payload.query, limit=payload.limit or 5)
        return {"query": payload.query, "results": matches}
    
    matches = vector_store.semantic_search(payload.query, limit=payload.limit or 5)
    return {"query": payload.query, "results": matches}

@router.post("/chunk")
async def execute_chunked_workspace_scan(payload: ChunkScanRequest):
    sid = payload.session_id
    if sid not in chunk_sessions:
        chunk_sessions[sid] = {
            "project_files": [],
            "notes_files": [],
            "received_chunks": 0,
            "total_chunks": payload.total_chunks
        }
    
    sess = chunk_sessions[sid]
    sess["received_chunks"] += 1
    
    files_dict = [{"path": f.path, "content": f.content} for f in payload.files]
    if payload.chunk_type == "notes":
        sess["notes_files"].extend(files_dict)
    else:
        sess["project_files"].extend(files_dict)
        
    if not payload.is_final and sess["received_chunks"] < payload.total_chunks:
        return {
            "status": "chunk_received",
            "session_id": sid,
            "received_chunks": sess["received_chunks"],
            "total_chunks": payload.total_chunks
        }
        
    # Final chunk reached - Execute complete gap scan on accumulated files
    p_files = sess["project_files"]
    n_files = sess["notes_files"]
    
    # Clean up session memory
    del chunk_sessions[sid]
    
    smart_detector.term_sources = {}
    collection, existing_notes_meta = vector_store.index_notes_vault_in_memory(n_files)
    
    detected_gaps = smart_detector.compute_smart_gaps_with_llm(p_files, existing_notes_meta, n_files, collection)
    
    await manager.broadcast({
        "type": "graph_update",
        "total_terms_scanned": len(detected_gaps),
        "gaps_found": len(detected_gaps)
    })
    
    return {
        "status": "success",
        "total_terms_scanned": len(detected_gaps),
        "gaps_found": len(detected_gaps),
        "report": detected_gaps,
        "notes_files": n_files
    }

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
        
        # LLM concept and expertise gap analysis
        detected_gaps = smart_detector.compute_smart_gaps_with_llm(p_files, existing_notes_meta, n_files, collection)
        
        # Broadcast graph updates via WebSockets
        await manager.broadcast({
            "type": "graph_update",
            "total_terms_scanned": len(detected_gaps),
            "gaps_found": len(detected_gaps)
        })
        
        return {
            "status": "success",
            "total_terms_scanned": len(detected_gaps),
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