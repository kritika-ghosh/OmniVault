"use client";

import React, { useMemo, useEffect, useState } from "react";
import { useWorkspace } from "@/context/WorkspaceContext";
import { API_PATHS } from "@/lib/api-paths";
import { mockQuizChallenge } from "@/lib/data";
import QuizWelcome from "./quiz-welcome";
import QuizChallenge from "./quiz-challenge";
import Editor from "@monaco-editor/react";
import { Terminal } from "lucide-react";

interface QuizChallengeData {
  question_text: string;
  code_snippet: string | null;
  expected_concepts: string[];
  test_cases: { input: string; expected_output: string }[] | null;
}

interface SandboxResult {
  test_case: number;
  input: string;
  expected: string;
  actual: string;
  passed: boolean;
  stderr: string;
}

interface QuizEvaluation {
  passed: boolean;
  similarity_score: number;
  feedback_hint: string;
  missing_concepts: string[];
  sandbox_results?: SandboxResult[];
}

interface QuizProps {
  params?: {
    targetNotePath?: string;
  };
}

export default function Quiz(props: QuizProps) {
  const {
    notesFiles,
    apiHost,
    vaultSessions,
    activeVaultPath,
    setActiveVaultPath,
  } = useWorkspace();

  const initialNotePath = props.params?.targetNotePath || "";
  const [quizSelectedNotePath, setQuizSelectedNotePath] = useState(initialNotePath);
  const [currentQuiz, setCurrentQuiz] = useState<QuizChallengeData | null>(null);
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
  const [isEvaluatingQuiz, setIsEvaluatingQuiz] = useState(false);
  const [quizUserCode, setQuizUserCode] = useState("");
  const [quizEvaluation, setQuizEvaluation] = useState<QuizEvaluation | null>(null);
  const [editorTheme, setEditorTheme] = useState("vs-dark");

  // Sync Monaco Editor theme with global class mutation changes
  useEffect(() => {
    if (typeof document === "undefined") return;
    const observer = new MutationObserver(() => {
      const isDark = document.documentElement.classList.contains("dark");
      setEditorTheme(isDark ? "vs-dark" : "light");
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    
    const isDark = document.documentElement.classList.contains("dark");
    setEditorTheme(isDark ? "vs-dark" : "light");

    return () => observer.disconnect();
  }, []);

  const selectedNote = useMemo(() => {
    return notesFiles.find((f) => f.path === quizSelectedNotePath);
  }, [quizSelectedNotePath, notesFiles]);

  const detectedLanguage = useMemo(() => {
    if (!currentQuiz?.code_snippet) return "javascript";
    const snippet = currentQuiz.code_snippet;
    if (snippet.includes("def ") || snippet.includes("import ") || snippet.includes("print(")) {
      return "python";
    }
    return "javascript";
  }, [currentQuiz]);

  const handleDemo = () => {
    setIsGeneratingQuiz(true);
    setQuizEvaluation(null);
    setTimeout(() => {
      setCurrentQuiz(mockQuizChallenge);
      setQuizUserCode(mockQuizChallenge.code_snippet || `// Enter your answer here...\n`);
      setIsGeneratingQuiz(false);
    }, 400);
  };

  const handleGenerate = async () => {
    if (!selectedNote) return;
    setIsGeneratingQuiz(true);
    setQuizEvaluation(null);
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("show-toast", {
          detail: { id: "quiz-gen", message: "Generating quiz challenge...", type: "loading" },
        })
      );
    }
    try {
      const url = `${apiHost}${API_PATHS.QUIZ}`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          note_path: selectedNote.path,
          note_content: selectedNote.content,
        }),
      });

      if (!response.ok) throw new Error("Failed to generate quiz");
      const data: QuizChallengeData = await response.json();
      setCurrentQuiz(data);
      setQuizUserCode(data.code_snippet || `// Enter your answer here...\n`);
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("show-toast", {
            detail: { id: "quiz-gen", message: "Quiz challenge ready!", type: "success" },
          })
        );
      }
    } catch (err) {
      console.warn("Backend API unavailable, loading mock quiz challenge from data.ts:", err);
      setCurrentQuiz(mockQuizChallenge);
      setQuizUserCode(mockQuizChallenge.code_snippet || `// Enter your answer here...\n`);
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("show-toast", {
            detail: { id: "quiz-gen", message: "Using local mock quiz challenge.", type: "success" },
          })
        );
      }
    } finally {
      setIsGeneratingQuiz(false);
    }
  };

  const handleSubmit = async () => {
    if (!currentQuiz) return;
    setIsEvaluatingQuiz(true);
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("show-toast", {
          detail: { id: "quiz-eval", message: "Evaluating solution...", type: "loading" },
        })
      );
    }
    try {
      const notePath = selectedNote?.path || "pandas.md";
      const noteContent = selectedNote?.content || "";
      const url = `${apiHost}${API_PATHS.EVALUATE}`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          note_path: notePath,
          note_content: noteContent,
          question: currentQuiz.question_text,
          expected_concepts: currentQuiz.expected_concepts,
          user_answer: quizUserCode,
          test_cases: currentQuiz.test_cases,
        }),
      });

      if (!response.ok) throw new Error("Failed to evaluate solution");
      const data: QuizEvaluation = await response.json();
      setQuizEvaluation(data);
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("show-toast", {
            detail: { id: "quiz-eval", message: "Evaluation completed!", type: "success" },
          })
        );
      }
    } catch (err) {
      console.warn("Backend API unavailable, providing mock evaluation result:", err);
      const isCorrect =
        quizUserCode.includes("read_csv") ||
        quizUserCode.includes("dropna") ||
        quizUserCode.includes("groupby");
      setQuizEvaluation({
        passed: isCorrect,
        similarity_score: isCorrect ? 0.94 : 0.42,
        feedback_hint: isCorrect
          ? "Excellent! Found expected pandas data functions ('read_csv', 'dropna', 'groupby'). Frontmatter confidence patched to 0.90."
          : "Review suggested. Ensure your code contains required Pandas functions like 'read_csv' and 'dropna'.",
        missing_concepts: isCorrect ? [] : ["read_csv", "dropna"],
        sandbox_results: [
          {
            test_case: 1,
            input: "data.csv",
            expected: "DataFrame(category=['A', 'B'], mean=[12.5, 45.2])",
            actual: isCorrect ? "DataFrame(category=['A', 'B'], mean=[12.5, 45.2])" : "SyntaxError or Missing Function",
            passed: isCorrect,
            stderr: isCorrect ? "" : "NameError: function missing expected Pandas keywords",
          },
        ],
      });
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("show-toast", {
            detail: { id: "quiz-eval", message: "Local mock evaluation completed!", type: "success" },
          })
        );
      }
    } finally {
      setIsEvaluatingQuiz(false);
    }
  };

  const handleBack = () => {
    setCurrentQuiz(null);
    setQuizEvaluation(null);
  };

  return (
    <div className="w-full h-full flex flex-wrap bg-graph-paper text-foreground overflow-y-auto">
      {/* Left Pane - Challenge/Welcome */}
      <div className="flex-1 min-w-[350px] p-6 border-r border-border/20 flex flex-col">
        {!currentQuiz && Object.keys(vaultSessions).length > 0 && (
          <div className="flex items-center gap-1.5 bg-card px-2.5 py-1 rounded-xl border border-border w-52 mb-6 self-end">
            <span className="text-sm font-mono text-muted-foreground uppercase tracking-widest">Vault:</span>
            <select
              value={activeVaultPath}
              onChange={(e) => setActiveVaultPath(e.target.value)}
              className="bg-transparent text-sm font-mono text-foreground focus:outline-none cursor-pointer"
            >
              {Object.keys(vaultSessions).map((path) => {
                const label = path.split(/[/\\]/).pop() || path;
                return (
                  <option key={path} value={path} className="bg-card text-foreground">
                    {label}
                  </option>
                );
              })}
            </select>
          </div>
        )}

        {!currentQuiz ? (
          <QuizWelcome
            selectedNotePath={quizSelectedNotePath}
            setSelectedNotePath={setQuizSelectedNotePath}
            onStart={handleGenerate}
            onDemo={handleDemo}
            isGenerating={isGeneratingQuiz}
            notesFiles={notesFiles}
          />
        ) : (
          <QuizChallenge
            currentQuiz={currentQuiz}
            onBack={handleBack}
            onSubmit={handleSubmit}
            isEvaluating={isEvaluatingQuiz}
            evaluation={quizEvaluation}
            detectedLanguage={detectedLanguage}
          />
        )}
      </div>

      {/* Right Pane - Monaco Editor */}
      <div className="flex-1 min-w-[350px] flex flex-col bg-muted/5 relative min-h-[400px]">
        {!currentQuiz ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center select-none">
            <Terminal className="w-10 h-10 text-muted-foreground/30 mb-2" />
            <span className="text-xs font-bold text-muted-foreground">Answer Terminal Offline</span>
            <span className="text-[10px] text-muted-foreground/60 mt-1 max-w-xs">
              Generate a challenge to activate the Monaco workspace.
            </span>
          </div>
        ) : (
          <>
            <div className="px-4 py-2 border-b border-border bg-muted/10 shrink-0 select-none text-[10px] font-mono text-muted-foreground/75">
              interactive_quiz_solution.{detectedLanguage === "python" ? "py" : "js"}
            </div>
            <div className="flex-1 w-full h-full overflow-hidden">
              <Editor
                key={detectedLanguage}
                height="100%"
                theme={editorTheme}
                language={detectedLanguage}
                value={quizUserCode}
                onChange={(val) => setQuizUserCode(val || "")}
                options={{
                  minimap: { enabled: false },
                  fontSize: 13,
                  lineNumbers: "on",
                  automaticLayout: true,
                  fontFamily: "Geist Mono, JetBrains Mono, Fira Code, monospace",
                }}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
