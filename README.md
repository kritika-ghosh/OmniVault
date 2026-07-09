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
│   ├── requirements.txt      # Python dependencies list
│   └── testing/              # Testing sandbox directories (packaged inside container)
│       ├── project_code/     # Mock codebase importing Pandas, requests, numpy, etc.
│       └── markdown_notes/   # Mock notes vault covering FastAPI, pandas, requests, etc.
├── frontend/                 # Frontend client workspace
│   └── index.html            # Unstyled HTML testing client (replaces test_client.html)
├── README.md                 # Project documentation
└── .gitignore                # Git ignore files
```

---

## Render Deployment Settings (Docker)

To deploy the backend to **Render.com** under the decoupled layout:

1. Create a new **Web Service** on Render and connect your GitHub repository.
2. Configure the following settings in your dashboard:
   - **Runtime:** `Docker`
   - **Root Directory:** `backend` (Setting this ensures frontend updates do not trigger backend rebuilds!)
   - **Dockerfile Path:** `Dockerfile` (Relative to the `backend` folder)
3. Add the following **Environment Variable** (under the Environment tab):
   - `GROQ_API_KEY`: *Your Groq Platform API key*
4. Render will compile your container using the `backend/` build context, isolating it from frontend changes, and expose your public API URL (e.g., `https://omnivault.onrender.com`).

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
3. Under **Scan Workspace**, input the project path and notes path (these can be the mock `/workspace/testing/project_code` inside Docker, or your local folder paths like `D:/Desktop/projects/OmniVault/backend/testing/project_code`).
4. Click **Execute Scan** to inspect the detected conceptual gaps.

---

## 👩‍💻 Notes for Diya (Frontend Integration)

Hi Diya! Since the production backend runs in the cloud (Render) and cannot access local drive paths directly, you should build the Vercel frontend to manage local file handles in the browser using the **File System Access API**. The backend has been made fully stateless to support this.

Here is how you should handle the files on the frontend:

### 1. Let the User Select Local Folders
Use `showDirectoryPicker()` to get directory handles for the codebase folder and notes folder:
```javascript
const projectHandle = await window.showDirectoryPicker();
const notesHandle = await window.showDirectoryPicker();
```

### 2. Read Files Recursively into JSON
Write a recursive utility in your frontend code to read all files in those directories into an array of `{ path, content }` objects:
```javascript
async function readFilesRecursively(dirHandle, relativePath = "") {
    let files = [];
    for await (const entry of dirHandle.values()) {
        const entryPath = relativePath ? `${relativePath}/${entry.name}` : entry.name;
        if (entry.kind === "file") {
            const file = await entry.getFile();
            const content = await file.text();
            files.push({ path: entryPath, content });
        } else if (entry.kind === "directory") {
            files.push(...(await readFilesRecursively(entry, entryPath)));
        }
    }
    return files;
}

// Example usage:
const codebaseFiles = await readFilesRecursively(projectHandle);
const notesFiles = await readFilesRecursively(notesHandle);
```

### 3. Send Stateless Payloads to the API

#### A. `/v1/scan` (POST)
Instead of sending paths, send the compiled file arrays in the JSON request body:
```json
{
  "project_files": [
    { "path": "main.py", "content": "import pandas..." },
    { "path": "package.json", "content": "{...}" }
  ],
  "notes_files": [
    { "path": "pandas.md", "content": "# Pandas overview..." }
  ]
}
```

#### B. `/v1/synthesize/save` (POST)
To save a note, call `/save` with `notes_path` set to `"in-memory"` (or omitted). The API will validate syntax and return the note content:
```json
{
  "notes_path": "in-memory",
  "filename": "numpy.md",
  "content": "--- \n title: Numpy... \n--- \n # Numpy Guide..."
}
```
**Writing back to disk:** When the API returns success, write the content to the user's local disk directly using your local notes directory handle:
```javascript
const fileHandle = await notesHandle.getFileHandle("numpy.md", { create: true });
const writable = await fileHandle.createWritable();
await writable.write(response.content);
await writable.close();
```

#### C. `/v1/quiz/generate` (POST) & `/v1/quiz/evaluate` (POST)
Pass the raw markdown note string under `note_content` to generate/evaluate statelessly:
- **Generate:** `{"note_content": "Raw markdown note body..."}`
- **Evaluate:**
  ```json
  {
    "note_content": "Raw markdown note body...",
    "question": "Explain X",
    "expected_concepts": ["concept1"],
    "user_answer": "My explanation..."
  }
  ```
  The API will evaluate the solution and return `"updated_frontmatter"`. You can then replace the frontmatter block of the local note and write the updated note back to the user's disk!
