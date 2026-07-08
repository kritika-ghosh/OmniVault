from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from pathlib import Path
from app.agents.recall_judge import ActiveRecallJudge

router = APIRouter(prefix="/api/quiz", tags=["quiz"])
judge_agent = ActiveRecallJudge()

class QuizGenerationRequest(BaseModel):
    note_path: str

class QuizEvaluationRequest(BaseModel):
    question: str
    expected_concepts: list
    user_answer: str

@router.post("/generate")
async def get_interactive_quiz(payload: QuizGenerationRequest):
    file_path = Path(payload.note_path)
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Target markdown note file artifact not found on system disk.")
    
    try:
        content = file_path.read_text(encoding="utf-8", errors="ignore")
        quiz_data = judge_agent.generate_quiz_challenge(content)
        return quiz_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/evaluate")
async def submit_quiz_solution(payload: QuizEvaluationRequest):
    """
    Submits user answer strings directly to the Socratic evaluation engine gateway.
    """
    evaluation_result = judge_agent.evaluate_user_response(
        question=payload.question,
        expected_concepts=payload.expected_concepts,
        user_answer=payload.user_answer
    )
    return evaluation_result