"use client";

import React, { useState, useEffect, useRef } from "react";
import { useWorkspace } from "@/context/WorkspaceContext";
import { Button } from "./ui/button";
import { 
  BookOpen, 
  HelpCircle, 
  Terminal, 
  AlertTriangle, 
  Lock, 
  Unlock, 
  CheckCircle2, 
  Sparkles, 
  ArrowRight, 
  FolderPlus, 
  UploadCloud, 
  RotateCcw,
  Zap
} from "lucide-react";

interface CurriculumNode {
  id: string;
  title: string;
  description: string;
  estimated_hours: number;
  dependencies: string[];
  mastery_score: number;
  status: string; // mastered, shaky, blocked, unlocked, locked
  child_nodes?: CurriculumNode[];
  retrieved_chunk_ids?: string[];
}

interface AgentLogEntry {
  timestamp: string;
  message: string;
}

interface SessionState {
  session_id: string;
  goal: string;
  filenames: string[];
  curriculum: CurriculumNode[];
  agent_log: AgentLogEntry[];
}

export default function MutatedCompanion() {
  const { notesPath } = useWorkspace();

  const getMutatedApiHost = () => {
    if (typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")) {
      return "http://localhost:8000";
    }
    return "https://mutated-backend.onrender.com";
  };
  const mutatedApiHost = getMutatedApiHost();

  // State definitions
  const [session, setSession] = useState<SessionState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [goalInput, setGoalInput] = useState("");
  const [useExistingFolder, setUseExistingFolder] = useState(true);
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [selectedNode, setSelectedNode] = useState<CurriculumNode | null>(null);
  
  // Right tabs
  const [activeTab, setActiveTab] = useState<"context" | "quiz" | "logs">("context");
  
  // Tab states
  const [nodeContext, setNodeContext] = useState<string>("");
  const [isLoadingContext, setIsLoadingContext] = useState(false);
  const [quizQuestions, setQuizQuestions] = useState<any[]>([]);
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});
  const [userConfidence, setUserConfidence] = useState(3);
  const [isSubmittingQuiz, setIsSubmittingQuiz] = useState(false);
  const [submitResult, setSubmitResult] = useState<any | null>(null);
  
  // Re-plan loading state
  const [isReplanning, setIsReplanning] = useState(false);

  // Rotating loading messages
  const loadingMessages = [
    "Slicing reference materials into semantic overlapping nodes...",
    "Mapping vectors to ChromaDB memory layers...",
    "Groq inference engine constructing optimized study path pipelines...",
    "Building adaptive agent loop roadmap structures..."
  ];

  // Rotate loading step
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isLoading) {
      interval = setInterval(() => {
        setLoadingStep((prev) => (prev + 1) % loadingMessages.length);
      }, 3500);
    }
    return () => clearInterval(interval);
  }, [isLoading]);

  // If a node is selected and we switch to Context, fetch it
  useEffect(() => {
    if (selectedNode && activeTab === "context" && session) {
      fetchNodeContext();
    }
  }, [selectedNode, activeTab]);

  // Auto scroll logs terminal to bottom
  const terminalEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [session?.agent_log]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFiles(e.target.files);
    }
  };

  const handleInitSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalInput.trim()) return;

    setIsLoading(true);
    setLoadingStep(0);

    const formData = new FormData();
    formData.append("goal", goalInput);

    if (useExistingFolder && notesPath) {
      formData.append("folder_path", notesPath);
    } else if (selectedFiles && selectedFiles.length > 0) {
      for (let i = 0; i < selectedFiles.length; i++) {
        formData.append("files", selectedFiles[i]);
      }
    }

    try {
      const response = await fetch(`${mutatedApiHost}/session/init`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || "Failed to initialize adaptive study blueprint.");
      }

      const data = await response.json();
      setSession(data);
      if (data.curriculum && data.curriculum.length > 0) {
        setSelectedNode(data.curriculum[0]);
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchNodeContext = async () => {
    if (!session || !selectedNode) return;
    setIsLoadingContext(true);
    try {
      const url = `${mutatedApiHost}/curriculum/${session.session_id}/node/${selectedNode.id}/context?description=${encodeURIComponent(selectedNode.description)}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setNodeContext(data.retrieved_context);
      }
    } catch (e) {
      setNodeContext("Failed to retrieve grounded context references.");
    } finally {
      setIsLoadingContext(false);
    }
  };

  const handleGenerateQuiz = async () => {
    if (!session || !selectedNode) return;
    setIsGeneratingQuiz(true);
    setQuizAnswers({});
    setSubmitResult(null);
    try {
      const url = `${mutatedApiHost}/curriculum/${session.session_id}/node/${selectedNode.id}/quiz?description=${encodeURIComponent(selectedNode.description)}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setQuizQuestions(data.quiz_questions);
      }
    } catch (e) {
      alert("Error generating quiz.");
    } finally {
      setIsGeneratingQuiz(false);
    }
  };

  const handleSubmitQuiz = async () => {
    if (!session || !selectedNode) return;
    setIsSubmittingQuiz(true);
    try {
      const url = `${mutatedApiHost}/curriculum/${session.session_id}/node/${selectedNode.id}/submit`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answers: quizAnswers,
          confidence: userConfidence
        })
      });

      if (res.ok) {
        const data = await res.json();
        setSubmitResult(data);
        // Instant React state overwrite with updated mutated curriculum!
        if (data.updated_session_state) {
          setSession(data.updated_session_state);
          // Update currently selected node state parameters
          const updated = data.updated_session_state.curriculum.find((n: CurriculumNode) => n.id === selectedNode.id);
          if (updated) setSelectedNode(updated);
        }
      }
    } catch (e) {
      alert("Error submitting quiz results.");
    } finally {
      setIsSubmittingQuiz(false);
    }
  };

  const handleDemoOverride = async () => {
    if (!session || !selectedNode) return;
    setIsReplanning(true);
    try {
      const url = `${mutatedApiHost}/agent/${session.session_id}/replan?target_node_id=${selectedNode.id}`;
      const res = await fetch(url, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        if (data.updated_session_state) {
          setSession(data.updated_session_state);
          const updated = data.updated_session_state.curriculum.find((n: CurriculumNode) => n.id === selectedNode.id);
          if (updated) setSelectedNode(updated);
        }
        alert(`Demo replan mutation applied: ${data.mutation_applied ? "YES" : "NO"}`);
      }
    } catch (e) {
      alert("Error triggering manual demo override.");
    } finally {
      setIsReplanning(false);
    }
  };

  const handleReset = () => {
    setSession(null);
    setSelectedNode(null);
    setNodeContext("");
    setQuizQuestions([]);
    setQuizAnswers({});
    setSubmitResult(null);
  };

  // Node styles generator based on current status
  const getNodeStyles = (node: CurriculumNode) => {
    const isSelected = selectedNode?.id === node.id;
    const base = "p-4 rounded-xl border transition-all text-left w-full cursor-pointer relative overflow-hidden ";
    
    let stateStyle = "";
    switch (node.status) {
      case "locked":
        stateStyle = "bg-muted/10 border-border/40 text-muted-foreground/60 cursor-not-allowed opacity-50";
        break;
      case "unlocked":
        stateStyle = "bg-blue-500/5 border-blue-500/20 text-foreground hover:bg-blue-500/10 hover:border-blue-500/35";
        break;
      case "mastered":
        stateStyle = "bg-emerald-500/5 border-emerald-500/35 text-foreground hover:bg-emerald-500/10";
        break;
      case "shaky":
        stateStyle = "bg-amber-500/5 border-amber-500/35 text-foreground hover:bg-amber-500/10";
        break;
      case "blocked":
        stateStyle = "bg-destructive/5 border-destructive/35 text-foreground hover:bg-destructive/10";
        break;
      default:
        stateStyle = "bg-card border-border text-foreground hover:bg-muted/50";
    }

    const selectBorder = isSelected 
      ? " ring-2 ring-primary ring-offset-2 ring-offset-background scale-[1.01]" 
      : "";

    return `${base} ${stateStyle} ${selectBorder}`;
  };

  const getNodeIcon = (node: CurriculumNode) => {
    switch (node.status) {
      case "locked":
        return <Lock className="w-4 h-4 text-muted-foreground/60 shrink-0" />;
      case "mastered":
        return <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />;
      case "shaky":
        return <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />;
      case "blocked":
        return <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />;
      default:
        return <Unlock className="w-4 h-4 text-blue-500 shrink-0" />;
    }
  };

  // Renders the initial loading / ingestion screen
  if (!session && !isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center p-8 bg-gradient-to-b from-background to-muted/20">
        <div className="max-w-2xl w-full border border-border/50 bg-card/65 backdrop-blur-xl p-8 rounded-3xl shadow-2xl flex flex-col gap-6">
          <div className="space-y-2 text-center">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              NextGen Adaptive Curriculum Planner
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
              Stop studying static guides
            </h1>
            <p className="text-sm text-muted-foreground max-w-lg mx-auto">
              mutatED uses localized Retrieval-Augmented Generation (RAG) and autonomous AI planning loops to dynamically re-engineer your study tree roadmap live as you learn.
            </p>
          </div>

          <form onSubmit={handleInitSession} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-foreground">Learning Path Goal</label>
              <input
                type="text"
                placeholder="e.g., Master Transformer Architectures or PyTorch Deep Learning"
                value={goalInput}
                onChange={(e) => setGoalInput(e.target.value)}
                required
                className="w-full h-11 px-4 rounded-xl border border-border bg-background/50 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
              />
            </div>

            {/* Folder vs Upload trigger toggles */}
            <div className="space-y-3 p-4 rounded-2xl bg-muted/30 border border-border/40">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <FolderPlus className="w-4 h-4 text-primary" />
                    Reference Material Source
                  </h4>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    How should the planner ingest background text corpus?
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setUseExistingFolder(true)}
                  className={`p-3 rounded-xl border text-xs font-bold transition-all flex flex-col items-center justify-center gap-1.5 ${
                    useExistingFolder 
                      ? "bg-primary/10 border-primary text-primary" 
                      : "bg-background/40 border-border/60 hover:bg-muted/40"
                  }`}
                >
                  <span>Active Notes Folder</span>
                  <span className="text-[9px] font-mono text-muted-foreground max-w-[200px] truncate">
                    {notesPath ? notesPath.split(/[/\\]/).pop() || notesPath : "No vault active"}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setUseExistingFolder(false)}
                  className={`p-3 rounded-xl border text-xs font-bold transition-all flex flex-col items-center justify-center gap-1.5 ${
                    !useExistingFolder 
                      ? "bg-primary/10 border-primary text-primary" 
                      : "bg-background/40 border-border/60 hover:bg-muted/40"
                  }`}
                >
                  <span>Upload Documents</span>
                  <span className="text-[9px] text-muted-foreground">
                    Drag PDFs/MD notes
                  </span>
                </button>
              </div>

              {!useExistingFolder && (
                <div className="mt-3 border border-dashed border-border/60 rounded-xl p-4 bg-background/30 flex flex-col items-center justify-center cursor-pointer hover:bg-muted/20 transition-all relative">
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.md,.txt"
                    onChange={handleFileChange}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <UploadCloud className="w-7 h-7 text-muted-foreground mb-1.5" />
                  <span className="text-xs font-semibold">
                    {selectedFiles ? `${selectedFiles.length} files selected` : "Click or drag files here"}
                  </span>
                  <span className="text-[9px] text-muted-foreground/60 mt-0.5">PDF, MD, or TXT formats</span>
                </div>
              )}
            </div>

            <Button
              type="submit"
              className="w-full h-11 bg-primary text-primary-foreground font-bold rounded-xl shadow-lg hover:bg-primary/90 flex items-center justify-center gap-2 cursor-pointer"
            >
              Generate Agentic Study Blueprint
              <ArrowRight className="w-4 h-4" />
            </Button>
          </form>
        </div>
      </div>
    );
  }

  // Renders the dynamic loading screen during initialization
  if (isLoading) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-8 bg-background">
        <div className="max-w-md w-full text-center space-y-6">
          {/* Animated spinner */}
          <div className="relative w-24 h-24 mx-auto">
            <div className="absolute inset-0 rounded-full border-4 border-primary/20 animate-pulse" />
            <div className="absolute inset-0 rounded-full border-4 border-t-primary animate-spin" />
            <div className="absolute inset-4 rounded-full bg-primary/5 flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-primary animate-pulse" />
            </div>
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-foreground">Assembling Adaptive Syllabus</h3>
            <p className="text-xs text-muted-foreground">Inference pipeline running via Groq LPU...</p>
          </div>
          <div className="p-4 rounded-2xl bg-black border border-border/40 font-mono text-[10px] text-emerald-500/90 min-h-[50px] flex items-center justify-center text-center">
            {loadingMessages[loadingStep]}
          </div>
        </div>
      </div>
    );
  }

  // Main Split-screen Workspace view
  return (
    <div className="w-full h-full flex overflow-hidden bg-background text-foreground font-sans">
      {/* 1. Left Layout Panel: The Evolving Roadmap Visualizer */}
      <div className="w-[380px] border-r border-border shrink-0 flex flex-col bg-card/20 h-full">
        {/* Workspace details header */}
        <div className="p-5 border-b border-border flex items-start justify-between gap-3 shrink-0 bg-muted/10">
          <div className="min-w-0">
            <div className="text-[10px] uppercase font-mono tracking-wider font-semibold text-primary">
              Active Adaptive Blueprint
            </div>
            <h3 className="text-sm font-bold truncate text-foreground mt-0.5" title={session?.goal}>
              {session?.goal}
            </h3>
            <span className="text-[10px] text-muted-foreground block mt-1">
              Refreshes dynamically on score events
            </span>
          </div>
          <button
            onClick={handleReset}
            className="p-1.5 hover:bg-muted border border-border rounded-lg text-muted-foreground hover:text-foreground shrink-0 transition-all cursor-pointer"
            title="Reset Session"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Roadmap Nodes List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {session?.curriculum.map((node) => {
            const isClickable = node.status !== "locked";
            return (
              <button
                key={node.id}
                disabled={!isClickable}
                onClick={() => {
                  setSelectedNode(node);
                  setSubmitResult(null);
                }}
                className={getNodeStyles(node)}
              >
                {/* Node details */}
                <div className="flex items-start justify-between gap-2.5 mb-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    {getNodeIcon(node)}
                    <span className="font-bold text-xs truncate">{node.title}</span>
                  </div>
                  {node.mastery_score > 0 && (
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-muted font-bold text-foreground">
                      M: {Math.round(node.mastery_score * 100)}%
                    </span>
                  )}
                </div>

                <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2 pl-6">
                  {node.description}
                </p>

                <div className="flex items-center justify-between text-[9px] text-muted-foreground/60 mt-2 pl-6">
                  <span>Est: {node.estimated_hours}h</span>
                  <span className="uppercase font-mono tracking-wider font-semibold text-[8px] px-1.5 py-0.5 rounded-full bg-muted/40">
                    {node.status}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Right Layout Panel: The Three-Tab Active Panel Workspace */}
      <div className="flex-1 flex flex-col h-full bg-background overflow-hidden">
        {/* Navigation Tabs Header */}
        <div className="flex items-center justify-between px-6 border-b border-border shrink-0 bg-muted/10">
          <div className="flex space-x-1 py-3">
            <button
              onClick={() => setActiveTab("context")}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "context"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              Context Reference
            </button>
            <button
              onClick={() => setActiveTab("quiz")}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "quiz"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5" />
              Grounded Quiz
            </button>
            <button
              onClick={() => setActiveTab("logs")}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "logs"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              Agent Logs
            </button>
          </div>

          {/* Hackathon Override controls */}
          <div className="flex items-center gap-2">
            {selectedNode && (
              <button
                disabled={isReplanning || selectedNode.status === "locked"}
                onClick={handleDemoOverride}
                className="bg-destructive/15 hover:bg-destructive/25 text-destructive border border-destructive/35 px-3 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                title="Force adaptive mutation review loop"
              >
                <Zap className="w-3 h-3 fill-current" />
                [DEMO OVERRIDE] Force Failure
              </button>
            )}
          </div>
        </div>

        {/* Workspace Tab Contents */}
        <div className="flex-1 overflow-hidden relative">
          
          {/* TAB A: Context Viewer */}
          {activeTab === "context" && (
            <div className="w-full h-full p-6 overflow-y-auto space-y-4">
              {selectedNode ? (
                <div className="space-y-4 max-w-3xl">
                  <div>
                    <h2 className="text-lg font-bold text-foreground">{selectedNode.title}</h2>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      {selectedNode.description}
                    </p>
                  </div>
                  <hr className="border-border/60" />
                  
                  <div>
                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2.5">
                      Grounded Corpus References
                    </h4>
                    {isLoadingContext ? (
                      <div className="h-40 flex items-center justify-center text-xs text-muted-foreground italic">
                        Retrieving relevant chunks...
                      </div>
                    ) : nodeContext ? (
                      <div className="p-5 rounded-2xl bg-card border border-border/80 text-sm leading-relaxed whitespace-pre-wrap font-mono text-muted-foreground/90 overflow-x-auto shadow-sm">
                        {nodeContext}
                      </div>
                    ) : (
                      <div className="p-8 border border-dashed border-border rounded-2xl text-center text-xs text-muted-foreground">
                        No context retrieved. Try selecting a different node.
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-sm text-muted-foreground italic">
                  Select a node from the roadmap tree to view context.
                </div>
              )}
            </div>
          )}

          {/* TAB B: Grounded Quiz Mode */}
          {activeTab === "quiz" && (
            <div className="w-full h-full p-6 overflow-y-auto space-y-4">
              {selectedNode ? (
                <div className="space-y-4 max-w-3xl">
                  <div>
                    <h2 className="text-lg font-bold text-foreground">Interactive Assessment</h2>
                    <p className="text-xs text-muted-foreground mt-1">
                      Verify your node understanding. The AI Mutation loop replans automatically based on score.
                    </p>
                  </div>
                  <hr className="border-border/60" />

                  {submitResult ? (
                    /* Submission feedback display */
                    <div className="p-6 border border-border/60 bg-card rounded-2xl shadow-sm space-y-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-full ${
                          submitResult.node_status === "mastered" 
                            ? "bg-emerald-500/10 text-emerald-500" 
                            : submitResult.node_status === "shaky"
                              ? "bg-amber-500/10 text-amber-500"
                              : "bg-destructive/10 text-destructive"
                        }`}>
                          <Sparkles className="w-6 h-6 animate-pulse" />
                        </div>
                        <div>
                          <h3 className="font-extrabold text-sm text-foreground">Submission Processed</h3>
                          <p className="text-[11px] text-muted-foreground">
                            Weighted Mastery M: <span className="font-bold font-mono text-foreground">{Math.round(submitResult.mastery_score * 100)}%</span> (Status: <span className="uppercase font-bold">{submitResult.node_status}</span>)
                          </p>
                        </div>
                      </div>

                      <div className="p-4 rounded-xl bg-muted/40 text-xs leading-relaxed text-foreground">
                        {submitResult.mutation_applied 
                          ? "🛠️ AI Agent loop executed curriculum mutation. Inspect your Left Study Tree and tab logs for remediation items!" 
                          : "✓ Core target node verified. No roadmap adjustments required."}
                      </div>

                      <Button
                        onClick={handleGenerateQuiz}
                        variant="outline"
                        className="text-xs border-border text-muted-foreground hover:text-foreground h-9 px-4 cursor-pointer"
                      >
                        Retake Quiz
                      </Button>
                    </div>
                  ) : quizQuestions.length > 0 ? (
                    /* Quiz Question List Form */
                    <div className="space-y-6">
                      {quizQuestions.map((q, qIndex) => (
                        <div key={q.id || qIndex} className="p-5 rounded-2xl border border-border/65 bg-card/40 space-y-3 shadow-sm">
                          <span className="text-[9px] font-mono font-bold tracking-wider text-primary uppercase">
                            Question {qIndex + 1}
                          </span>
                          <h4 className="text-sm font-bold text-foreground">{q.question}</h4>
                          <div className="space-y-1.5 pt-1">
                            {q.options.map((option: string) => {
                              const isChecked = quizAnswers[q.id] === option;
                              return (
                                <label
                                  key={option}
                                  className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-xs cursor-pointer transition-all ${
                                    isChecked 
                                      ? "bg-primary/5 border-primary font-semibold" 
                                      : "bg-background/50 border-border/60 hover:bg-muted/40"
                                  }`}
                                >
                                  <input
                                    type="radio"
                                    name={q.id}
                                    checked={isChecked}
                                    onChange={() => setQuizAnswers(prev => ({ ...prev, [q.id]: option }))}
                                    className="accent-primary w-4 h-4 shrink-0"
                                  />
                                  <span>{option}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      ))}

                      {/* Confidence score slider */}
                      <div className="p-5 rounded-2xl border border-border/60 bg-muted/20 space-y-3">
                        <div>
                          <h4 className="text-xs font-bold text-foreground">Subjective Confidence Rating</h4>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            How sure are you of your responses? (1 = Guessing, 5 = Absolute Certainty)
                          </p>
                        </div>
                        <div className="flex items-center gap-4 pt-1">
                          <input
                            type="range"
                            min="1"
                            max="5"
                            value={userConfidence}
                            onChange={(e) => setUserConfidence(parseInt(e.target.value))}
                            className="w-full h-1.5 bg-muted border border-border/40 rounded-lg appearance-none cursor-pointer accent-primary"
                          />
                          <span className="text-sm font-bold font-mono text-primary w-6 text-center">
                            {userConfidence}
                          </span>
                        </div>
                      </div>

                      <Button
                        onClick={handleSubmitQuiz}
                        disabled={isSubmittingQuiz || Object.keys(quizAnswers).length < quizQuestions.length}
                        className="h-10 bg-primary text-primary-foreground font-bold rounded-xl px-6 hover:bg-primary/90 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        {isSubmittingQuiz ? "Processing Analysis..." : "Submit Results to Mutation Engine"}
                      </Button>
                    </div>
                  ) : (
                    /* Initial action trigger */
                    <div className="h-60 border border-dashed border-border rounded-3xl flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto mt-6">
                      <HelpCircle className="w-10 h-10 text-muted-foreground/60 mb-2" />
                      <h4 className="text-sm font-bold text-foreground">Ready for testing?</h4>
                      <p className="text-xs text-muted-foreground mt-1 max-w-[280px]">
                        Start an interactive, zero-hallucination multiple-choice question sets compiled live via LLM.
                      </p>
                      <Button
                        onClick={handleGenerateQuiz}
                        disabled={isGeneratingQuiz}
                        className="bg-primary text-primary-foreground font-bold text-xs h-9 px-4 rounded-xl mt-4 cursor-pointer"
                      >
                        {isGeneratingQuiz ? "Generating questions..." : "Generate Node Quiz"}
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-sm text-muted-foreground italic">
                  Select a node from the roadmap tree to run assessments.
                </div>
              )}
            </div>
          )}

          {/* TAB C: Agent Autonomous Loop Log Terminal */}
          {activeTab === "logs" && (
            <div className="w-full h-full p-4 flex flex-col overflow-hidden bg-black text-emerald-500 font-mono text-xs leading-relaxed">
              <div className="border-b border-emerald-950/60 pb-2 px-2 flex justify-between items-center text-[10px] tracking-wider text-emerald-600/80 shrink-0">
                <span>AUTONOMOUS PLANNER REASONING TERMINAL FEED</span>
                <span className="animate-pulse">● LOGS ACTIVE</span>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {session?.agent_log && session.agent_log.length > 0 ? (
                  session.agent_log.map((log, index) => (
                    <div key={index} className="flex gap-2">
                      <span className="text-emerald-700/80 shrink-0">[{log.timestamp.slice(11, 19)}]</span>
                      <span className="whitespace-pre-wrap">{log.message}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-emerald-800 italic pt-10">
                    No planning logs written yet.
                  </div>
                )}
                <div ref={terminalEndRef} />
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
