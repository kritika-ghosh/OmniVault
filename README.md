---
title: NexusIDE API
emoji: 🚀
colorFrom: blue
colorTo: purple
sdk: docker
app_port: 7860
pinned: false
---

# OmniVault AI 3-Agent Loop Engine

OmniVault is a local-first, self-healing technical workspace backend that bridges the gap between developers' codebases and personal Markdown documentation vaults. It automatically parses codebase dependencies/imports, identifies conceptual gaps, synthesizes documentation guides, and schedules context-aware active recall quizzes validated in a local sandbox.

This repository is configured to deploy directly to **Hugging Face Spaces** as a custom Docker-based FastAPI backend.

---

## Architecture & Cooperation Agents

1. **Smart Gap Detector:** Scans dependencies (`package.json`, `requirements.txt`) and code imports (via tree-sitter AST and regex fallbacks) to find undocumented libraries. It compares them semantically against a ChromaDB vector index to identify `critical_gap` or `knowledge_debt` statuses.
2. **Adaptive Content Synthesizer:** Formulates search queries using the tech stack context, retrieves web context via DuckDuckGo, validates code snippets via syntax AST checks, and streams newly generated Markdown notes via Server-Sent Events (SSE).
3. **Active Recall Judge:** Generates conceptual and coding quizzes from notes. Coding questions are validated inside a local subprocess execution sandbox (Python/Node.js) and assessed with a Socratic LLM judge.

---

## Core API Endpoints

### 1. Workspace Scanner (`POST /api/scan`)
Scans the project codebase for imported modules and packages, cross-references with notes, and creates/updates gap notes on disk.
*   **Payload:**
    ```json
    {
      "project_path": "/workspace/project",
      "notes_path": "/workspace/notes"
    }
    ```

### 2. Note Synthesizer (`POST /api/synthesize/stream`)
Generates structured Markdown notes block-by-block using Server-Sent Events (SSE) based on tech stack and concept keywords.
*   **Payload:**
    ```json
    {
      "term": "useEffect",
      "project_context": "React, TypeScript"
    }
    ```

### 3. Note Writer / Local Proxy (`POST /api/synthesize/save`)
Saves notes directly to disk and re-indexes ChromaDB.
*   **Payload:**
    ```json
    {
      "notes_path": "/workspace/notes",
      "filename": "useeffect.md",
      "content": "--- ... ---"
    }
    ```

### 4. Active Recall Quiz Generator (`POST /api/quiz/generate`)
Generates a conceptual or coding quiz with test cases for a specific note.
*   **Payload:**
    ```json
    {
      "note_path": "/workspace/notes/useeffect.md"
    }
    ```

### 5. Active Recall Evaluator (`POST /api/quiz/evaluate`)
Evaluates user quiz responses. If `test_cases` are provided, it executes the code locally, passes logs to the Socratic LLM evaluator, updates SM-2 intervals (`1 -> 3 -> 7 -> 14 -> 30 -> 60` days), and writes notes back to disk.
*   **Payload:**
    ```json
    {
      "note_path": "/workspace/notes/useeffect.md",
      "question": "Write a useEffect that clean up...",
      "expected_concepts": ["cleanup function", "dependency array"],
      "user_answer": "...",
      "test_cases": []
    }
    ```

### 6. WebSocket Notifications (`/ws`)
Real-time connection endpoint pushing `quiz_due` notifications and `graph_update` events when notes status updates.

---

## Hugging Face Spaces Deployment

To deploy this backend as a Space on Hugging Face:
1. Create a new Space on [Hugging Face](https://huggingface.co/new-space).
2. Set the SDK to **Docker** (it will use the `Dockerfile` at the root).
3. Upload/push this repository to your Space repository.
4. Set your **Space Secrets** (in Space settings):
   *   `GROQ_API_KEY`: Your Groq platform API key.
5. The container will build automatically, run `app.py`, and expose the API and Gradio health check on port `7860`.

---

## Running Locally

To run the API server locally with the Gradio entrypoint:
1. Activate your virtual environment and install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
2. Start the server:
   ```bash
   python app.py
   ```
3. Your FastAPI endpoints are accessible at `http://localhost:7860/` and the Gradio check is at `http://localhost:7860/internal-dashboard`.
