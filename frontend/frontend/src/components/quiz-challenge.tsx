"use client";

import React from "react";
import { Button } from "./ui/button";
import { ArrowLeft, Send, CheckCircle2, AlertTriangle, Terminal } from "lucide-react";
import { cn } from "@/lib/utils";

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

interface QuizChallengeProps {
  currentQuiz: QuizChallengeData;
  onBack: () => void;
  onSubmit: () => void;
  isEvaluating: boolean;
  evaluation: QuizEvaluation | null;
  detectedLanguage: string;
}

export default function QuizChallenge({
  currentQuiz,
  onBack,
  onSubmit,
  isEvaluating,
  evaluation,
  detectedLanguage,
}: QuizChallengeProps) {
  return (
    <div className="space-y-5 select-none">
      <div className="flex items-center justify-between border-b border-border/40 pb-3">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground cursor-pointer font-semibold"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Topics
        </button>
        <span className="text-xs font-mono font-bold tracking-wider px-2.5 py-0.5 bg-primary/10 text-primary rounded-full uppercase">
          {detectedLanguage}
        </span>
      </div>

      {/* Question Text */}
      <div className="p-5 rounded-xl bg-muted/40 border border-border/50">
        <span className="text-xs font-mono text-primary font-bold uppercase tracking-wider block mb-1">Active Challenge</span>
        <p className="text-lg font-semibold leading-relaxed text-foreground select-text">{currentQuiz.question_text}</p>
      </div>

      {/* Submit Action */}
      <Button
        onClick={onSubmit}
        disabled={isEvaluating}
        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold h-11 px-4 flex items-center justify-center gap-1.5 cursor-pointer text-sm"
      >
        <Send className="w-4 h-4" />
        {isEvaluating ? "Evaluating answer..." : "Submit Solution"}
      </Button>

      {/* Evaluation Results */}
      {evaluation && (
        <div className="space-y-4 pt-2 animate-fade-in">
          {/* Result header banner */}
          <div className={cn(
            "p-4 rounded-xl border flex items-center gap-3",
            evaluation.passed
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-500"
              : "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-500"
          )}>
            {evaluation.passed ? (
              <CheckCircle2 className="w-5 h-5 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 shrink-0" />
            )}
            <div className="flex-1">
              <h4 className="text-sm font-bold uppercase tracking-wide">
                {evaluation.passed ? "Challenge Mastered! 🎉" : "Guidance Triggered ⚠️"}
              </h4>
              <span className="text-xs opacity-90 block mt-0.5">
                Conceptual Match: <span className="font-mono font-bold">{(evaluation.similarity_score * 100).toFixed(0)}%</span>
              </span>
            </div>
          </div>

          {/* Socratic Hint */}
          <div className="p-4 rounded-xl bg-muted/40 border border-border/50 space-y-1.5 select-text">
            <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider block">Socratic Feedback</span>
            <p className="text-sm leading-relaxed text-muted-foreground/90 font-medium">{evaluation.feedback_hint}</p>
          </div>

          {/* Missing Concepts */}
          {evaluation.missing_concepts && evaluation.missing_concepts.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider block">Missing Targets</span>
              <div className="flex flex-wrap gap-1.5">
                {evaluation.missing_concepts.map((c) => (
                  <span key={c} className="text-xs bg-red-500/10 text-red-500 border border-red-500/20 px-2.5 py-0.5 rounded font-medium">
                    {c}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Sandbox results */}
          {evaluation.sandbox_results && evaluation.sandbox_results.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <Terminal className="w-3.5 h-3.5" />
                Sandbox Executions
              </span>
              <div className="space-y-2">
                {evaluation.sandbox_results.map((res) => (
                  <div key={res.test_case} className="p-3 rounded-xl bg-black/10 dark:bg-black/30 border border-border text-xs font-mono space-y-1 select-text">
                    <div className="flex items-center justify-between border-b border-border/30 pb-1.5 mb-1.5">
                      <span>Test Case #{res.test_case}</span>
                      <span className={res.passed ? "text-emerald-500 font-bold" : "text-red-500 font-bold"}>
                        {res.passed ? "PASSED" : "FAILED"}
                      </span>
                    </div>
                    {res.input && (
                      <div><span className="text-muted-foreground">Input:</span> {res.input}</div>
                    )}
                    <div><span className="text-muted-foreground">Expected:</span> {res.expected}</div>
                    <div><span className="text-muted-foreground">Actual:</span> {res.actual}</div>
                    {res.stderr && (
                      <div className="text-red-400 overflow-x-auto pt-1 mt-1 border-t border-red-500/10">
                        <span className="text-muted-foreground">Error:</span> {res.stderr}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
