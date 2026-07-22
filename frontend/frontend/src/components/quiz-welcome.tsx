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
    <div className="flex flex-col h-full justify-center max-w-md mx-auto space-y-6 py-8 select-none font-sans">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/30 flex items-center justify-center text-accent">
          <GraduationCap className="w-5 h-5 text-accent" />
        </div>
        <div>
          <h1 className="text-2xl font-bold font-handwriting text-foreground notebook-underline">Active Recall Quiz Sheet</h1>
          <p className="text-xs font-mono text-muted-foreground">Select a note topic from your vault to generate a challenge</p>
        </div>
      </div>

      <div className="space-y-2 bg-card p-5 rounded-2xl border border-border">
        <label className="text-xs font-handwriting text-foreground text-base notebook-underline block">
          Select Vault Topic :-
        </label>
        <select
          value={selectedNotePath}
          onChange={(e) => setSelectedNotePath(e.target.value)}
          className="w-full h-10 px-3 rounded-xl border border-border bg-muted text-xs font-mono text-foreground focus:outline-none focus:border-primary cursor-pointer"
        >
          <option value="" className="bg-card text-foreground">-- Select a Topic --</option>
          {notesFiles.map((file) => {
            const parts = file.path.split("/");
            const cleanName = (parts[parts.length - 1] || "").replace(/\.md$/i, "");
            return (
              <option key={file.path} value={file.path} className="bg-card text-foreground">
                {cleanName}
              </option>
            );
          })}
        </select>

        <Button
          onClick={onStart}
          disabled={isGenerating || !selectedNotePath}
          className="bg-accent hover:bg-accent/90 text-white font-mono font-bold text-xs h-10 px-4 flex items-center justify-center gap-2 cursor-pointer w-full mt-3 rounded-xl shadow-lg"
        >
          <Sparkles className="w-4 h-4" />
          {isGenerating ? "Generating challenge..." : "Generate Quiz Exercise Sheet"}
        </Button>
      </div>
    </div>
  );
}
