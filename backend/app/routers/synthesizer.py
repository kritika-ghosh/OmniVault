import json
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from pathlib import Path
from app.agents.synthesizer import ContentSynthesizer
from app.services.notes_service import NotesService
from app.services.vector_store import VectorStoreService
from app.routers.websocket import manager

router = APIRouter(prefix="/api/synthesize", tags=["synthesis"])
synthesizer = ContentSynthesizer()
vector_store = VectorStoreService()

class SynthesizeRequest(BaseModel):
    term: str
    project_context: str = "General Tech Stack Workspace"

class SaveNoteRequest(BaseModel):
    notes_path: str
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
    A local proxy endpoint that writes the synthesized note text directly to the file system.
    Re-indexes ChromaDB and broadcasts graph updates via WebSockets.
    """
    notes_dir = Path(payload.notes_path)
    if not notes_dir.exists():
        raise HTTPException(status_code=400, detail="Target notes folder directory not found on system disk.")
        
    file_path = notes_dir / payload.filename
    try:
        # Parse frontmatter and content body
        frontmatter, content, is_empty = NotesService.parse_markdown_file(file_path)
        
        # If it doesn't match normal parsing, or is new, we write the raw text directly
        # Since content from editor contains frontmatter, let's parse frontmatter from input
        input_file = notes_dir / f"temp_{payload.filename}"
        with open(input_file, "w", encoding="utf-8") as f:
            f.write(payload.content)
        parsed_fm, parsed_content, _ = NotesService.parse_markdown_file(input_file)
        
        # Clean up temp file
        if input_file.exists():
            input_file.unlink()
            
        # Write clean note to disk
        NotesService.write_note_to_disk(file_path, parsed_fm, parsed_content)
        
        # Re-index this notes directory
        vector_store.index_notes_vault(str(notes_dir))
        
        # Broadcast graph updates
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