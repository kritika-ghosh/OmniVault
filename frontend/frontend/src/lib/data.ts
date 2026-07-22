import { ScanResponse, FilePayload } from "./file-directory";

export const mockScanResponse: ScanResponse = {
  status: "success",
  total_terms_scanned: 12,
  gaps_found: 3,
  report: [
    {
      term: "PyTorch",
      classification: "critical_gap",
      reason: "GPU-accelerated tensors and neural network modules are imported in 'model_trainer.py' but no reference notebook note is documented.",
      detected_from: ["model_trainer.py", "requirements.txt"]
    },
    {
      term: "ChromaDB",
      classification: "critical_gap",
      reason: "AI-native vector store database client is initialized in 'embedding_search.py' but completely missing from your notes vault.",
      detected_from: ["embedding_search.py", "requirements.txt"]
    },
    {
      term: "Matplotlib",
      classification: "review_suggested",
      reason: "Plotting and data visualization library imported in 'visualizer.py'. The note exists but has a high memory decay score and needs active recall review.",
      detected_from: ["visualizer.py", "requirements.txt"]
    }
  ]
};

export const mockNotesFiles: FilePayload[] = [
  {
    path: "dockview.md",
    content: `---
title: Dockview Tabs & IDE Panels
tags: [javascript, layout, dockview]
created: 2026-07-22
confidence_level: 0.95
last_reviewed: 1 day ago
decay_score: 0.08 (Excellent)
---

# Dockview Layout Rendering Framework

High-performance tabbing, docking, and split-pane workspace layout engine.

## Learning Objectives :-
- ↳ Discuss dynamic pane serialization and viewport sizing constraints.
- ↳ Learn programmatic panel creation using \`api.addPanel()\` and custom React components.
- ↳ Apply responsive grid-resizing callbacks and sash border custom styling variables.

## Code Exercise Sample :-
\`\`\`javascript
import { DockviewReact } from "dockview-react";

// Initialize a workspace IDE structure
const onReady = (event) => {
  event.api.addPanel({
    id: "scan",
    component: "scan",
    title: "Scan Workspace"
  });
};
\`\`\`
`
  },
  {
    path: "typescript.md",
    content: `---
title: TypeScript Type Safety
tags: [javascript, types, typescript]
created: 2026-07-22
confidence_level: 0.90
last_reviewed: Yesterday
decay_score: 0.12 (Excellent)
---

# TypeScript Reference

Static type checking layer for JavaScript projects.

## Learning Objectives :-
- ↳ Analyze structural typing contracts vs nominal type definitions.
- ↳ Understand union types, intersection interfaces, and generic mapper functions.
- ↳ Apply utility modifiers like Pick<T>, Record<K, T>, and partial parameter typing.
`
  },
  {
    path: "pandas.md",
    content: `---
title: Pandas DataFrames
tags: [python, data, pandas]
created: 2026-07-22
confidence_level: 0.85
last_reviewed: 3 days ago
decay_score: 0.22 (Good)
---

# Pandas Data Analysis Reference

High-performance data structures for manipulating tabular data in Python.

## Learning Objectives :-
- ↳ Analyse the concept of DataFrame structures and manipulate tabular data.
- ↳ Learn cleaning operations like \`dropna()\`, \`fillna()\`, and \`groupby()\` aggregations.
- ↳ Apply \`read_csv()\` to ingest project dataset files into memory.

## Code Exercise Sample :-
\`\`\`python
import pandas as pd

df = pd.read_csv("data.csv")
summary = df.dropna().groupby("category").mean()
print(summary)
\`\`\`
`
  },
  {
    path: "fastapi.md",
    content: `---
title: FastAPI Web Services
tags: [python, web, fastapi]
created: 2026-07-22
confidence_level: 0.90
last_reviewed: Yesterday
decay_score: 0.15 (Excellent)
---

# FastAPI Guide

FastAPI is a modern web framework for building APIs with Python based on standard type hints.

## Learning Objectives :-
- ↳ Discuss async endpoint routing for high-throughput API microservices.
- ↳ Apply Pydantic schemas for automatic request data validation.
- ↳ Explain OpenAPI documentation generation for endpoint schemas.

## Code Exercise Sample :-
\`\`\`python
from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI()

class User(BaseModel):
    id: int
    name: str

@app.get("/users/{user_id}")
async def get_user(user_id: int):
    return {"id": user_id, "name": "OmniUser"}
\`\`\`
`
  },
  {
    path: "matplotlib.md",
    content: `---
title: Matplotlib Visualizations
tags: [python, plots, matplotlib]
created: 2026-07-22
confidence_level: 0.35
last_reviewed: 2 weeks ago
decay_score: 0.78 (Review Priority)
---

# Matplotlib Reference

Plotting and data visualization library for Python.

## Learning Objectives :-
- ↳ State coordinate projection mechanics and figure sizing principles.
- ↳ Apply subplot layouts for multi-axis chart grids.
- ↳ Customize markers, gridlines, and canvas output paths.

## Code Exercise Sample :-
\`\`\`python
import matplotlib.pyplot as plt

fig, ax = plt.subplots(figsize=(6, 4))
ax.plot([1, 2, 3], [10, 20, 15], marker="o")
ax.set_title("Training Loss Curve")
plt.savefig("loss_curve.png")
\`\`\`
`
  },
  {
    path: "numpy.md",
    content: `---
title: NumPy Arrays
tags: [python, matrix, numpy]
created: 2026-07-22
confidence_level: 0.70
last_reviewed: 5 days ago
decay_score: 0.40 (Good)
---

# NumPy Reference

NumPy provides fast N-dimensional array processing and matrix computations.

## Learning Objectives :-
- ↳ Learn vectorized operations without explicit python loops.
- ↳ Understand axis-based functions and broadcasting constraints.
- ↳ Manipulate slice notations on multi-dimensional array structures.

## Code Exercise Sample :-
\`\`\`python
import numpy as np

matrix = np.array([[1, 2], [3, 4]])
scaled = matrix * 2.5
column_mean = np.mean(scaled, axis=0)
print(column_mean)
\`\`\`
`
  },
  {
    path: "react.md",
    content: `---
title: React Framework
tags: [javascript, frontend, react]
created: 2026-07-22
confidence_level: 0.75
last_reviewed: 4 days ago
decay_score: 0.32 (Good)
---

# React UI Development

Component-based UI construction library.

## Learning Objectives :-
- ↳ Explain fiber reconciliation algorithm and virtual DOM diffing.
- ↳ Manage functional hook lifecycles and react state dependencies.
- ↳ Construct decoupled, reusable UI modules.
`
  }
];

export const mockSortedTerms: string[] = [
  "PyTorch",
  "ChromaDB",
  "Matplotlib",
  "numpy",
  "pandas",
  "fastapi",
  "react",
  "dockview",
  "typescript"
];
