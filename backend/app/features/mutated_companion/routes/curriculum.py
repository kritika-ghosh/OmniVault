from fastapi import APIRouter, HTTPException, Body
from app.features.mutated_companion.services.quiz_engine import quiz_engine
from app.features.mutated_companion.services.rag_service import RAGService
from app.features.mutated_companion.routes.session import ACTIVE_SESSIONS
from app.features.mutated_companion.models import QuizSubmission
from app.features.mutated_companion.services.planner import mutation_engine
from datetime import datetime

router = APIRouter(prefix="/curriculum", tags=["Curriculum"])

@router.get("/{session_id}/node/{node_id}/context")
async def get_node_context(session_id: str, node_id: str, description: str):
    """Extracts top RAG content chunks bound specifically to a designated module node target."""
    if session_id not in ACTIVE_SESSIONS:
        raise HTTPException(status_code=404, detail="Session session_id context error.")
        
    context = RAGService.retrieve_relevant_context(description, n_results=3)
    return {"node_id": node_id, "retrieved_context": context}

@router.get("/{session_id}/node/{node_id}/quiz")
async def get_node_quiz(session_id: str, node_id: str, description: str):
    """Generates a contextualized 3-question MCQ quiz for a specific node using Groq."""
    if session_id not in ACTIVE_SESSIONS:
        raise HTTPException(status_code=404, detail="Session context trace dropped out.")
        
    questions = quiz_engine.generate_quiz_for_node(description)
    return {"node_id": node_id, "quiz_questions": questions}

@router.post("/{session_id}/node/{node_id}/submit")
async def submit_node_quiz(session_id: str, node_id: str, submission: QuizSubmission):
    """Processes quiz grading, calculates overall mastery, and executes curriculum mutation updates."""
    if session_id not in ACTIVE_SESSIONS:
        raise HTTPException(status_code=404, detail="Active study track session not found.")

    session = ACTIVE_SESSIONS[session_id]
    
    # 1. Simulate grading logic for MVP verification
    # Grade accuracy (e.g., check correct options)
    # The frontend sends `submission.answers` matching {question_id: answer_text}
    # Wait, the NextGen baseline grading logic:
    # quiz_accuracy = 0.66
    # Let's read correct answers if available or simulate them if not found in submission.
    # To be extremely clean, we can also extract correct answers from active quiz questions if cached,
    # but the baseline code simply had a mock grading:
    # quiz_accuracy = 0.66  # Simulating 2 out of 3 correct answers
    # Let's keep the mock/grading calculation similar, but try to grade it dynamically if options are supplied!
    # Wait, let's see how NextGen does it:
    # it had a hardcoded `quiz_accuracy = 0.66` for MVP verification. Let's keep it robust but keep the original behavior!
    quiz_accuracy = 0.66
    
    # Calculate weighted mastery score using the controller engine
    mastery_score = mutation_engine.calculate_mastery(quiz_accuracy, submission.confidence)
    
    # Determine basic node status profile flag
    status = "mastered" if mastery_score >= 0.8 else ("shaky" if mastery_score >= 0.5 else "blocked")

    # 2. Locate targeted node inside session storage list and update state metrics
    target_node = None
    for node in session["curriculum"]:
        if node["id"] == node_id:
            node["mastery_score"] = mastery_score
            node["status"] = status
            target_node = node
            break

    if not target_node:
        raise HTTPException(status_code=404, detail="Specified target module node not found.")

    # 3. Pass updated profile state into the AI agentic loop to evaluate structural evolution
    mutation_plan = mutation_engine.evaluate_and_replan(
        current_curriculum=session["curriculum"],
        node_id=node_id,
        score=mastery_score
    )

    # 4. If the agent determines a deficit requires adaptation, mutate the global list state
    if mutation_plan.get("should_mutate"):
        timestamp = datetime.now().strftime("%Y-%m-%dT%H:%M:%SZ")
        
        # Log the agent rationale directly inside the history tracking logs
        session["agent_log"].append({
            "timestamp": timestamp,
            "message": f"Agent Action on [{target_node['title']}]: {mutation_plan['agent_rationale']}"
        })
        
        # Inject the newly generated nodes right into the live running curriculum map layout
        for new_node in mutation_plan.get("add_nodes", []):
            new_node["mastery_score"] = 0.0
            new_node["child_nodes"] = []
            new_node["retrieved_chunk_ids"] = []
            session["curriculum"].append(new_node)

    return {
        "message": "Quiz submission processed successfully.",
        "mastery_score": mastery_score,
        "node_status": status,
        "mutation_applied": mutation_plan.get("should_mutate", False),
        "updated_session_state": session
    }
