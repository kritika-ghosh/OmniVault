import json
from datetime import datetime
from openai import OpenAI
from app.features.mutated_companion.config import settings
from app.features.mutated_companion.models import CurriculumNode

class MutationEngine:
    def __init__(self):
        self.client = OpenAI(
            base_url=settings.GROQ_API_BASE,
            api_key=settings.GROQ_API_KEY
        )

    def calculate_mastery(self, quiz_accuracy: float, user_confidence: int) -> float:
        """Computes structural mastery score M based on accuracy and confidence weightings."""
        # M = (quiz_accuracy * 0.7) + (normalized_confidence * 0.3)
        normalized_confidence = (user_confidence - 1) / 4.0
        return round((quiz_accuracy * 0.7) + (normalized_confidence * 0.3), 2)

    def evaluate_and_replan(self, current_curriculum: list, node_id: str, score: float) -> dict:
        """Triggers the agentic loop to inspect mastery deficits and mutate the timeline via Groq."""
        
        system_prompt = (
            "You are an expert curriculum developer and AI agent planner. Given the state of a student's "
            "learning path and their mastery score for a specific module node, you must decide if the timeline "
            "needs to mutate. \n\n"
            "Rules:\n"
            "- Mastery Score < 0.5: Blocked. You must generate 2 simpler foundational sub-nodes and place them before the downstream steps.\n"
            "- Mastery Score between 0.5 and 0.8: Shaky. Insert 1 targeted remediation sub-node to clarify weak areas.\n"
            "- Mastery Score >= 0.8: Mastered. No structural mutations needed.\n\n"
            "Respond STRICTLY with a valid JSON object matching this structure:\n"
            "{\n"
            "  \"should_mutate\": true,\n"
            "  \"agent_rationale\": \"Explanation of student tracking metrics and mutation execution strategy.\",\n"
            "  \"add_nodes\": [\n"
            "    {\n"
            "      \"id\": \"generated_unique_id\",\n"
            "      \"title\": \"Remediation/Foundational Topic Title\",\n"
            "      \"description\": \"Simplified conceptual review parameters.\",\n"
            "      \"estimated_hours\": 2,\n"
            "      \"dependencies\": [],\n"
            "      \"status\": \"unlocked\"\n"
            "    }\n"
            "  ]\n"
            "}"
        )

        user_prompt = f"Target Node: {node_id}\nCalculated Mastery Score: {score}\nCurrent Curriculum Layout: {json.dumps(current_curriculum)}"

        try:
            response = self.client.chat.completions.create(
                model=settings.LLM_MODEL,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.2,
                response_format={"type": "json_object"}
            )
            
            return json.loads(response.choices[0].message.content)
        except Exception as e:
            print(f"Agent Re-planning error: {e}")
            return {"should_mutate": False, "agent_rationale": "Fallback triggered. No mutations applied.", "add_nodes": []}

# Global structural instance for routes
mutation_engine = MutationEngine()
