"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Send, CheckCircle2, AlertTriangle, Terminal } from "lucide-react";
import { cn } from "@/lib/utils";
import { div } from "framer-motion/client";

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
  is_missing_module?: boolean;
  missing_module?: string;
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
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground cursor-pointer font-mono font-semibold"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Topics
        </button>
        <span className="text-sm font-mono font-bold tracking-wider px-2.5 py-0.5 bg-secondary/10 text-secondary rounded-lg uppercase border border-secondary/60">
          {detectedLanguage}
        </span>
      </div>

      {/* Question Text Card - Dark Graph Paper Style */}
      <div className="p-5 rounded-2xl bg-card border border-border space-y-2">
        <span className="text-xs font-mono text-accent font-bold uppercase tracking-wider flex items-center gap-1">
          <span className="text-accent">↳</span> Active Challenge Exercise :-
        </span>
        <p className="text-base font-sans leading-relaxed text-foreground select-text inline-block">
          {currentQuiz.question_text}
        </p>
      </div>

      {/* Submit Action */}
      <Button
        onClick={onSubmit}
        disabled={isEvaluating}
        className="w-full bg-accent hover:bg-accent/90 text-white font-bold font-mono h-10 px-4 flex items-center justify-center gap-2 cursor-pointer text-sm rounded-xl shadow-lg"
      >
        <Send className="w-4 h-4" />
        {isEvaluating ? "Evaluating answer..." : "Evaluate Solution & Sync Frontmatter"}
      </Button>

      <div className="h-px w-full bg-foreground/30"></div>
      {/* Evaluation Results */}
      {evaluation && (
        <div className="space-y-4 pt-2 animate-fade-in  font-mono">
          {/* Result header banner */}
          <div className={cn(
            "p-4 rounded-2xl border flex items-center gap-3",
            evaluation.passed
              ? "bg-green-500/10 border-green-500/30 text-green-500"
              : "bg-amber-500/10 border-amber-500/30 text-amber-500"
          )}>
            {evaluation.passed ? (
              <CheckCircle2 className="w-5 h-5 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 shrink-0" />
            )}
            <div className="flex-1">
              <h4 className="text-base font-bold uppercase tracking-wide">
                {evaluation.passed ? "Challenge Mastered! " : "Review Suggested "}
              </h4>
              <span className="text-sm opacity-90 block mt-0.5 font-mono">
                Similarity Score: <span className="font-bold">{(evaluation.similarity_score * 100).toFixed(0)}%</span>
              </span>
            </div>
          </div>

          {/* Feedback */}
          <div className="p-4 rounded-2xl bg-card border border-border space-y-1.5 select-text">
            <span className="text-sm font-mono text-accent uppercase tracking-wider block">Feedback Hint :-</span>
            <p className="text-sm leading-relaxed text-foreground/90 font-sans">{evaluation.feedback_hint}</p>
          </div>

          {/* Mutated Agent Note Assignment for Failed Quiz */}
          {!evaluation.passed && (
            <div className="p-4 rounded-2xl bg-[#241724] border border-accent/40 space-y-3 font-mono">
              <div className="flex items-center gap-2 text-accent text-xs font-bold uppercase">
                <AlertTriangle className="w-4 h-4 animate-pulse" />
                <span>Mutated Agent Reinforcement Task Assigned</span>
              </div>
              <p className="text-xs text-accent/90 font-sans leading-relaxed">
                Knowledge gap detected! The Mutated Curriculum Agent asks you to create or update a note covering the missing concepts to unlock full topic mastery.
              </p>
              <Button
                onClick={() => {
                  const targetTopic = evaluation.missing_concepts?.[0] || "Quiz Concept";
                  if (typeof window !== "undefined") {
                    window.dispatchEvent(new CustomEvent("open-note", { detail: targetTopic }));
                  }
                }}
                className="w-full bg-accent/80 hover:bg-accent/90 text-foreground font-bold h-9 px-3 text-xs rounded-xl cursor-pointer flex items-center justify-center gap-2"
              >
                Create / Edit Note on "{evaluation.missing_concepts?.[0] || "Missing Topic"}"
              </Button>
            </div>
          )}

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
                      <span className={res.passed ? "text-primary font-bold" : (res.is_missing_module || res.stderr?.includes("ModuleNotFoundError") ? "text-amber-400 font-bold" : "text-red-400 font-bold")}>
                        {res.passed ? "PASSED" : (res.is_missing_module || res.stderr?.includes("ModuleNotFoundError") ? "ENV PACKAGE NOTE" : "FAILED")}
                      </span>
                    </div>
                    {res.is_missing_module || res.stderr?.includes("ModuleNotFoundError") || res.stderr?.includes("ImportError") ? (
                      <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] font-mono leading-relaxed mt-1 flex items-start gap-1.5">
                        <span className="shrink-0">ℹ️</span>
                        <span>
                          <strong>Environment Note:</strong> Library <code>{res.missing_module || "external module"}</code> is not pre-installed in execution runtime. Solution evaluated conceptually by AI Judge.
                        </span>
                      </div>
                    ) : (
                      <>
                        {res.input && <div><span className="text-muted-foreground/75">Input:</span> {res.input}</div>}
                        <div><span className="text-muted-foreground/75">Expected:</span> {res.expected}</div>
                        <div><span className="text-muted-foreground/75">Actual:</span> {res.actual || (res.stderr ? `Error: ${res.stderr.split('\n')[0]}` : "No output")}</div>
                      </>
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
