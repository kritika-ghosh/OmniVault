"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { GraduationCap, Sparkles, Play } from "lucide-react";
import { FilePayload } from "@/lib/file-directory";

interface QuizWelcomeProps {
  selectedNotePath: string;
  setSelectedNotePath: (path: string) => void;
  onStart: () => void;
  onDemo: () => void;
  isGenerating: boolean;
  notesFiles: FilePayload[];
}

export default function QuizWelcome({
  selectedNotePath,
  setSelectedNotePath,
  onStart,
  onDemo,
  isGenerating,
  notesFiles,
}: QuizWelcomeProps) {
  const uniqueNotesFiles = React.useMemo(() => {
    const seen = new Set<string>();
    return notesFiles.filter((file) => {
      if (!file.path || seen.has(file.path)) return false;
      seen.add(file.path);
      return true;
    });
  }, [notesFiles]);

  return (
    <div className="flex flex-col h-full justify-center max-w-lg mx-auto space-y-6 py-8 select-none font-sans">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-accent/10 border border-accent/60 flex items-center justify-center text-accent">
          <GraduationCap className="w-6 h-6 text-accent" />
        </div>
        <div>
          <h1 className="text-2xl font-bold font-sans text-foreground">Active Recall Quiz Sheet</h1>
          <p className="text-sm font-sans tracking-tight text-muted-foreground">Select a note topic from your vault to generate a challenge</p>
        </div>
      </div>

      <div className="space-y-3 bg-card p-5 rounded-2xl border border-border">
        <label className="font-sans text-foreground text-base underline underline-offset-4 block">
          Select Vault Topic :-
        </label>
        <select
          value={selectedNotePath}
          onChange={(e) => setSelectedNotePath(e.target.value)}
          className="w-full h-10 px-3 rounded-xl border border-border bg-muted text-sm font-mono text-foreground focus:outline-none focus:border-primary cursor-pointer"
        >
          <option value="" className="bg-card text-foreground">-- Select a Topic --</option>
          {uniqueNotesFiles.map((file) => {
            const parts = file.path.split("/");
            const cleanName = (parts[parts.length - 1] || "").replace(/\.md$/i, "");
            return (
              <option key={file.path} value={file.path} className="bg-card text-foreground">
                {cleanName}
              </option>
            );
          })}
        </select>

        <div className="space-y-2 pt-1">
          <Button
            onClick={onStart}
            disabled={isGenerating || !selectedNotePath}
            className="bg-accent hover:bg-accent/90 text-white font-mono font-bold text-sm h-10 px-4 flex items-center justify-center gap-2 cursor-pointer w-full rounded-xl shadow-lg"
          >
            <Sparkles className="w-4 h-4" />
            {isGenerating ? "Generating challenge..." : "Generate Quiz Exercise Sheet"}
          </Button>

          <div className="relative flex py-1 items-center">
            <div className="grow border-t border-border/60"></div>
            <span className="shrink mx-2 text-[10px] font-mono text-muted-foreground uppercase">or</span>
            <div className="grow border-t border-border/60"></div>
          </div>

          <Button
            onClick={onDemo}
            disabled={isGenerating}
            variant="outline"
            className="w-full border-primary/40 bg-primary/10 hover:bg-primary/20 text-primary font-mono font-bold text-sm h-10 px-4 flex items-center justify-center gap-2 cursor-pointer rounded-xl transition-all"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            Try Demo Challenge (Mock Response)
          </Button>
        </div>
      </div>
    </div>
  );
}
