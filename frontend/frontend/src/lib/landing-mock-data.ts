export interface ConceptData {
  term: string;
  category: string;
  description: string;
  codeSnippet: string;
  objectives: string[];
  frontmatter: string;
  markdown: string;
  quizQuestion: string;
  quizPrefix: string;
  defaultAnswer: string;
  expectedKeyword: string;
}

export const PLAYGROUND_DATA: Record<string, ConceptData> = {
  pandas: {
    term: "Pandas",
    category: "Data Analysis",
    description: "Tabular data structures and DataFrame manipulation.",
    codeSnippet: `import pandas as pd\nimport numpy as np\n\ndf = pd.read_csv("data.csv")\nsummary = df.dropna().groupby("category").mean()`,
    objectives: [
      "Analyse the concept of DataFrame structures and manipulate tabular data.",
      "Learn cleaning operations like dropna(), fillna(), and groupby() aggregations.",
      "Apply read_csv() to ingest project dataset files into memory.",
    ],
    frontmatter: `title: Pandas DataFrames
tags: [python, data, pandas]
created: 2026-07-22
confidence_level: 0.85
last_reviewed: 3 days ago
decay_score: 0.22 (Good)`,
    markdown: `# Pandas Data Analysis Reference

High-performance data structures for manipulating tabular data in Python.

## Core Operations
- \`pd.read_csv()\`: Read CSV into DataFrame.
- \`df.dropna()\`: Remove missing values.
- \`df.groupby()\`: Group Series/DataFrame columns.`,
    quizQuestion: "Which Pandas function reads a CSV file into a DataFrame?",
    quizPrefix: "import pandas as pd\ndf = ",
    defaultAnswer: "pd.read_csv('data.csv')",
    expectedKeyword: "read_csv",
  },
  pytorch: {
    term: "PyTorch",
    category: "Deep Learning",
    description: "GPU-accelerated tensors and neural network graphs.",
    codeSnippet: `import torch\nimport torch.nn as nn\n\nmodel = nn.Linear(10, 2)\noutput = model(torch.randn(1, 10))`,
    objectives: [
      "Analyse dynamic neural network modules using nn.Module.",
      "Understand tensor operations with automatic CUDA GPU acceleration.",
      "State Autograd principles for automatic gradient computation.",
    ],
    frontmatter: `title: PyTorch Deep Learning
tags: [python, ml, pytorch]
created: 2026-07-22
confidence_level: 0.20
last_reviewed: Never
decay_score: 0.90 (Critical)`,
    markdown: `# PyTorch Deep Learning Reference

PyTorch provides dynamic computation graphs and GPU acceleration for deep learning models.

## Core Core Components
- **Tensor**: N-dimensional array with CUDA support.
- **nn.Module**: Base class for all neural network modules.`,
    quizQuestion: "Which PyTorch base class should custom neural network modules inherit from?",
    quizPrefix: "import torch.nn as nn\nclass MyModel(",
    defaultAnswer: "nn.Module",
    expectedKeyword: "nn.Module",
  },
  fastapi: {
    term: "FastAPI",
    category: "Async Web API",
    description: "Modern high-performance Web API framework for Python.",
    codeSnippet: `from fastapi import FastAPI\n\napp = FastAPI(title="OmniVault API")\n\n@app.get("/")\ndef read_root():\n    return {"status": "ok"}`,
    objectives: [
      "Discuss async endpoint routing for high-throughput API microservices.",
      "Apply Pydantic schemas for automatic request data validation.",
      "Explain OpenAPI documentation generation for endpoint schemas.",
    ],
    frontmatter: `title: FastAPI Web Services
tags: [python, web, fastapi]
created: 2026-07-22
confidence_level: 0.80
last_reviewed: Yesterday
decay_score: 0.25 (Good)`,
    markdown: `# FastAPI Guide

FastAPI is a modern web framework for building APIs with Python based on standard type hints.

## Core Features
- **Fast**: High performance on Node/Go level.
- **Pydantic Validation**: Automatic request body parsing.`,
    quizQuestion: "What decorator defines a HTTP GET endpoint in FastAPI?",
    quizPrefix: "app = FastAPI()\n\n# Define GET endpoint at '/api'\n",
    defaultAnswer: "@app.get('/api')",
    expectedKeyword: "@app.get",
  },
  chromadb: {
    term: "ChromaDB",
    category: "Vector Store",
    description: "AI-native vector database for LLM embeddings and RAG.",
    codeSnippet: `import chromadb\n\nclient = chromadb.Client()\ncollection = client.create_collection("docs")\ncollection.add(documents=["content"], ids=["1"])`,
    objectives: [
      "Explore vector database indexing for LLM retrieval-augmented generation.",
      "Learn embedding collection management and distance metric querying.",
      "Apply document insertion and vector similarity search operations.",
    ],
    frontmatter: `title: ChromaDB Vector Database
tags: [ai, vector, chromadb]
created: 2026-07-22
confidence_level: 0.15
last_reviewed: Never
decay_score: 0.95 (Critical)`,
    markdown: `# ChromaDB Vector Store Reference

ChromaDB is an embedding database for building AI applications with RAG.

## Core Functions
- \`collection.add()\`: Add documents and embeddings.
- \`collection.query()\`: Search for nearest neighbors.`,
    quizQuestion: "What method on a ChromaDB collection is used to insert documents?",
    quizPrefix: "collection = client.create_collection('docs')\n# Add items\ncollection.",
    defaultAnswer: "add(documents=['data'], ids=['id1'])",
    expectedKeyword: "add",
  },
};

export interface FAQItem {
  q: string;
  a: string;
}

export const FAQ_ITEMS: FAQItem[] = [
  {
    q: "How does OmniVault read local files without uploading them to the cloud?",
    a: "OmniVault relies on the browser's native File System Access API (`showDirectoryPicker()`). Directory handles remain local inside your web browser memory. File content is parsed on-demand and sent statelessly to the API engine only during scans.",
  },
  {
    q: "Can I use OmniVault with my local FastAPI backend?",
    a: "Yes! OmniVault includes a base URL switcher in the top bar. You can set the host to `http://localhost:8000` when running locally, or `https://omnivault.onrender.com` when using the cloud container.",
  },
  {
    q: "What markdown format does OmniVault generate for notes?",
    a: "Standard Markdown (`.md`) with YAML frontmatter metadata (`tags`, `confidence_level`, `last_reviewed`, `decay_score`). Compatible with Obsidian, VS Code, and Logseq.",
  },
  {
    q: "How does active recall scoring work on local markdown files?",
    a: "OmniVault uses an Ebbinghaus memory decay algorithm. Taking active recall quizzes evaluates technical accuracy and auto-updates the note's frontmatter confidence rating directly on your local disk.",
  },
];
