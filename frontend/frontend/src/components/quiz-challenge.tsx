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
    <div className="space-y-5 select-none font-sans">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer font-mono font-semibold"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Topics
        </button>
        <span className="text-[10px] font-mono font-bold tracking-wider px-2.5 py-0.5 bg-primary/20 text-primary rounded-lg uppercase border border-primary/30">
          {detectedLanguage}
        </span>
      </div>

      {/* Question Text Card - Dark Graph Paper Style */}
      <div className="p-5 rounded-2xl bg-card border border-border space-y-2">
        <span className="text-xs font-mono text-accent font-bold uppercase tracking-wider block flex items-center gap-1">
          <span className="text-accent">↳</span> Active Challenge Exercise :-
        </span>
        <p className="text-base font-handwriting font-bold leading-relaxed text-foreground select-text notebook-underline inline-block">
          {currentQuiz.question_text}
        </p>
      </div>

      {/* Submit Action */}
      <Button
        onClick={onSubmit}
        disabled={isEvaluating}
        className="w-full bg-accent hover:bg-accent/90 text-white font-bold font-mono h-10 px-4 flex items-center justify-center gap-2 cursor-pointer text-xs rounded-xl shadow-lg"
      >
        <Send className="w-4 h-4" />
        {isEvaluating ? "Evaluating answer..." : "Evaluate Solution & Sync Frontmatter"}
      </Button>

      {/* Evaluation Results */}
      {evaluation && (
        <div className="space-y-4 pt-2 animate-fade-in font-mono">
          {/* Result header banner */}
          <div className={cn(
            "p-4 rounded-2xl border flex items-center gap-3",
            evaluation.passed
              ? "bg-primary/10 border-primary/30 text-primary"
              : "bg-accent/10 border-accent/30 text-accent"
          )}>
            {evaluation.passed ? (
              <CheckCircle2 className="w-5 h-5 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 shrink-0" />
            )}
            <div className="flex-1">
              <h4 className="text-xs font-bold uppercase tracking-wide">
                {evaluation.passed ? "Challenge Mastered! 🎉" : "Review Suggested ⚠️"}
              </h4>
              <span className="text-xs opacity-90 block mt-0.5 font-mono">
                Similarity Score: <span className="font-bold">{(evaluation.similarity_score * 100).toFixed(0)}%</span>
              </span>
            </div>
          </div>

          {/* Feedback */}
          <div className="p-4 rounded-2xl bg-card border border-border space-y-1.5 select-text">
            <span className="text-[10px] font-mono text-accent uppercase tracking-wider block">Feedback Hint :-</span>
            <p className="text-xs leading-relaxed text-foreground/95 font-sans">{evaluation.feedback_hint}</p>
          </div>

          {/* Missing Concepts */}
          {evaluation.missing_concepts && evaluation.missing_concepts.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider block">Missing Targets</span>
              <div className="flex flex-wrap gap-1.5">
                {evaluation.missing_concepts.map((c) => (
                  <span key={c} className="text-xs bg-red-500/20 text-red-400 border border-red-500/30 px-2.5 py-0.5 rounded-lg font-mono">
                    {c}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Sandbox results */}
          {evaluation.sandbox_results && evaluation.sandbox_results.length > 0 && (
            <div className="space-y-2">
              <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <Terminal className="w-3.5 h-3.5 text-accent" />
                Sandbox Executions
              </span>
              <div className="space-y-2">
                {evaluation.sandbox_results.map((res) => (
                  <div key={res.test_case} className="p-3 rounded-xl bg-muted border border-border text-xs font-mono space-y-1 select-text">
                    <div className="flex items-center justify-between border-b border-border pb-1.5 mb-1.5">
                      <span>Test Case #{res.test_case}</span>
                      <span className={res.passed ? "text-primary font-bold" : "text-red-400 font-bold"}>
                        {res.passed ? "PASSED" : "FAILED"}
                      </span>
                    </div>
                    {res.input && (
                      <div><span className="text-muted-foreground/75">Input:</span> {res.input}</div>
                    )}
                    <div><span className="text-muted-foreground/75">Expected:</span> {res.expected}</div>
                    <div><span className="text-muted-foreground/75">Actual:</span> {res.actual}</div>
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
