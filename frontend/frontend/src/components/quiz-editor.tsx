"use client";

import React, { useState, useEffect, useMemo } from "react";
import Editor from "@monaco-editor/react";
import { useWorkspace } from "@/context/WorkspaceContext";
import { Terminal } from "lucide-react";

export default function QuizEditor() {
  const { currentQuiz, quizUserCode, setQuizUserCode } = useWorkspace();
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

  const detectedLanguage = useMemo(() => {
    if (!currentQuiz?.code_snippet) return "javascript";
    const snippet = currentQuiz.code_snippet;
    if (snippet.includes("def ") || snippet.includes("import ") || snippet.includes("print(")) {
      return "python";
    }
    return "javascript";
  }, [currentQuiz]);

  if (!currentQuiz) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center select-none bg-muted/5">
        <Terminal className="w-10 h-10 text-muted-foreground/30 mb-2" />
        <span className="text-xs font-bold text-muted-foreground">Answer Terminal Offline</span>
        <span className="text-[10px] text-muted-foreground/60 mt-1 max-w-xs">
          Generate a challenge to activate the Monaco workspace.
        </span>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col overflow-hidden bg-muted/5 relative">
      <div className="px-4 py-2 border-b border-border bg-muted/10 shrink-0 select-none text-[10px] font-mono text-muted-foreground/75">
        interactive_quiz_solution.{detectedLanguage === "python" ? "py" : "js"}
      </div>
      <div className="flex-1 w-full h-full overflow-hidden">
        <Editor
          key={detectedLanguage} // Fix: Forces Monaco to remount with the correct syntax validator, clearing redlines!
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
    </div>
  );
}
