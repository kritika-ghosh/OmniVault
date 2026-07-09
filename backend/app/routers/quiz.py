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

router = APIRouter(prefix="/v1/quiz", tags=["quiz"])
judge_agent = ActiveRecallJudge()
vector_store = VectorStoreService()

class QuizGenerationRequest(BaseModel):
    note_path: Optional[str] = None
    note_content: Optional[str] = None

class QuizEvaluationRequest(BaseModel):
    note_path: Optional[str] = None
    note_content: Optional[str] = None
    question: str
    expected_concepts: List[str]
    user_answer: str
    test_cases: Optional[List[dict]] = None

@router.post("/generate")
async def get_interactive_quiz(payload: QuizGenerationRequest):
    # 1. Stateless In-Memory Mode
    if payload.note_content is not None:
        try:
            _, body, _ = vector_store._parse_markdown_content(payload.note_content)
            quiz_data = judge_agent.generate_quiz_challenge(body)
            return quiz_data
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    # 2. Local Disk Mode (Fallback)
    if not payload.note_path:
        raise HTTPException(status_code=400, detail="Either note_content or note_path must be supplied.")
    
    file_path = Path(payload.note_path)
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Target markdown note file artifact not found on system disk.")
    
    try:
        _, body, _ = NotesService.parse_markdown_file(file_path)
        quiz_data = judge_agent.generate_quiz_challenge(body)
        return quiz_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/evaluate")
async def submit_quiz_solution(payload: QuizEvaluationRequest):
    """
    Submits user answers to the Socratic evaluation engine.
    For Cloud Mode, returns updated frontmatter. For Local Mode, writes updates to disk.
    """
    # Evaluate user answer
    evaluation_result = judge_agent.evaluate_user_response(
        question=payload.question,
        expected_concepts=payload.expected_concepts,
        user_answer=payload.user_answer,
        test_cases=payload.test_cases
    )

    # 1. Stateless In-Memory Mode
    if payload.note_content is not None:
        try:
            frontmatter, content, _ = vector_store._parse_markdown_content(payload.note_content)
            today = datetime.date.today()
            passed = evaluation_result.get("passed", False)
            
            if passed:
                status = "mastered"
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
            else:
                status = "reviewed"
                frontmatter["review_interval_days"] = 1
                frontmatter["status"] = status
                frontmatter["last_reviewed"] = today.isoformat()
                frontmatter["next_review"] = (today + datetime.timedelta(days=1)).isoformat()
                frontmatter["updated"] = today.isoformat()
                
            evaluation_result["updated_frontmatter"] = frontmatter
            return evaluation_result
        except Exception as e:
            evaluation_result["meta_update_error"] = f"Failed to compute updated frontmatter: {str(e)}"
            return evaluation_result

    # 2. Local Disk Mode (Fallback)
    if not payload.note_path:
        raise HTTPException(status_code=400, detail="Either note_content or note_path must be supplied.")
        
    file_path = Path(payload.note_path)
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Target markdown note file artifact not found on system disk.")

    try:
        frontmatter, content, is_empty = NotesService.parse_markdown_file(file_path)
        slug = frontmatter.get("slug", file_path.stem).lower().strip()
        today = datetime.date.today()
        passed = evaluation_result.get("passed", False)
        
        if passed:
            status = "mastered"
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
            
            if slug in due_quiz_queue:
                due_quiz_queue.pop(slug)
        else:
            status = "reviewed"
            frontmatter["review_interval_days"] = 1
            frontmatter["status"] = status
            frontmatter["last_reviewed"] = today.isoformat()
            frontmatter["next_review"] = (today + datetime.timedelta(days=1)).isoformat()
            frontmatter["updated"] = today.isoformat()
            
            if slug in due_quiz_queue:
                due_quiz_queue[slug]["due_at"] = today.isoformat()

        NotesService.write_note_to_disk(file_path, frontmatter, content)
        vector_store.index_notes_vault(str(file_path.parent))
        
        await manager.broadcast({
            "type": "graph_update",
            "message": f"Quiz evaluated for '{slug}'. Status updated to {status}."
        })
    except Exception as e:
        evaluation_result["meta_update_error"] = f"Failed to update note metadata: {str(e)}"

    return evaluation_result