# OmniVault AI 3-Agent Decoupled Workspace

OmniVault is a local-first, self-healing technical workspace backend that bridges the gap between developers' codebases and personal Markdown documentation vaults. It automatically parses codebase dependencies/imports, identifies conceptual gaps, synthesizes documentation guides, and schedules context-aware active recall quizzes.

This repository is structured to separate concerns, making it easy to deploy the backend to Render, host the frontend on Vercel, and use local testing workspaces.

---

## Repository Structure

The workspace is organized as follows:

```text
OmniVault/
├── backend/                  # FastAPI backend engine
│   ├── app/                  # FastAPI app routers, services, and agents
│   ├── main.py               # Uvicorn entrypoint (FastAPI + Gradio UI)
│   ├── Dockerfile            # Container deployment specification
│   └── requirements.txt      # Python dependencies list
├── frontend/                 # Frontend client workspace
│   └── index.html            # Unstyled HTML testing client (replaces test_client.html)
├── testing/                  # Testing sandbox directories (user-specifiable inputs)
│   ├── project_code/         # Mock codebase importing Pandas, requests, numpy, etc.
│   └── markdown_notes/       # Mock notes vault covering FastAPI, pandas, requests, etc.
├── README.md                 # Project documentation
└── .gitignore                # Git ignore files
```

---

## Render Deployment Settings (Docker)

To deploy the backend to **Render.com** under the decoupled layout:

1. Create a new **Web Service** on Render and connect your GitHub repository.
2. Configure the following settings in your dashboard:
   - **Runtime:** `Docker`
   - **Root Directory:** `.` (keep the default root folder, do not set to `backend`)
   - **Dockerfile Path:** `backend/Dockerfile`
3. Add the following **Environment Variable** (under the Environment tab):
   - `GROQ_API_KEY`: *Your Groq Platform API key*
4. Render will compile your container using the root build context (allowing it to copy the `testing/` sandbox folder if desired) and expose your public API URL (e.g., `https://omnivault.onrender.com`).

---

## Local Development & Testing

### 1. Run the Backend locally
Navigate to the `backend/` directory, activate your python virtual environment, and run:
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```
Your local FastAPI instance will be available at `http://localhost:8000`.

### 2. Run the Client
Open [frontend/index.html](file:///d:/Desktop/projects/OmniVault/frontend/index.html) in any web browser:
1. Paste your backend URL (e.g. `https://omnivault.onrender.com` or `http://localhost:8000`) into the **API Base Host** input field.
2. Click **Set Base URL**.
3. Under **Scan Workspace**, input the project path and notes path (these can be the mock `/workspace/testing/project_code` inside Docker, or your local folder paths like `D:/Desktop/projects/OmniVault/testing/project_code`).
4. Click **Execute Scan** to inspect the detected conceptual gaps.
