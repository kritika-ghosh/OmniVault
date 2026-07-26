# 🎬 OmniVault AI — 2-Minute Hackathon Demo Script (120 Seconds)

A high-impact, fast-paced 2-minute presentation script designed for hackathon video submissions and live judge demos. Seamlessly combines live UI actions with deep backend AI highlights.

---

## ⏱️ Timeline & Agenda Overview

| Time | Scene | Primary Focus | AI / Technical Highlight |
| :--- | :--- | :--- | :--- |
| **0:00 - 0:20** | 1. Problem & Pure Note-Taking Mode | Hook & Obsidian Markdown Workspace | Dual-Mode Workspace Architecture |
| **0:20 - 0:45** | 2. Codebase Connection & Agent 1 AST Scan | Code Analyzer & Gap Analysis | **Agent 1: SmartGapDetector (Python `ast` & JS Regex Parsing)** |
| **0:45 - 1:15** | 3. 1-Click Auto-Synthesis & RAG Panel | Note Editor & SSE Stream | **Agent 2: CodebaseCrawler + ChromaDB Vector RAG + SSE Stream** |
| **1:15 - 1:45** | 4. Socratic Quiz Terminal & Sandbox | Code Execution Sandbox & AI Judge | **Agent 3: ActiveRecallJudge + Non-Blocking Missing Package Fallback** |
| **1:45 - 2:00** | 5. Global `Cmd+K` & Winning Vision | Command Palette & Wrap Up | Unified RAG Command Palette & Vision |

---

## 📜 Full Script Transcript & Visual Storyboard

### 🎬 Scene 1: The Problem & Pure Note-Taking Mode (0:00 - 0:20)

**[VISUAL ON SCREEN]**
- Screen shows OmniVault landing page with dark graph paper aesthetics and neon badges.
- Click **"Launch Workspace"**. The IDE opens directly into an Obsidian-style markdown workspace with note tree, editor, live preview, and node graph.

**[NARRATOR]**
> *"Developers write thousands of lines of code, but technical documentation is always out-of-sync or missing. Meet **OmniVault AI**—an autonomous knowledge vault that bridges local Obsidian markdown notes with real-world codebases."*
>
> *"OmniVault starts as a pure Markdown note-taking app where you can write notes, navigate WikiLinks, and explore your node graph."*

---

### 🎬 Scene 2: Codebase Connection & Agent 1 AST Gap Scan (0:20 - 0:45)

**[VISUAL ON SCREEN]**
- Click **"Code Analyzer"** in the sidebar. Select the `testing folder/pomodoro-app` codebase folder.
- Click **▶ ANALYZE CODEBASE GAPS**.
- Watch the workspace instantly transition to the **Gap Analysis Dashboard**, revealing **22 Knowledge Gaps** (`zustand`, `framer-motion`, `recharts`, `howler`, `useTimer`, etc.).

**[NARRATOR]**
> *"Now, let me connect our React Pomodoro codebase. When I click Analyze, **Agent 1: SmartGapDetector** wakes up. It parses Python AST syntax trees and JavaScript imports, extracts declared dependencies, and queries our embedded **ChromaDB Vector Store** to detect unmapped technical debt."*
>
> *"In seconds, OmniVault identified 22 unmapped codebase concepts that have zero documentation notes in our vault!"*

---

### 🎬 Scene 3: 1-Click Auto-Synthesis & Live RAG Panel (0:45 - 1:15)

**[VISUAL ON SCREEN]**
- Click **"Fill Gap"** on `zustand`.
- The Note Editor opens and **immediately begins streaming AI synthesis token-by-token**.
- Toggle the **`RAG Connections ⚡`** panel in the editor header. Slide-out sidebar displays ChromaDB vector similarity scores (`94% Similarity`) and incoming `[[WikiLinks]]`.

**[NARRATOR]**
> *"Watch what happens when I click **Fill Gap** on `zustand`. OmniVault opens the editor and automatically streams AI synthesis token-by-token using FastAPI Server-Sent Events."*
>
> *"Behind the scenes, **Agent 2: CodebaseCrawler** scans our repository files, extracts actual function definitions and 5-line implementation snippets, and feeds them directly into LiteLLM.*
>
> *"And check out this **Live RAG Connections Panel**—it queries ChromaDB in real time using cosine similarity vector math, showing exact percentage matches and incoming backlinks!"*

---

### 🎬 Scene 4: Socratic Quiz & Sandbox Execution (1:15 - 1:45)

