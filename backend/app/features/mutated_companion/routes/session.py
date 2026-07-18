import os
import uuid
from typing import List, Optional
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from app.features.mutated_companion.services.rag_service import RAGService

router = APIRouter(prefix="/session", tags=["Session"])

ACTIVE_SESSIONS = {}

@router.post("/init")
async def initialize_session(
    goal: str = Form(...), 
    files: List[UploadFile] = File(None),
    folder_path: Optional[str] = Form(None)
):
    """Initializes a track session, parses either a folder path or uploaded files, and indexes them."""
    session_id = f"sess_{uuid.uuid4().hex[:8]}"
    processed_filenames = []
    
    # 1. Option A: Process existing workspace folder path
    if folder_path:
        clean_path = folder_path.strip()
        if not os.path.exists(clean_path):
            raise HTTPException(status_code=400, detail=f"Target workspace folder path '{clean_path}' does not exist.")
        
        try:
            # Index all files in the directory
            RAGService.process_and_store_directory(clean_path)
            
            # Record filenames for logging
            for root_dir, _, filenames in os.walk(clean_path):
                for file in filenames:
                    if file.lower().endswith(('.md', '.txt', '.pdf')):
                        processed_filenames.append(file)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error processing workspace directory '{clean_path}': {str(e)}")

    # 2. Option B: Process uploaded documents (original behavior)
    elif files:
        temp_dir = "./data/temp"
        os.makedirs(temp_dir, exist_ok=True)
        
        for file in files:
            if not file.filename.strip():
                continue
                
            processed_filenames.append(file.filename)
            temp_file_path = os.path.join(temp_dir, f"{session_id}_{file.filename}")
            
            try:
                # Stream file payload down to the temp environment
                with open(temp_file_path, "wb") as buffer:
                    content = await file.read()
                    buffer.write(content)
                
                # Append chunks into the shared vector catalog collection
                RAGService.process_and_store_document(temp_file_path, file.filename)
                
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"Error parsing {file.filename}: {str(e)}")
            finally:
                if os.path.exists(temp_file_path):
                    os.remove(temp_file_path)

    # 3. Setup baseline dynamic timeline map array
    initial_curriculum = [
        {
            "id": "node_1",
            "title": f"Foundations of {goal[:20]}",
            "description": f"Core baseline overview targeting: {goal}",
            "estimated_hours": 3,
            "dependencies": [],
            "mastery_score": 0.0,
            "status": "unlocked",
            "child_nodes": [],
            "retrieved_chunk_ids": []
        },
        {
            "id": "node_2",
            "title": "Advanced Framework Applications",
            "description": "Deep dive structural exploration based on documents.",
            "estimated_hours": 5,
            "dependencies": ["node_1"],
            "mastery_score": 0.0,
            "status": "locked",
            "child_nodes": [],
            "retrieved_chunk_ids": []
        }
    ]
    
    # Save session state profile mapping parameters
    ACTIVE_SESSIONS[session_id] = {
        "session_id": session_id,
        "goal": goal,
        "filenames": processed_filenames,  # Track all added files
        "curriculum": initial_curriculum,
        "agent_log": [{"timestamp": "2026-07-16T00:00:00Z", "message": f"Blueprint initialized successfully with {len(processed_filenames)} resources."}]
    }
    
    return ACTIVE_SESSIONS[session_id]

@router.get("/{session_id}/state")
async def get_session_state(session_id: str):
    if session_id not in ACTIVE_SESSIONS:
        raise HTTPException(status_code=404, detail="Active study track session not found.")
    return ACTIVE_SESSIONS[session_id]
