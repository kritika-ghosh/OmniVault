"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Scan,
  Sparkles,
  GraduationCap,
  Network,
  Cpu,
  ShieldCheck,
  Zap,
  ArrowRight,
  CheckCircle2,
  Play,
  ChevronDown,
  Terminal,
  Layers,
  RefreshCw,
  Clock,
  Code2,
  Globe,
  FileText,
  Check,
  Maximize2,
  RotateCcw,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// Unified technical concepts dataset for the playground
const PLAYGROUND_DATA: Record<
  string,
  {
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
> = {
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

export default function LandingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  // Hero Section Showcase Tab State
  const [heroTab, setHeroTab] = useState<"scan" | "editor" | "graph" | "quiz">("scan");

  // Typewriter Hero Animation State
  const phrases = [
    "Markdown Vault Notes",
    "AST Import Gaps",
    "Evolving Roadmaps",
    "Active Recall Sheets",
  ];
  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0);
  const [typedText, setTypedText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    const currentPhrase = phrases[currentPhraseIndex];
    
    if (isDeleting) {
      timer = setTimeout(() => {
        setTypedText(currentPhrase.substring(0, typedText.length - 1));
      }, 35);
    } else {
      timer = setTimeout(() => {
        setTypedText(currentPhrase.substring(0, typedText.length + 1));
      }, 75);
    }

    if (!isDeleting && typedText === currentPhrase) {
      timer = setTimeout(() => setIsDeleting(true), 2000);
    } else if (isDeleting && typedText === "") {
      setIsDeleting(false);
      setCurrentPhraseIndex((prev) => (prev + 1) % phrases.length);
    }

    return () => clearTimeout(timer);
  }, [typedText, isDeleting, currentPhraseIndex]);

  // Playground Demo State
  const [activeKey, setActiveKey] = useState<string>("pandas");
  const [activeNoteTab, setActiveNoteTab] = useState<"md" | "yaml">("md");
  
  // Interactive Simulation Steps
  const [isScanning, setIsScanning] = useState(false);
  const [scannedDone, setScannedDone] = useState(true); // default to scanned for instant visual usability
  const [scanLogs, setScanLogs] = useState<string[]>([]);
  
  // Typewriter notes streaming state
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [streamedText, setStreamedText] = useState("");
  
  // Quiz inputs & scoring
  const [quizInput, setQuizInput] = useState("");
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [quizResult, setQuizResult] = useState<{ score: number; passed: boolean; feedback: string } | null>(null);

  const concept = PLAYGROUND_DATA[activeKey] || PLAYGROUND_DATA["pandas"];

  // Initialize quiz input on load and activeKey change
  useEffect(() => {
    setQuizInput(concept.defaultAnswer);
    setQuizResult(null);
    setStreamedText("");
  }, [activeKey, concept]);

  // Concept Chip Switcher
  const handleSelectConcept = (key: string) => {
    setActiveKey(key);
  };

  // Run Simulated Scan with Logs
  const handleRunScan = () => {
    setIsScanning(true);
    setScannedDone(false);
    setScanLogs(["Reading workspace files...", "AST parser loading modules..."]);
    
    setTimeout(() => {
      setScanLogs((prev) => [
        ...prev,
        `Detected package imports: ${Object.values(PLAYGROUND_DATA).map(c => c.term.toLowerCase()).join(", ")}`,
        "Comparing with notes directory...",
        "Scan analysis completed!"
      ]);
      setIsScanning(false);
      setScannedDone(true);
    }, 1200);
  };

  // Typewriter Note Synthesizer Stream Animation
  const handleStreamSynthesize = () => {
    setIsSynthesizing(true);
    setStreamedText("");
    const targetText = concept.markdown;
    let idx = 0;
    
    const timer = setInterval(() => {
      if (idx < targetText.length) {
        setStreamedText(targetText.slice(0, idx + 15));
        idx += 15;
      } else {
        setStreamedText(targetText);
        setIsSynthesizing(false);
        clearInterval(timer);
      }
    }, 20);
  };

  // Evaluate Quiz Solution
  const handleEvaluateQuiz = () => {
    setIsEvaluating(true);
    setQuizResult(null);

    setTimeout(() => {
      const isCorrect = quizInput.toLowerCase().includes(concept.expectedKeyword.toLowerCase());
      setQuizResult({
        score: isCorrect ? 95 : 40,
        passed: isCorrect,
        feedback: isCorrect
          ? `Correct! Found keyword '${concept.expectedKeyword}'. Patched frontmatter confidence: 0.35 -> 0.85!`
          : `Under review. Expected function keyword '${concept.expectedKeyword}'. Review note and retry.`,
      });
      setIsEvaluating(false);
    }, 800);
  };

  const faqs = [
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

  return (
    <div className="min-h-screen bg-graph-paper text-foreground flex flex-col font-sans select-none overflow-x-hidden antialiased">
      {/* TOP NAVIGATION BAR */}
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-15 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-accent/20 border border-accent/30 flex items-center justify-center text-accent font-mono font-bold text-xs group-hover:scale-105 transition-transform">
              OV
            </div>
            <span className="font-extrabold text-sm tracking-tight text-foreground flex items-center gap-1.5 font-handwriting text-lg">
              OmniVault <span className="text-[11px] font-mono px-1.5 py-0.2 rounded bg-muted text-accent border border-accent/30">Vault 1.0</span>
            </span>
          </Link>

          {/* Nav Links */}
          <nav className="hidden md:flex items-center gap-8 text-xs font-mono text-muted-foreground">
            <a href="#playground" className="hover:text-foreground transition-colors">
              Playground
            </a>
            <a href="#architecture" className="hover:text-foreground transition-colors">
              3-Agent System
            </a>
            <a href="#features" className="hover:text-foreground transition-colors">
              Features
            </a>
            <a href="#faq" className="hover:text-foreground transition-colors">
              FAQ
            </a>
          </nav>

          {/* Action CTAs */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-[#af547b]/10 border border-[#af547b]/30 text-[11px] font-mono text-accent">
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              Vault Active
            </div>

            <Link href="/workspace">
              <Button className="bg-accent hover:bg-accent/90 text-white font-bold text-xs h-9 px-5 rounded-lg transition-all cursor-pointer flex items-center gap-2 font-mono">
                <span>Launch Workspace</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="relative z-10 pt-20 pb-16 px-6 max-w-6xl mx-auto text-center flex flex-col items-center">
        {/* Notebook Title Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-card border border-border text-xs font-mono text-primary mb-8 shadow-lg">
          <BookOpen className="w-4 h-4 text-primary" />
          <span>Local-First Markdown Vault & AST Scanner</span>
        </div>

        {/* Hero Title */}
        <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-foreground leading-[1.2] mb-6 font-sans">
          Bridge Codebase Dependencies with Personal{" "}
          <span className="font-handwriting text-accent notebook-underline text-5xl sm:text-7xl inline-block px-1 min-w-[320px]">
            {typedText}
            <span className="animate-pulse ml-0.5 select-none font-sans font-normal text-3xl sm:text-5xl text-accent">|</span>
          </span>
        </h1>

        {/* Description */}
        <p className="text-sm sm:text-base text-muted-foreground max-w-2xl leading-relaxed mb-10 font-sans">
          OmniVault automatically parses python/JS import dependencies, identifies documentation gaps, synthesizes Markdown guides, and schedules context-aware active recall quizzes.
        </p>

        {/* Hero Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto mb-16">
          <Link href="/workspace" className="w-full sm:w-auto">
            <Button className="w-full sm:w-auto h-12 px-8 bg-accent hover:bg-accent/90 text-white font-bold text-sm rounded-lg shadow-xl shadow-accent/20 transition-all hover:scale-105 cursor-pointer flex items-center justify-center gap-2 font-mono">
              <Zap className="w-4 h-4 fill-current" />
              <span>Open Full Workspace IDE</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>

          <a href="#playground" className="w-full sm:w-auto">
            <Button variant="outline" className="w-full sm:w-auto h-12 px-7 border-border bg-card hover:bg-muted text-foreground font-semibold text-sm rounded-lg transition-all cursor-pointer flex items-center justify-center gap-2 font-mono">
              <Play className="w-3.5 h-3.5 text-primary fill-primary/20" />
              <span>Explore Interactive Playground</span>
            </Button>
          </a>
        </div>

        {/* HERO MOCK IDE PREVIEW */}
        <div className="w-full max-w-5xl rounded-2xl border border-border bg-graph-paper-dense shadow-2xl overflow-hidden text-left flex flex-col mb-12">
          {/* Titlebar */}
          <div className="px-4 py-3 bg-muted border-b border-border flex items-center justify-between text-xs font-mono text-muted-foreground">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-destructive/80 inline-block" />
              <span className="w-3 h-3 rounded-full bg-accent/80 inline-block" />
              <span className="w-3 h-3 rounded-full bg-primary/80 inline-block" />
              <span className="ml-2 font-handwriting text-base text-foreground font-bold">omnivault_active_recall_notes.md</span>
            </div>
            <span className="text-[11px] text-primary font-bold">GRID VAULT CANVAS</span>
          </div>

          {/* Split Page View */}
          <div className="grid grid-cols-1 md:grid-cols-2 text-left relative min-h-[380px]">
            <div className="hidden md:block absolute top-0 bottom-0 left-1/2 -ml-[1px] w-[2px] bg-border border-r border-dashed border-border/60 z-10 pointer-events-none" />

            {/* Left Page */}
            <div className="p-8 space-y-6 bg-graph-paper font-handwriting text-foreground text-base leading-snug">
              <div>
                <h2 className="text-xl font-bold text-foreground notebook-underline inline-block mb-3">
                  Learning objectives :-
                </h2>
                <ul className="space-y-2 text-sm text-foreground/90">
                  <li className="flex items-start gap-2">
                    <span className="text-accent text-lg font-bold">↳</span>
                    <span>Analyse the concept of AST import dependencies and demonstrate coverage gaps in vault notes.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-accent text-lg font-bold">↳</span>
                    <span>Discuss technical guides around pandas, pytorch, fastapi, and vector databases. Apply 1-click note synthesis.</span>
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-bold text-foreground notebook-underline inline-block mb-2">
                  Identifying documentation gaps - ACTIVITY
                </h3>
                <div className="text-xs font-mono space-y-1 bg-background p-3 rounded-lg border border-border text-foreground/80 mt-1">
                  <div>• Project Files: main.py, model.py, requirements.txt</div>
                  <div>• Detected Imports: pandas, torch, fastapi</div>
                  <div className="text-accent font-bold">• Gap Identified: 'PyTorch' note missing from vault</div>
                </div>
              </div>
            </div>

            {/* Right Page */}
            <div className="p-8 space-y-6 bg-graph-paper font-handwriting text-foreground text-base leading-snug">
              <div>
                <h3 className="text-lg font-bold text-foreground notebook-underline inline-block mb-2">
                  Documented Vault Materials :-
                </h3>
                <p className="text-sm text-foreground/80">
                  The technical notes which get saved to your local disk.
                </p>
                <p className="text-xs font-mono text-primary mt-1 bg-background p-2 rounded border border-border">
                  Example :- pandas.md, fastapi.md, numpy.md
                </p>
              </div>

              <div>
                <h3 className="text-lg font-bold text-foreground notebook-underline inline-block mb-2">
                  Non-documented gaps :-
                </h3>
                <p className="text-sm text-foreground/80">
                  The missing concepts which need automated synthesis.
                </p>
                <p className="text-xs font-mono text-accent mt-1 bg-background p-2 rounded border border-border">
                  Example :- pytorch.md, chromadb.md
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PLAYGROUND */}
      <section id="playground" className="relative z-10 py-16 px-6 max-w-7xl mx-auto w-full">
        <div className="text-center mb-10 space-y-2">
          <div className="text-xs font-mono text-accent uppercase tracking-widest">
            INTERACTIVE PLAYGROUND
          </div>
          <h2 className="text-3xl font-extrabold text-foreground tracking-tight font-sans">
            Try the Vault Notebook Engine Live
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-xl mx-auto">
            Select a topic tab, execute the AST scan, stream synthesized notes, and evaluate your active recall answers live!
          </p>
        </div>

        {/* Notebook Concept Selector Tabs */}
        <div className="flex flex-wrap items-center justify-center gap-3 mb-8 font-mono">
          {Object.keys(PLAYGROUND_DATA).map((key) => {
            const isActive = activeKey === key;
            const item = PLAYGROUND_DATA[key];
            return (
              <button
                key={key}
                onClick={() => handleSelectConcept(key)}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                  isActive
                    ? "bg-[#6e346b] text-white shadow-lg shadow-[#6e346b]/20 text-base"
                    : "bg-card text-foreground hover:text-primary border border-border"
                }`}
              >
                <span>{item.term.toUpperCase()}</span>
                <span className="text-[10px] opacity-85">({key === "pandas" || key === "fastapi" ? "SAVED" : "GAP"})</span>
              </button>
            );
          })}
        </div>

        {/* Interactive Notebook Split Canvas */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* COLUMN 1 */}
          <div className="p-6 rounded-2xl bg-graph-paper border border-border flex flex-col justify-between space-y-4 shadow-xl">
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-primary" />
                  <h3 className="text-lg font-bold font-handwriting text-foreground">Notebook Objectives</h3>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/30">
                  PAGE 01
                </span>
              </div>

              <div className="font-handwriting space-y-2">
                <h4 className="text-base font-bold text-foreground notebook-underline">
                  {concept.term} Objectives :-
                </h4>
                <ul className="space-y-1.5 text-sm text-foreground/90">
                  {concept.objectives.map((obj, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-accent font-bold">↳</span>
                      <span>{obj}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono text-muted-foreground">AST Code Snippet:</label>
                <pre className="p-3 rounded-xl bg-background border border-border text-xs font-mono text-primary overflow-x-auto">
                  {concept.codeSnippet}
                </pre>
              </div>
            </div>

            <div className="space-y-2 font-mono">
              {isScanning && (
                <div className="p-3 rounded-xl bg-background border border-border text-[10px] text-muted-foreground space-y-0.5">
                  {scanLogs.map((log, i) => (
                    <div key={i} className="animate-fade-in">&gt; {log}</div>
                  ))}
                </div>
              )}
              
              <Button
                onClick={handleRunScan}
                disabled={isScanning}
                className="w-full bg-card hover:bg-muted text-primary font-bold text-xs h-9 rounded-xl border border-border cursor-pointer flex items-center justify-center gap-2"
              >
                {isScanning ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Scanning AST Vault...
                  </>
                ) : (
                  <>
                    <Scan className="w-3.5 h-3.5" /> Execute AST Scan
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* COLUMN 2 */}
          <div className="p-6 rounded-2xl bg-graph-paper border border-border flex flex-col justify-between space-y-4 shadow-xl">
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  <h3 className="text-lg font-bold font-handwriting text-foreground">Synthesized Note</h3>
                </div>
                
                <div className="flex gap-1 bg-background p-1 rounded border border-border font-mono">
                  <button
                    onClick={() => setActiveNoteTab("md")}
                    className={`px-2 py-0.5 text-[9px] rounded ${activeNoteTab === "md" ? "bg-accent/20 text-accent font-bold" : "text-muted-foreground"}`}
                  >
                    MD
                  </button>
                  <button
                    onClick={() => setActiveNoteTab("yaml")}
                    className={`px-2 py-0.5 text-[9px] rounded ${activeNoteTab === "yaml" ? "bg-accent/20 text-accent font-bold" : "text-muted-foreground"}`}
                  >
                    YAML
                  </button>
                </div>
              </div>

              {activeNoteTab === "md" ? (
                <div className="p-3 rounded-xl bg-background border border-border text-xs font-mono text-foreground whitespace-pre-wrap min-h-[220px] max-h-[240px] overflow-y-auto leading-relaxed">
                  {streamedText || concept.markdown}
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-background border border-border text-xs font-mono text-primary whitespace-pre-wrap min-h-[220px] max-h-[240px] overflow-y-auto">
                  <div className="text-muted-foreground/60">---</div>
                  {concept.frontmatter}
                  <div className="text-muted-foreground/60">---</div>
                </div>
              )}
            </div>

            <Button
              onClick={handleStreamSynthesize}
              disabled={isSynthesizing}
              className="w-full bg-accent/10 hover:bg-accent/20 text-accent font-mono font-bold text-xs h-9 rounded-xl border border-accent/30 cursor-pointer flex items-center justify-center gap-2"
            >
              {isSynthesizing ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Streaming Note...
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" /> Stream Synthesize Note Guide
                </>
              )}
            </Button>
          </div>

          {/* COLUMN 3 */}
          <div className="p-6 rounded-2xl bg-graph-paper border border-border flex flex-col justify-between space-y-4 shadow-xl">
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-primary" />
                  <h3 className="text-lg font-bold font-handwriting text-foreground">Quiz Exercise Sheet</h3>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/30">
                  PAGE 03
                </span>
              </div>

              <div className="space-y-2 font-handwriting">
                <h4 className="text-base font-bold text-foreground notebook-underline">Question Activity :-</h4>
                <p className="text-sm text-foreground/90">{concept.quizQuestion}</p>
              </div>

              <div className="p-3 rounded-xl bg-background border border-border text-xs font-mono space-y-2">
                <div className="text-muted-foreground">{concept.quizPrefix}</div>
                <input
                  type="text"
                  value={quizInput}
                  onChange={(e) => setQuizInput(e.target.value)}
                  className="w-full bg-card border border-border rounded px-2.5 py-1.5 text-xs text-primary font-mono focus:outline-none focus:border-primary"
                />
              </div>

              {/* Quiz Evaluated Results View */}
              {isEvaluating ? (
                <div className="p-3 rounded-xl bg-background border border-border text-xs font-mono text-muted-foreground flex items-center justify-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Evaluating solution payload...
                </div>
              ) : (
                quizResult && (
                  <div className="p-3 rounded-xl bg-background border border-border text-xs font-mono space-y-1 animate-in fade-in">
                    <div className={quizResult.passed ? "text-primary font-bold" : "text-accent font-bold"}>
                      {quizResult.passed ? "✓ Quiz Solution Passed (Score: 95%)" : "⚠ Solution Review Recommended"}
                    </div>
                    <p className="text-foreground/90 font-handwriting text-sm mt-1">
                      {quizResult.feedback}
                    </p>
                  </div>
                )
              )}
            </div>

            <Button
              onClick={handleEvaluateQuiz}
              disabled={isEvaluating}
              className="w-full bg-accent hover:bg-accent/90 text-white font-bold font-mono text-xs h-9 rounded-xl cursor-pointer flex items-center justify-center gap-2"
            >
              <Terminal className="w-4 h-4" /> Evaluate Solution & Patch Note
            </Button>
          </div>

        </div>
      </section>

      {/* 3-AGENT ARCHITECTURE SUMMARY */}
      <section id="architecture" className="relative z-10 py-16 px-6 max-w-7xl mx-auto w-full border-t border-border">
        <div className="text-center mb-12 space-y-2">
          <div className="text-xs font-mono text-accent uppercase tracking-widest">
            DECOUPLED AGENT SYSTEM
          </div>
          <h2 className="text-3xl font-extrabold text-foreground tracking-tight font-sans">
            Three Specialized Autonomous Agents
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-card border border-border space-y-3">
            <Scan className="w-8 h-8 text-[#af547b]" />
            <h3 className="text-lg font-bold text-foreground font-handwriting text-xl notebook-underline">Agent 1: AST Scanner</h3>
            <p className="text-xs text-muted-foreground leading-relaxed font-sans">
              Parses Python AST and JS package imports across your codebase directory. Diff-checks imports against local markdown vault notes.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-card border border-border space-y-3">
            <Sparkles className="w-8 h-8 text-[#af547b]" />
            <h3 className="text-lg font-bold text-foreground font-handwriting text-xl notebook-underline">Agent 2: Synthesizer</h3>
            <p className="text-xs text-muted-foreground leading-relaxed font-sans">
              Streams structured Markdown guides with code patterns and YAML frontmatter metadata directly to your browser session.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-card border border-border space-y-3">
            <GraduationCap className="w-8 h-8 text-[#af547b]" />
            <h3 className="text-lg font-bold text-foreground font-handwriting text-xl notebook-underline">Agent 3: Quizzer</h3>
            <p className="text-xs text-muted-foreground leading-relaxed font-sans">
              Generates context-aware coding challenges, evaluates submitted code solutions, and auto-patches Markdown note frontmatter metadata.
            </p>
          </div>
        </div>
      </section>

      {/* FEATURE MATRIX GRID */}
      <section id="features" className="relative z-10 py-16 px-6 max-w-7xl mx-auto w-full border-t border-border">
        <div className="text-center mb-12 space-y-2">
          <div className="text-xs font-mono text-accent uppercase tracking-widest">
            FEATURE CAPABILITIES
          </div>
          <h2 className="text-3xl font-extrabold text-foreground tracking-tight font-sans">
            Built for Local Markdown Vaults
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-card border border-border space-y-2">
            <ShieldCheck className="w-7 h-7 text-[#af547b]" />
            <h3 className="text-sm font-bold text-foreground font-mono">Local File Access</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">Read and edit Markdown files directly on your disk via browser APIs.</p>
          </div>

          <div className="p-6 rounded-2xl bg-card border border-border space-y-2">
            <Network className="w-7 h-7 text-[#af547b]" />
            <h3 className="text-sm font-bold text-foreground font-mono">2D & 3D Knowledge Graph</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">Visualize relationships between imports and vault notes in 2D or 3D.</p>
          </div>

          <div className="p-6 rounded-2xl bg-card border border-border space-y-2">
            <Layers className="w-7 h-7 text-[#af547b]" />
            <h3 className="text-sm font-bold text-foreground font-mono">Dockview Multi-Tab IDE</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">Tile and split note editors, node graphs, and quiz terminals easily.</p>
          </div>

          <div className="p-6 rounded-2xl bg-card border border-border space-y-2">
            <Code2 className="w-7 h-7 text-[#af547b]" />
            <h3 className="text-sm font-bold text-foreground font-mono">Monaco Editor</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">VS Code style Markdown editing with side-by-side live rendered preview.</p>
          </div>

          <div className="p-6 rounded-2xl bg-card border border-border space-y-2">
            <Clock className="w-7 h-7 text-[#af547b]" />
            <h3 className="text-sm font-bold text-foreground font-mono">Decay Recall Engine</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">Calculates memory retention decay curves to highlight review priority.</p>
          </div>

          <div className="p-6 rounded-2xl bg-card border border-border space-y-2">
            <Globe className="w-7 h-7 text-[#af547b]" />
            <h3 className="text-sm font-bold text-foreground font-mono">Stateless REST Backend</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">Deploy FastAPI containers to Render, Vercel, or run locally via Uvicorn.</p>
          </div>
        </div>
      </section>

      {/* FAQ SECTION */}
      <section id="faq" className="relative z-10 py-16 px-6 max-w-4xl mx-auto w-full border-t border-border">
        <div className="text-center mb-10 space-y-2">
          <div className="text-xs font-mono text-accent uppercase tracking-widest">
            FREQUENTLY ASKED QUESTIONS
          </div>
          <h2 className="text-3xl font-extrabold text-foreground tracking-tight font-sans">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, index) => (
            <div key={index} className="border border-border rounded-xl bg-card overflow-hidden">
              <button
                onClick={() => setOpenFaq(openFaq === index ? null : index)}
                className="w-full p-4 text-left flex items-center justify-between gap-4 font-semibold text-xs text-foreground hover:text-[#af547b] transition-colors cursor-pointer font-mono"
              >
                <span>{faq.q}</span>
                <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${openFaq === index ? "rotate-180 text-primary" : ""}`} />
              </button>
              {openFaq === index && (
                <div className="px-4 pb-4 text-xs text-muted-foreground leading-relaxed border-t border-border pt-3 font-sans">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* BOTTOM CTA BANNER */}
      <section className="relative z-10 py-12 px-6 max-w-4xl mx-auto w-full">
        <div className="rounded-2xl border border-border bg-graph-paper p-8 sm:p-12 text-center space-y-6 shadow-2xl">
          <h2 className="text-3xl font-black text-foreground tracking-tight font-sans">
            Ready to Open Your Markdown Notebook Vault?
          </h2>
          <p className="text-xs text-muted-foreground max-w-md mx-auto font-sans">
            Launch the OmniVault Workspace IDE to connect your local codebase directory and markdown notes vault.
          </p>

          <div>
            <Link href="/workspace">
              <Button className="h-11 px-8 bg-accent hover:bg-accent/90 text-white font-bold text-xs rounded-xl cursor-pointer inline-flex items-center gap-2 font-mono">
                <span>Launch Workspace Now</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="relative z-10 border-t border-border py-8 px-6 bg-[#070b10] mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground font-mono">
          <div className="flex items-center gap-2">
            <span className="font-bold text-foreground font-handwriting text-base">OmniVault AI</span>
            <span>— Dark Graph Paper Vault Workspace</span>
          </div>

          <div className="flex items-center gap-6">
            <Link href="/workspace" className="hover:text-foreground">
              Workspace IDE
            </Link>
            <span className="text-primary">API Operational</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
