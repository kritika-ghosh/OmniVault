import os
import sys
import json
import subprocess
import tempfile
# pyrefly: ignore [missing-import]
from litellm import completion
from typing import List, Dict
from app.config import settings

class ActiveRecallJudge:
    def __init__(self):
        self.model = settings.DEFAULT_LLM_MODEL

    def generate_quiz_challenge(self, note_content: str) -> dict:
        """
        Generates an active-recall question from a note's text body.
        Supports both conceptual questions and coding challenges (with test cases)
        matching Appendix B specifications.
        """
        system_prompt = (
            "You are a technical instructor generating a quiz question based on the provided reference material.\n"
            "Test deep conceptual engineering understanding or edge-case diagnostics, not passive memorization.\n"
            "If the note contains programming APIs/syntax, you are encouraged to generate a coding challenge.\n"
            "You MUST reply with a raw JSON object matching this structure exactly:\n"
            "{\n"
            "  \"question_text\": \"Your challenging question string\",\n"
            "  \"code_snippet\": \"Optional initial boilerplate code or null\",\n"
            "  \"expected_concepts\": [\"concept_point_1\", \"concept_point_2\"],\n"
            "  \"test_cases\": [ {\"input\": \"stdin input text if applicable\", \"expected_output\": \"expected stdout text\"} ] or null\n"
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
                response_format={"type": "json_object"}
            )
            return json.loads(response.choices[0].message.content)
        except Exception as e:
            return {
                "question_text": f"Failed to auto-generate quiz artifact parameters. Error: {str(e)}",
                "code_snippet": None,
                "expected_concepts": [],
                "test_cases": None
            }

    def _run_python_code(self, code: str, stdin_data: str = "") -> dict:
        with tempfile.NamedTemporaryFile(suffix=".py", delete=False, mode="w", encoding="utf-8") as f:
            f.write(code)
            temp_file_path = f.name
        try:
            result = subprocess.run(
                [sys.executable, temp_file_path],
                input=stdin_data,
                capture_output=True,
                text=True,
                timeout=10.0
            )
            return {
                "success": result.returncode == 0,
                "stdout": result.stdout,
                "stderr": result.stderr
            }
        except subprocess.TimeoutExpired:
            return {
                "success": False,
                "stdout": "",
                "stderr": "TimeoutExpired: Execution exceeded 10.0 seconds limit."
            }
        finally:
            if os.path.exists(temp_file_path):
                os.unlink(temp_file_path)

    def _run_javascript_code(self, code: str, stdin_data: str = "") -> dict:
        with tempfile.NamedTemporaryFile(suffix=".js", delete=False, mode="w", encoding="utf-8") as f:
            f.write(code)
            temp_file_path = f.name
        try:
            result = subprocess.run(
                ["node", temp_file_path],
                input=stdin_data,
                capture_output=True,
                text=True,
                timeout=10.0
            )
            return {
                "success": result.returncode == 0,
                "stdout": result.stdout,
                "stderr": result.stderr
            }
        except FileNotFoundError:
            return {
                "success": False,
                "stdout": "",
                "stderr": "NodeJS runtime not found on local environment path."
            }
        except subprocess.TimeoutExpired:
            return {
                "success": False,
                "stdout": "",
                "stderr": "TimeoutExpired: Execution exceeded 10.0 seconds limit."
            }
        finally:
            if os.path.exists(temp_file_path):
                os.unlink(temp_file_path)

    def evaluate_user_response(self, question: str, expected_concepts: list, user_answer: str, test_cases: list = None) -> dict:
        """
        LLM-as-a-Judge gateway evaluating answers against expected concepts and sandbox execution logs.
        Enforces Appendix D Socratic JSON target schema bounds.
        """
        test_results = []
        if test_cases and isinstance(test_cases, list):
            # Attempt to determine programming language from user answer text
            lang = "python"
            if "console.log" in user_answer or "const " in user_answer or "let " in user_answer or "function " in user_answer:
                lang = "javascript"
                
            for i, tc in enumerate(test_cases):
                inp = tc.get("input", "")
                expected = tc.get("expected_output", "")
                
                if lang == "python":
                    res = self._run_python_code(user_answer, inp)
                else:
                    res = self._run_javascript_code(user_answer, inp)
                    
                actual = res["stdout"].strip()
                passed = res["success"] and actual == expected.strip()
                test_results.append({
                    "test_case": i + 1,
                    "input": inp,
                    "expected": expected,
                    "actual": actual,
                    "passed": passed,
                    "stderr": res["stderr"]
                })

        # Integrate sandbox test results into system judge prompt
        system_prompt = (
            "You are a Socratic code mentor evaluating a developer's free-text or code-snippet technical quiz answer.\n"
            "Compare the user response against the question parameters, expected core concepts, and sandbox execution logs.\n"
            "Rules:\n"
            "1. If they are directionally correct but missing details, or if any sandbox test cases failed, give them a passed value of false.\n"
            "2. Under NO circumstance reveal the direct solution code inside your feedback_hint string.\n"
            "3. Ask guiding, thought-provoking questions to lead them to discover the answer on their own.\n"
            "4. If test cases failed, refer to the failing behavior/inputs to guide them, but do not provide the correct code.\n\n"
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
            f"User's Submitted Answer:\n{user_answer}\n"
        )
        if test_results:
            user_input += f"\nSandbox Test Case Results:\n{json.dumps(test_results, indent=2)}\n"

        try:
            response = completion(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_input}
                ],
                response_format={"type": "json_object"}
            )
            eval_data = json.loads(response.choices[0].message.content)
            
            # If test results exist, attach them to the response for front-end rendering
            if test_results:
                eval_data["sandbox_results"] = test_results
            return eval_data
        except Exception as e:
            return {
                "passed": False,
                "similarity_score": 0.0,
                "feedback_hint": f"Evaluation engine configuration failure error: {str(e)}",
                "missing_concepts": []
            }