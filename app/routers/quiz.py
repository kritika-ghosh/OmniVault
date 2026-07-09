from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from pathlib import Path
import datetime
from typing import Optional, List
from app.agents.recall_judge import ActiveRecallJudge
from app.services.notes_service import NotesService
from app.services.vector_store import VectorStoreService
from app.routers.websocket import manager
from app.services.scheduler import due_quiz_queue

router = APIRouter(prefix="/gradio_api/v1/quiz", tags=["quiz"])
judge_agent = ActiveRecallJudge()
vector_store = VectorStoreService()

class QuizGenerationRequest(BaseModel):
    note_path: str

class QuizEvaluationRequest(BaseModel):
    note_path: str
    question: str
    expected_concepts: List[str]
    user_answer: str
    test_cases: Optional[List[dict]] = None

@router.post("/generate")
async def get_interactive_quiz(payload: QuizGenerationRequest):
    file_path = Path(payload.note_path)
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Target markdown note file artifact not found on system disk.")
    
    try:
        # Parse the file to get only the content body for LLM context grounding
        _, body, _ = NotesService.parse_markdown_file(file_path)
        quiz_data = judge_agent.generate_quiz_challenge(body)
        return quiz_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/evaluate")
async def submit_quiz_solution(payload: QuizEvaluationRequest):
    """
    Submits user answers to the Socratic evaluation engine.
    If note_path is provided, updates the note's frontmatter scheduling fields.
    """
    file_path = Path(payload.note_path)
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Target markdown note file artifact not found on system disk.")

    # 1. Evaluate user answer
    evaluation_result = judge_agent.evaluate_user_response(
        question=payload.question,
        expected_concepts=payload.expected_concepts,
        user_answer=payload.user_answer,
        test_cases=payload.test_cases
    )

    # 2. Update note scheduling frontmatter on disk
    try:
        frontmatter, content, is_empty = NotesService.parse_markdown_file(file_path)
        slug = frontmatter.get("slug", file_path.stem).lower().strip()
        today = datetime.date.today()
        
        passed = evaluation_result.get("passed", False)
        
        if passed:
            status = "mastered"
            # Modified SM-2 Progression: 1 -> 3 -> 7 -> 14 -> 30 -> 60 days
            progression = [1, 3, 7, 14, 30, 60]
            current_interval = 0
            try:
                current_interval = int(frontmatter.get("review_interval_days", 1))
            except Exception:
                pass
                
            next_interval = 1
            for step in progression:
                if step > current_interval:
                    next_interval = step
                    break
            else:
                next_interval = 60
                
            frontmatter["review_interval_days"] = next_interval
            frontmatter["status"] = status
            frontmatter["last_reviewed"] = today.isoformat()
            frontmatter["next_review"] = (today + datetime.timedelta(days=next_interval)).isoformat()
            frontmatter["updated"] = today.isoformat()
            
            # Remove from due queue
            if slug in due_quiz_queue:
                due_quiz_queue.pop(slug)
        else:
            status = "reviewed"
            # Reset progression interval to 1 day on failure
            frontmatter["review_interval_days"] = 1
            frontmatter["status"] = status
            frontmatter["last_reviewed"] = today.isoformat()
            frontmatter["next_review"] = (today + datetime.timedelta(days=1)).isoformat()
            frontmatter["updated"] = today.isoformat()
            
            # Keep in due queue since it needs review, but update queue state
            if slug in due_quiz_queue:
                due_quiz_queue[slug]["due_at"] = today.isoformat()

        # Write changes back to disk
        NotesService.write_note_to_disk(file_path, frontmatter, content)
        
        # Re-index the notes folder
        vector_store.index_notes_vault(str(file_path.parent))
        
        # Broadcast graph updates via WebSocket
        await manager.broadcast({
            "type": "graph_update",
            "message": f"Quiz evaluated for '{slug}'. Status updated to {status}."
        })
        
    except Exception as e:
        # Log error or add to result, but don't fail the evaluation response
        evaluation_result["meta_update_error"] = f"Failed to update note metadata: {str(e)}"

    return evaluation_result