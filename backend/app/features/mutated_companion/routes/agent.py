from fastapi import APIRouter, HTTPException
from app.features.mutated_companion.routes.session import ACTIVE_SESSIONS
from app.features.mutated_companion.services.planner import mutation_engine
from datetime import datetime

router = APIRouter(prefix="/agent", tags=["Agent"])

@router.get("/{session_id}/log")
async def get_agent_log(session_id: str):
    """Retrieves the history of autonomous actions and rationales executed by the AI planner."""
    if session_id not in ACTIVE_SESSIONS:
        raise HTTPException(status_code=404, detail="Active study track session not found.")
    
    return {"session_id": session_id, "agent_log": ACTIVE_SESSIONS[session_id]["agent_log"]}

@router.post("/{session_id}/replan")
async def force_agent_replan(session_id: str, target_node_id: str):
    """Manual demo override endpoint to instantly trigger the mutation loop for live judging showcases."""
    if session_id not in ACTIVE_SESSIONS:
        raise HTTPException(status_code=404, detail="Active study track session not found.")
        
    session = ACTIVE_SESSIONS[session_id]
    
    # Simulate a forced failure condition to showcase the dynamic mutation logic to judges
    simulated_low_score = 0.35
    
    mutation_plan = mutation_engine.evaluate_and_replan(
        current_curriculum=session["curriculum"],
        node_id=target_node_id,
        score=simulated_low_score
    )
    
    if mutation_plan.get("should_mutate"):
        timestamp = datetime.now().strftime("%Y-%m-%dT%H:%M:%SZ")
        session["agent_log"].append({
            "timestamp": timestamp,
            "message": f"FORCED DEMO REPLAN on [{target_node_id}]: {mutation_plan['agent_rationale']}"
        })
        
        for new_node in mutation_plan.get("add_nodes", []):
            new_node["mastery_score"] = 0.0
            new_node["child_nodes"] = []
            new_node["retrieved_chunk_ids"] = []
            session["curriculum"].append(new_node)
            
    return {
        "message": "Manual demo replan executed successfully.",
        "mutation_applied": mutation_plan.get("should_mutate", False),
        "updated_session_state": session
    }
