import json
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional
from pathlib import Path
from app.agents.synthesizer import ContentSynthesizer
from app.services.notes_service import NotesService
from app.services.vector_store import VectorStoreService
from app.routers.websocket import manager

router = APIRouter(prefix="/v1/synthesize", tags=["synthesis"])
synthesizer = ContentSynthesizer()
vector_store = VectorStoreService()

class SynthesizeRequest(BaseModel):
    term: str
    project_context: str = "General Tech Stack Workspace"

class SaveNoteRequest(BaseModel):
    notes_path: Optional[str] = None
    filename: str
    content: str

@router.post("/stream")
async def stream_note_generation(payload: SynthesizeRequest):
    """
    Exposes an HTTP Server-Sent Events (SSE) route streaming 
    text/event-stream text fragments sequentially to the client.
    """
    async def event_generator():
        async for chunk in synthesizer.generate_note_stream(payload.term, payload.project_context):
            yield f"data: {json.dumps({'chunk': chunk})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")

@router.post("/save")
async def save_synthesized_note(payload: SaveNoteRequest):
    """
    Writes the synthesized note text directly to the file system (Local Mode),
    or returns it directly for browser-side saving (Cloud Mode).
    """
    # 1. Stateless Cloud/In-Memory Mode
    if not payload.notes_path or payload.notes_path == "in-memory":
        try:
            return {
                "status": "success",
                "path": "in-memory",
                "filename": payload.filename,
                "content": payload.content,
                "warnings": synthesizer.validate_code_blocks(payload.content)
            }
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to process in-memory note: {str(e)}")

    # 2. Local Disk Mode (Fallback)
    notes_dir = Path(payload.notes_path)
    if not notes_dir.exists():
        raise HTTPException(status_code=400, detail="Target notes folder directory not found on system disk.")
        
    file_path = notes_dir / payload.filename
    try:
        # Create temp file to parse correctly
        input_file = notes_dir / f"temp_{payload.filename}"
        with open(input_file, "w", encoding="utf-8") as f:
            f.write(payload.content)
        parsed_fm, parsed_content, _ = NotesService.parse_markdown_file(input_file)
        
        # Clean up temp file
        if input_file.exists():
            input_file.unlink()
            
        # Write clean note to disk
        NotesService.write_note_to_disk(file_path, parsed_fm, parsed_content)
        
        # Re-index local notes directory
        vector_store.index_notes_vault(str(notes_dir))
        
        # Broadcast updates
        await manager.broadcast({
            "type": "graph_update",
            "message": f"Note '{payload.filename}' was saved successfully."
        })
        
        return {
            "status": "success",
            "path": str(file_path),
            "warnings": synthesizer.validate_code_blocks(payload.content)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to write note: {str(e)}")