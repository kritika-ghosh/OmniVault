"use client";

import React from "react";
import { Button } from "./ui/button";
import { useWorkspace } from "@/context/WorkspaceContext";
import { Folder, Play, CheckCircle2, History, Database, Sparkles, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

export default function WorkspaceWelcome() {
  const {
    projectPath,
    setProjectPath,
    notesPath,
    setNotesPath,
    projectHandle,
    setProjectHandle,
    notesHandle,
    setNotesHandle,
    isLoading,
    statusMessage,
    setStatusMessage,
    executeScan,
    loadMockData,
    vaults,
  } = useWorkspace();

  const handleSelectProjectDir = async () => {
    try {
      const handle = await window.showDirectoryPicker();
      setProjectHandle(handle);
      setProjectPath(handle.name);
      setStatusMessage(`Selected project directory: ${handle.name}`);
    } catch (err: any) {
      if (err.name === "AbortError") {
        setStatusMessage("Project folder selection cancelled.");
      } else {
        console.error(err);
        setStatusMessage(`Failed to select project directory: ${err.message}`);
      }
    }
  };

  const handleSelectNotesDir = async () => {
    try {
      const handle = await window.showDirectoryPicker();
      setNotesHandle(handle);
      setNotesPath(handle.name);
      setStatusMessage(`Selected notes directory: ${handle.name}`);
    } catch (err: any) {
      if (err.name === "AbortError") {
        setStatusMessage("Notes folder selection cancelled.");
      } else {
        console.error(err);
        setStatusMessage(`Failed to select notes directory: ${err.message}`);
      }
    }
  };

  return (
    <div className="w-full flex-1 flex flex-col items-center justify-center p-8 overflow-y-auto bg-graph-paper text-foreground select-none">
      <div className="max-w-xl w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* Header - Dark Graph Paper Vault Style */}
        <div className="space-y-3 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-card border border-border text-xs font-mono text-primary shadow-md">
            <BookOpen className="w-3.5 h-3.5" />
            <span>Graph Paper Vault Notebook</span>
          </div>

          <h1 className="text-4xl font-extrabold tracking-tight text-foreground font-handwriting">
            OmniVault Workspace
          </h1>
          <p className="text-xs font-mono text-muted-foreground">
            Select your codebase & notes directories to analyze documentation coverage
          </p>
        </div>

        {/* Directory Pickers */}
        <div className="space-y-4 bg-card p-6 rounded-2xl border border-border shadow-xl">
          <div className="flex flex-col gap-3">
            <span className="text-xs font-handwriting text-foreground text-base notebook-underline block">
              Workspace Directories :-
            </span>
            
            <div className="space-y-3">
              {/* Project path row */}
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-muted border border-border">
                <div className="flex flex-col min-w-0 pr-4">
                  <span className="text-xs font-bold text-foreground font-mono flex items-center gap-1.5">
                    <span className="text-primary">↳</span> Project Directory
                  </span>
                  <span className="text-[11px] font-mono text-muted-foreground truncate block mt-0.5">
                    {projectPath || "Not selected"}
                  </span>
                </div>
                <Button 
                  onClick={handleSelectProjectDir}
                  disabled={isLoading}
                  className="text-xs bg-card hover:bg-muted text-foreground border border-border shrink-0 cursor-pointer h-8 px-3 font-semibold font-mono"
                >
                  <Folder className="w-3.5 h-3.5 mr-1.5 text-primary" />
                  Choose
                </Button>
              </div>

              {/* Notes path row */}
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-muted border border-border">
                <div className="flex flex-col min-w-0 pr-4">
                  <span className="text-xs font-bold text-foreground font-mono flex items-center gap-1.5">
                    <span className="text-primary">↳</span> Notes Vault Directory
                  </span>
                  <span className="text-[11px] font-mono text-muted-foreground truncate block mt-0.5">
                    {notesPath || "Not selected"}
                  </span>
                </div>
                <Button 
                  onClick={handleSelectNotesDir}
                  disabled={isLoading}
                  className="text-xs bg-card hover:bg-muted text-foreground border border-border shrink-0 cursor-pointer h-8 px-3 font-semibold font-mono"
                >
                  <Folder className="w-3.5 h-3.5 mr-1.5 text-primary" />
                  Choose
                </Button>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button
              onClick={executeScan}
              disabled={isLoading || (!projectPath && !projectHandle)}
              className="flex-1 h-11 text-xs font-bold tracking-wider uppercase bg-accent hover:bg-accent/90 text-white disabled:bg-muted disabled:text-muted-foreground rounded-xl transition-all shadow-lg font-mono cursor-pointer flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Scanning Vault...
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  Execute AST Scan
                </>
              )}
            </Button>

            <Button
              onClick={loadMockData}
              disabled={isLoading}
              className="h-11 px-5 text-xs font-bold font-mono bg-card hover:bg-[#6e346b]/10 text-accent border border-accent/30 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Load Mock Demo Data
            </Button>
          </div>
        </div>

        {/* Vault History List */}
        {vaults && vaults.length > 0 && (
          <div className="space-y-2 bg-card p-4 rounded-2xl border border-border">
            <span className="text-xs font-handwriting text-foreground text-base notebook-underline block flex items-center gap-1.5">
              <History className="w-4 h-4 text-primary" />
              Recent Vault Directories :-
            </span>
            <div className="grid grid-cols-1 gap-1.5 max-h-40 overflow-y-auto pr-1">
              {vaults.map((vaultPath) => (
                <button
                  key={vaultPath}
                  onClick={() => {
                    setNotesPath(vaultPath);
                    setStatusMessage(`Restored vault path: ${vaultPath}`);
                  }}
                  className="flex items-center justify-between text-xs font-mono text-muted-foreground hover:text-foreground hover:bg-muted px-3.5 py-2.5 rounded-xl border border-border bg-card transition-all text-left cursor-pointer truncate"
                >
                  <span className="truncate pr-4 flex items-center gap-2">
                    <Database className="w-3.5 h-3.5 shrink-0 text-primary" />
                    {vaultPath}
                  </span>
                  <span className="text-[10px] font-mono text-primary shrink-0 font-bold">
                    Load Path
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Status Messaging */}
        {statusMessage && (
          <div className="flex items-center gap-2 font-mono text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 py-3 px-4 rounded-xl shadow-xs select-text">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span className="flex-1">{statusMessage}</span>
          </div>
        )}
      </div>
    </div>
  );
}