**[VISUAL ON SCREEN]**
- Click **"Study Hub"** -> **"Take Quiz"**.
- Open a Python Polynomial Regression quiz. Write a Python function `def predict_next_number(previous_numbers): ... return float(next_number)`.
- Click **Evaluate Solution**.
- Show the green **CHALLENGE MASTERED! (Similarity Score: 100%)** banner, along with the **PASSED (Conceptually Verified)** sandbox test cases.

**[NARRATOR]**
> *"To ensure long-term retention, OmniVault features an interactive Socratic Spaced-Repetition engine.*
>
> *"Here, **Agent 3: ActiveRecallJudge** executes my submitted code inside an isolated subprocess. Our **Smart Function Harness** automatically invokes my function with test inputs.*
>
> *"And if a package like `sklearn` isn't pre-installed on the host runtime, our **Non-Blocking Missing Package Engine** detects the module error, evaluates my logic conceptually, and awards a 100% Mastered score!"*

---

### 🎬 Scene 5: Global `Cmd+K` & Winning Vision (1:45 - 2:00)

**[VISUAL ON SCREEN]**
- Press **`Cmd+K` / `Ctrl+K`**.
- The RAG Command Palette appears. Type `recharts`. Instantly view vector matches across notes, gaps, and code files.
- Press `Enter` to open.

**[NARRATOR]**
> *"Finally, press **Cmd+K** anywhere to open our global RAG Command Palette for instant semantic search across your entire vault and codebase.*
>
> *"OmniVault AI: Turning undocumented codebases into living, intelligent knowledge vaults. Thank you!"*

---

## 🏆 Key Hackathon Callout Checklist for Presenters

- **AST & Import Analysis**: Mention native Python `ast` syntax tree parsing and JS import regex scanning.
- **3-Agent Orchestration**: Highlight Agent 1 (Gap Detector), Agent 2 (Codebase Crawler & Synthesizer), and Agent 3 (Socratic Recall Judge).
- **ChromaDB Vector RAG**: Mention Cosine Similarity vector math ($\text{Similarity \%} = \max(0, 1 - d) \times 100$).
- **FastAPI SSE Streaming**: Token-by-token streaming using Server-Sent Events (`/v1/synthesize/stream`).
- **Subprocess Execution Harness & Fallback**: Isolated code sandbox with smart function invocation and missing module detection (`is_missing_module`).

---

## 🎨 Frontend Technologies & UI/UX Highlights

- **Next.js & React 18 Architecture**: Blazing fast Server-Side Rendering (SSR) combined with robust client-side interactivity.
- **Dockview Window Management**: A professional IDE-grade, fully resizable, and dockable multi-tab layout that allows you to snap notes, gap dashboards, node graphs, and quizzes side-by-side.
- **Interactive Scrollytelling**: High-conversion landing page leveraging `framer-motion` for scroll-triggered animations and dynamic step-by-step IDE visualizations.
- **Tailwind CSS & Glassmorphism**: Premium "Dark Graph Paper" aesthetic with custom neon accents, smooth gradients, and glassmorphic panels for a state-of-the-art cyberpunk feel.
- **Force-Directed Node Graphs**: Dynamic 2D and WebGL 3D knowledge graph visualizers (`react-force-graph`) mapped natively to markdown WikiLinks and gap reports.
- **Micro-Animations & Responsive State**: Intelligent Flexbox grids and micro-interactions that gracefully adapt (e.g., toolbars wrapping dynamically when squeezed into compact dock panels) ensuring an unbreakable UI.


**[VISUAL ON SCREEN]**
- Pan across the workspace demonstrating the **Dockview Window Management**. Drag and drop the Note Editor tab to snap it side-by-side with the Node Graph and Gap Dashboard.
- Open the local folder picker to demonstrate the **Native Browser File System API** securely reading local files.
- Fast scroll through the landing page to trigger the **Framer-Motion scrollytelling** animations and dynamic step-by-step visualizations.
- Hover over various UI elements to show the intelligent micro-animations, glassmorphic overlays, and neon Tailwind CSS accents.
- Type in the markdown editor to show the **Custom Markdown Engine** rendering syntax-highlighted code blocks and native `[[WikiLinks]]` in real-time.
**[NARRATOR]**
> *"None of this AI power would matter without an unbreakable, premium user experience. Our frontend is built on the **Next.js App Router** for blazing fast performance, styled with a custom dark graph-paper aesthetic using Tailwind CSS and Shadcn UI."*
>
> *"We engineered a fully resizable, IDE-grade dockable layout so developers can arrange their workspace exactly how they want it. It's incredibly responsive, ensuring toolbars wrap gracefully even in compact split-panes."*
>
> *"And because privacy is paramount, we use the cutting-edge **File System Access API** to read your local codebase directly in memory. Absolutely zero files are ever uploaded to a cloud server—it is completely local-first and secure."*