"use client";

import React from "react";
import { Button } from "./ui/button";
import { GraduationCap, Sparkles } from "lucide-react";
import { FilePayload } from "@/lib/file-directory";

interface QuizWelcomeProps {
  selectedNotePath: string;
  setSelectedNotePath: (path: string) => void;
  onStart: () => void;
  isGenerating: boolean;
  notesFiles: FilePayload[];
}

export default function QuizWelcome({
  selectedNotePath,
  setSelectedNotePath,
  onStart,
  isGenerating,
  notesFiles,
}: QuizWelcomeProps) {
  return (
    <div className="flex flex-col h-full justify-center max-w-md mx-auto space-y-5 py-8 select-none">
      <div className="flex items-center gap-2.5">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <GraduationCap className="w-5 h-5 text-primary" />
        </div>
        <h1 className="text-xl font-bold tracking-tight">Active Recall Quiz</h1>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-semibold text-foreground">Select a note topic to test yourself:</p>
        <select
          value={selectedNotePath}
          onChange={(e) => setSelectedNotePath(e.target.value)}
          className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer font-medium"
        >
          <option value="">-- Select a Topic --</option>
          {notesFiles.map((file) => {
            const parts = file.path.split("/");
            const cleanName = (parts[parts.length - 1] || "").replace(/\.md$/i, "");
            return (
              <option key={file.path} value={file.path}>
                {cleanName}
              </option>
            );
          })}
        </select>
      </div>

      <Button
        onClick={onStart}
        disabled={isGenerating || !selectedNotePath}
        className="bg-primary hover:bg-primary/95 text-primary-foreground font-semibold h-10 px-4 flex items-center justify-center gap-1.5 cursor-pointer w-full"
      >
        <Sparkles className="w-4 h-4" />
        {isGenerating ? "Generating challenge..." : "Generate Quiz Challenge"}
      </Button>
    </div>
  );
}
