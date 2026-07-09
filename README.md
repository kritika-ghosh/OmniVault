---
title: OmniVault
emoji: 🗃️
colorFrom: indigo
colorTo: purple
sdk: gradio
app_file: main.py
pinned: false
---

# OmniVault AI 3-Agent Loop Engine

OmniVault is a local-first, self-healing technical workspace backend that bridges the gap between developers' codebases and personal Markdown documentation vaults. It automatically parses codebase dependencies/imports, identifies conceptual gaps, synthesizes documentation guides, and schedules context-aware active recall quizzes validated in a local sandbox.

This repository is configured to deploy directly to **Hugging Face Spaces** as a Gradio-mounted FastAPI backend.

---

## Core API Endpoints (Gradio API Proxy Bypass)

All custom endpoints are exposed under the `/gradio_api/` prefix to bypass Gradio's SvelteKit NodeJS proxy:
- **Scan Workspace:** `POST /gradio_api/v1/scan`
- **Note Synthesizer:** `POST /gradio_api/v1/synthesize/stream`
- **Note Writer:** `POST /gradio_api/v1/synthesize/save`
- **Quiz Generator:** `POST /gradio_api/v1/quiz/generate`
- **Quiz Evaluator:** `POST /gradio_api/v1/quiz/evaluate`
- **WebSocket Notifications:** `/gradio_api/ws`

---

## Hugging Face Spaces Deployment

To deploy this backend as a Space on Hugging Face:
1. Create a new Space on [Hugging Face](https://huggingface.co/new-space).
2. Set the SDK to **Gradio** (it will use `main.py` as entrypoint).
3. Upload/push this repository to your Space repository.
4. Set your **Space Secrets** (in Space settings):
   *   `GROQ_API_KEY`: Your Groq platform API key.
5. The container will build automatically, run `main.py`, and expose the API and Gradio health check on port `7860`.
