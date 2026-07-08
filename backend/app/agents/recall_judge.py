import json
from litellm import completion
from app.config import settings

class ActiveRecallJudge:
    def __init__(self):
        self.model = settings.DEFAULT_LLM_MODEL

    def generate_quiz_challenge(self, note_content: str) -> dict:
        """
        Generates a conceptual active-recall question from a note's text body.
        Guarantees structured output matching Appendix B requirements.
        """
        system_prompt = (
            "You are an technical instructor generating a quiz question based on the provided reference material.\n"
            "Test deep conceptual engineering understanding or edge-case diagnostics, not passive memorization.\n"
            "You MUST reply with a raw JSON object matching this structure exactly:\n"
            "{\n"
            "  \"question_text\": \"Your challenging question string\",\n"
            "  \"expected_concepts\": [\"concept_point_1\", \"concept_point_2\"]\n"
            "}\n"
            "Do not wrap your markdown response in any extra markdown wrappers or backticks outside raw text JSON."
        )

        try:
            response = completion(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"Reference Note Material:\n{note_content}"}
                ],
                response_format={"type": "json_object"}  # Forces valid JSON extraction
            )
            return json.loads(response.choices[0].message.content)
        except Exception as e:
            return {
                "question_text": f"Failed to auto-generate quiz artifact parameters. Error: {str(e)}",
                "expected_concepts": []
            }

    def evaluate_user_response(self, question: str, expected_concepts: list, user_answer: str) -> dict:
        """
        LLM-as-a-Judge gateway evaluating answers against expected conceptual targets.
        Enforces Appendix D Socratic JSON target schema bounds.
        """
        system_prompt = (
            "You are a Socratic code mentor evaluating a developer's free-text technical quiz answer.\n"
            "Compare the user response against the question parameters and expected core concept checklists.\n"
            "Rules:\n"
            "1. If they are directionally correct but missing details, give them a passed value of false.\n"
            "2. Under NO circumstance reveal the direct solution answer code inside your feedback_hint string.\n"
            "3. Ask guiding, thought-provoking questions to lead them to discover the answer on their own.\n\n"
            "You MUST reply with a raw JSON object conforming exactly to this schema:\n"
            "{\n"
            "  \"passed\": boolean,\n"
            "  \"similarity_score\": float (0.0 to 1.0),\n"
            "  \"feedback_hint\": \"Your Socratic guiding hint text string\",\n"
            "  \"missing_concepts\": [\"concept_name_1\", \"concept_name_2\"]\n"
            "}"
        )

        user_input = (
            f"Question Asked: {question}\n"
            f"Expected Essential Core Targets: {expected_concepts}\n"
            f"User's Submitted Answer: {user_answer}\n"
        )

        try:
            response = completion(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_input}
                ],
                response_format={"type": "json_object"}
            )
            return json.loads(response.choices[0].message.content)
        except Exception as e:
            return {
                "passed": False,
                "similarity_score": 0.0,
                "feedback_hint": f"Evaluation engine configuration failure error: {str(e)}",
                "missing_concepts": []
            }