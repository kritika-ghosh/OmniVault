"use client";

import React, { useMemo, useEffect} from "react";
import { useWorkspace } from "@/context/WorkspaceContext";
import { API_PATHS } from "@/lib/api-paths";
import QuizWelcome from "./quiz-welcome";
import QuizChallenge from "./quiz-challenge";

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

export default function Quiz() {
  const {
    notesFiles,
    apiHost,
    quizSelectedNotePath,
    setQuizSelectedNotePath,
    currentQuiz,
    setCurrentQuiz,
    isGeneratingQuiz,
    setIsGeneratingQuiz,
    isEvaluatingQuiz,
    setIsEvaluatingQuiz,
    quizUserCode,
    setQuizUserCode,
    quizEvaluation,
    setQuizEvaluation,
    vaultSessions,
    activeVaultPath,
    setActiveVaultPath,
  } = useWorkspace();

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

  // Reactively open the quiz editor tab side-by-side whenever currentQuiz is active
  useEffect(() => {
    if (currentQuiz) {
      const timer = setTimeout(() => {
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("open-quiz-editor"));
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [currentQuiz]);

  const handleGenerate = async () => {
    if (!selectedNote) return;
    setIsGeneratingQuiz(true);
    setQuizEvaluation(null);
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
    } catch (err) {
      console.error(err);
    } finally {
      setIsGeneratingQuiz(false);
    }
  };

  const handleSubmit = async () => {
    if (!currentQuiz || !selectedNote) return;
    setIsEvaluatingQuiz(true);
    try {
      const url = `${apiHost}${API_PATHS.EVALUATE}`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          note_path: selectedNote.path,
          note_content: selectedNote.content,
          question: currentQuiz.question_text,
          expected_concepts: currentQuiz.expected_concepts,
          user_answer: quizUserCode,
          test_cases: currentQuiz.test_cases,
        }),
      });

      if (!response.ok) throw new Error("Failed to evaluate solution");
      const data: QuizEvaluation = await response.json();
      setQuizEvaluation(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsEvaluatingQuiz(false);
    }
  };

  const handleBack = () => {
    setCurrentQuiz(null);
    setQuizEvaluation(null);
    // Fire custom event to close the Monaco Editor tab
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("close-quiz-editor"));
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-background text-foreground overflow-y-auto p-6 select-none">
      {/* Study Vault Switcher */}
      {!currentQuiz && Object.keys(vaultSessions).length > 0 && (
        <div className="flex items-center gap-1.5 mb-6 bg-muted/30 p-2 rounded-xl border border-border/20 self-end">
          <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest pl-1">Study Vault:</span>
          <select
            value={activeVaultPath}
            onChange={(e) => {
              setActiveVaultPath(e.target.value);
              setQuizSelectedNotePath("");
            }}
            className="bg-transparent text-xs font-mono text-foreground focus:outline-hidden cursor-pointer"
          >
            {Object.keys(vaultSessions).map((path) => {
              const label = path.split(/[/\\]/).pop() || path;
              return (
                <option key={path} value={path} className="bg-background text-foreground">
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
  );
}
