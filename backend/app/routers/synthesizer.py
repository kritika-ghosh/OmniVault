import json
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from app.agents.synthesizer import ContentSynthesizer

router = APIRouter(prefix="/api/synthesize", tags=["synthesis"])
synthesizer = ContentSynthesizer()

class SynthesizeRequest(BaseModel):
    term: str
    project_context: str = "General Tech Stack Workspace"

@router.post("/stream")
async def stream_note_generation(payload: SynthesizeRequest):
    """
    Exposes an HTTP Server-Sent Events (SSE) route streaming 
    text/event-stream text fragments sequentially to the client[cite: 157, 170].
    """
    async def event_generator():
        async for chunk in synthesizer.generate_note_stream(payload.term, payload.project_context):
            # Format to follow exact W3C EventSource specifications
            yield f"data: {json.dumps({'chunk': chunk})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")