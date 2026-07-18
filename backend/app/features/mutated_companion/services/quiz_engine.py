import json
from openai import OpenAI
from app.features.mutated_companion.config import settings
from app.features.mutated_companion.services.rag_service import RAGService

class QuizEngine:
    def __init__(self):
        # Groq is drop-in compatible with the OpenAI SDK structure
        self.client = OpenAI(
            base_url=settings.GROQ_API_BASE,
            api_key=settings.GROQ_API_KEY
        )

    def generate_quiz_for_node(self, node_description: str) -> list:
        """Retrieves localized context and builds a grounded quiz via Groq."""
        # 1. Fetch relevant context from the storage layer
        context = RAGService.retrieve_relevant_context(node_description, n_results=3)
        
        # 2. Instruct the model using strict pedagogical grounding rules
        system_prompt = (
            "You are an educational quiz generator. Generate exactly 3 multiple-choice questions "
            "that test understanding of the concept requested. You must use ONLY the provided context "
            "to formulate the questions and correct answers. Do not make things up.\n\n"
            "Format your complete response as a raw JSON array matching this schema structure:\n"
            "[\n"
            "  {\n"
            "    \"id\": \"q_1\",\n"
            "    \"type\": \"mcq\",\n"
            "    \"question\": \"Question text here?\",\n"
            "    \"options\": [\"Option A\", \"Option B\", \"Option C\", \"Option D\"],\n"
            "    \"correct_answer\": \"Exact text matching the correct option text string\",\n"
            "    \"explanation\": \"Brief conceptual breakdown explaining the answer.\"\n"
            "  }\n"
            "]"
        )
        
        user_prompt = f"Topic to test: {node_description}\n\nRetrieved Context:\n{context}"
        
        try:
            response = self.client.chat.completions.create(
                model=settings.LLM_MODEL,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.3, # Low temperature ensures strict fact-adherence
                response_format={"type": "json_object"}
            )
            
            raw_content = response.choices[0].message.content
            return json.loads(raw_content)
        except Exception as e:
            print(f"Error generating quiz: {e}")
            # Graceful hackathon UI placeholder fallback if API drops out or limits trip
            return [
                {
                    "id": "fallback_q",
                    "type": "mcq",
                    "question": f"Sample question regarding: {node_description}",
                    "options": ["Choice A", "Choice B", "Choice C", "Choice D"],
                    "correct_answer": "Choice A",
                    "explanation": "Fallback engine question placeholder."
                }
            ]

# Global instance for routes to import
quiz_engine = QuizEngine()
