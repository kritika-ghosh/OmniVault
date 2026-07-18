from pydantic import BaseModel, Field
from typing import List, Optional, Dict

class DocumentInfo(BaseModel):
    id: str
    filename: str

class QuizQuestion(BaseModel):
    id: str
    type: str = "mcq"
    question: str
    options: List[str]
    correct_answer: str
    explanation: Optional[str] = None

class QuizSubmission(BaseModel):
    answers: Dict[str, str]  # question_id -> user_answer
    confidence: int = Field(..., ge=1, le=5)

class SessionInitRequest(BaseModel):
    goal: str
    document_ids: Optional[List[str]] = []

class CurriculumNode(BaseModel):
    id: str
    title: str
    description: str
    estimated_hours: int
    dependencies: List[str]
    mastery_score: float = 0.0
    status: str = "locked"  # mastered, shaky, blocked, locked
    child_nodes: List['CurriculumNode'] = []
    retrieved_chunk_ids: List[str] = []

class AgentLogEntry(BaseModel):
    timestamp: str
    message: str

class SessionStateResponse(BaseModel):
    session_id: str
    goal: str
    curriculum: List[CurriculumNode]
    agent_log: List[AgentLogEntry]
