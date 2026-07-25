"use client";

import React, { useState } from "react";
import { useWorkspace } from "@/context/WorkspaceContext";
import { Button } from "@/components/ui/button";
import { 
  Folder, 
  Play, 
  X, 
  CheckCircle2, 
  Sparkles, 
  AlertTriangle, 
  Layers, 
  FileCode2, 
  PlusCircle 
} from "lucide-react";

interface ProjectAnalyzerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ProjectAnalyzerModal({ isOpen, onClose }: ProjectAnalyzerModalProps) {
  const {
    executeScan,
    isLoading,
    statusMessage,
    scanResult,
    loadMockData,
    saveNote,
    notesPath,
  } = useWorkspace();

  const [projPath, setProjPath] = useState("");
  const [projHandle, setProjHandle] = useState<FileSystemDirectoryHandle | null>(null);

  if (!isOpen) return null;

  const handleSelectProjFolder = async () => {
    try {
      const handle = await window.showDirectoryPicker();
      setProjHandle(handle);
      setProjPath(handle.name);
    } catch (err: any) {
      if (err.name !== "AbortError") {
        console.error(err);
      }
    }
  };

  const handleRunScan = async () => {
    await executeScan(projPath, notesPath || "Local Vault", projHandle, null);
  };

  const handleCreateGapNote = async (term: string, classification: string) => {
    const template = `---
title: ${term}
tags: [gap-analysis, ${classification.toLowerCase()}]
created: ${new Date().toISOString().split("T")[0]}
confidence_level: 0.20
status: draft
---

# ${term} :-

Documentation guide for **${term}** (${classification}).

## Core Principles :-
Add technical overview and key definitions here...

## Usage & Code Example :-
\`\`\`javascript
// Reference code snippet for ${term}
\`\`\`
`;
    await saveNote(`${term}.md`, template);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("open-note", { detail: term }));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 font-sans select-none animate-in fade-in duration-200">
      <div className="bg-[#0f141c] border border-white/15 rounded-2xl max-w-2xl w-full p-6 shadow-2xl flex flex-col gap-5 max-h-[90vh] overflow-hidden text-foreground">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/20 text-primary border border-primary/30">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold font-mono text-foreground flex items-center gap-2">
                Project Codebase Analyzer
              </h2>
              <p className="text-xs font-mono text-muted-foreground">
                Scan your codebase to detect un-documented dependencies and imports against your active notes vault
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Folder Selection */}
        <div className="space-y-3 bg-[#161c26] p-4 rounded-xl border border-white/10 font-mono shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <FileCode2 className="w-4 h-4 text-primary" /> Target Codebase Directory:
              </span>
              <span className="text-[11px] text-muted-foreground truncate mt-0.5">
                {projPath || "No folder selected yet"}
              </span>
            </div>
            <Button
              onClick={handleSelectProjFolder}
              disabled={isLoading}
              className="text-xs bg-card hover:bg-muted text-foreground border border-border cursor-pointer h-8 px-3 font-semibold shrink-0"
            >
              <Folder className="w-3.5 h-3.5 mr-1.5 text-primary" />
              Select Code Folder
            </Button>
          </div>

          <div className="flex items-center gap-2 pt-2 border-t border-white/5">
            <Button
              onClick={handleRunScan}
              disabled={isLoading || (!projPath && !projHandle)}
              className="flex-1 h-9 text-xs font-bold uppercase tracking-wider bg-accent hover:bg-accent/90 text-white rounded-lg transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Scanning Codebase...
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  Analyze Codebase Gaps
                </>
              )}
            </Button>

            <Button
              onClick={loadMockData}
              disabled={isLoading}
              className="h-9 px-3 text-xs font-semibold bg-card hover:bg-white/5 text-accent border border-accent/30 rounded-lg cursor-pointer flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-accent" />
              Demo Data
            </Button>
          </div>
        </div>

        {/* Live Status Message & Progress Indicator */}
        {statusMessage && (
          <div className="flex items-center gap-2 font-mono text-xs text-primary bg-primary/10 border border-primary/20 p-3 rounded-xl shrink-0">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-primary" />
            <span className="truncate">{statusMessage}</span>
          </div>
        )}

        {/* Gap Results List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[160px]">
          {!scanResult ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-xs font-mono text-muted-foreground/60 p-6">
              <Layers className="w-8 h-8 mb-2 opacity-30 text-primary" />
              <span>Select a project folder and run an analysis to view knowledge gaps.</span>
            </div>
          ) : (
            <div className="space-y-3 font-mono">
              <div className="flex items-center justify-between text-xs font-bold text-foreground border-b border-white/10 pb-2">
                <span>Total Terms Scanned: {scanResult.total_terms_scanned}</span>
                <span className="text-accent">Knowledge Gaps: {scanResult.gaps_found}</span>
              </div>

              {scanResult.report.length === 0 ? (
                <div className="text-xs text-emerald-400 p-4 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-center font-bold">
                  🎉 100% Documentation Coverage! No missing gap notes detected.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2">
                  {scanResult.report.map((gap) => (
                    <div
                      key={gap.term}
                      className="p-3 bg-[#161c26] border border-white/10 hover:border-accent/40 rounded-xl flex items-center justify-between gap-3 transition-colors"
                    >
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-foreground">{gap.term}</span>
                          <span className="text-[9px] px-1.5 py-0.5 bg-accent/20 text-accent rounded font-semibold uppercase">
                            {gap.classification}
                          </span>
                          {(gap as any).required_expertise && (
                            <span className="text-[9px] px-1.5 py-0.5 bg-primary/20 text-primary border border-primary/30 rounded font-semibold uppercase">
                              Req: {(gap as any).required_expertise}
                            </span>
                          )}
                          {(gap as any).expertise_level && (gap as any).expertise_level !== "missing" && (
                            <span className="text-[9px] px-1.5 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded font-semibold uppercase">
                              Current: {(gap as any).expertise_level}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-muted-foreground truncate mt-1">
                          {gap.reason}
                        </span>
                      </div>

                      <Button
                        onClick={() => handleCreateGapNote(gap.term, gap.classification)}
                        className="h-7 px-2.5 text-[10px] font-bold bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg cursor-pointer flex items-center gap-1 shrink-0"
                      >
                        <PlusCircle className="w-3 h-3" />
                        {(gap as any).classification === "expertise_gap" ? "Upgrade Note" : "Create Note"}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
