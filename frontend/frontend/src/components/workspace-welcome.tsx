"use client";

import React from "react";
import { Button } from "./ui/button";
import { useWorkspace } from "@/context/WorkspaceContext";
import { Folder, Play, CheckCircle2, History, Database } from "lucide-react";
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
    vaults,
  } = useWorkspace();

  const handleSelectProjectDir = async () => {
    try {
      const handle = await window.showDirectoryPicker();
      setProjectHandle(handle);
      setProjectPath(handle.name);
      setStatusMessage(`Selected project folder: ${handle.name}`);
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
      setStatusMessage(`Selected notes folder: ${handle.name}`);
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
    <div className="w-full flex-1 flex flex-col items-center justify-center p-8 overflow-y-auto bg-background text-foreground select-none">
      <div className="max-w-xl w-full space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* Typographic Header */}
        <div className="space-y-2 text-center">
          <h1 className="text-4xl font-black tracking-tight text-foreground">
            OmniVault
          </h1>
          <p className="text-xs font-mono text-muted-foreground/75 tracking-wider">
            // ANALYZE KNOWLEDGE DEBT AND SYSTEM BOUNDARIES
          </p>
        </div>

        {/* Directory Pickers (Borderless subtle row lists) */}
        <div className="space-y-4">
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest block pl-1">
              Workspace Directories
            </span>
            
            <div className="space-y-2">
              {/* Project path row */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors border border-border/20">
                <div className="flex flex-col min-w-0 pr-4">
                  <span className="text-xs font-bold text-foreground">Project Directory</span>
                  <span className="text-[11px] font-mono text-muted-foreground truncate block mt-0.5">
                    {projectPath || "Not selected"}
                  </span>
                </div>
                <Button 
                  onClick={handleSelectProjectDir}
                  disabled={isLoading}
                  variant="ghost"
                  className="text-xs hover:bg-background border border-border/40 shrink-0 cursor-pointer h-8 px-3 font-semibold"
                >
                  <Folder className="w-3.5 h-3.5 mr-1.5 text-primary" />
                  Choose
                </Button>
              </div>

              {/* Notes path row */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors border border-border/20">
                <div className="flex flex-col min-w-0 pr-4">
                  <span className="text-xs font-bold text-foreground">Notes Vault</span>
                  <span className="text-[11px] font-mono text-muted-foreground truncate block mt-0.5">
                    {notesPath || "Not selected"}
                  </span>
                </div>
                <Button 
                  onClick={handleSelectNotesDir}
                  disabled={isLoading}
                  variant="ghost"
                  className="text-xs hover:bg-background border border-border/40 shrink-0 cursor-pointer h-8 px-3 font-semibold"
                >
                  <Folder className="w-3.5 h-3.5 mr-1.5 text-amber-500" />
                  Choose
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <Button
          onClick={executeScan}
          disabled={isLoading || (!projectPath && !projectHandle)}
          className="w-full h-12 text-xs font-bold tracking-widest uppercase bg-primary hover:bg-primary/95 text-primary-foreground disabled:bg-muted disabled:text-muted-foreground rounded-xl transition-all shadow-lg hover:shadow-primary/5 cursor-pointer flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              Scanning Vault...
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              Execute Scan
            </>
          )}
        </Button>

        {/* Vault History List */}
        {vaults && vaults.length > 0 && (
          <div className="space-y-2">
            <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest block pl-1 flex items-center gap-1.5">
              <History className="w-3.5 h-3.5 text-primary" />
              Recent Vaults
            </span>
            <div className="grid grid-cols-1 gap-1.5 max-h-48 overflow-y-auto pr-1">
              {vaults.map((vaultPath) => (
                <button
                  key={vaultPath}
                  onClick={() => {
                    setNotesPath(vaultPath);
                    setStatusMessage(`Restored vault path: ${vaultPath}`);
                  }}
                  className="flex items-center justify-between text-xs font-mono text-muted-foreground hover:text-foreground hover:bg-muted/40 px-3.5 py-2.5 rounded-xl border border-border/20 bg-muted/10 transition-all text-left cursor-pointer truncate"
                >
                  <span className="truncate pr-4 flex items-center gap-2">
                    <Database className="w-3.5 h-3.5 shrink-0 text-amber-500/80" />
                    {vaultPath}
                  </span>
                  <span className="text-[9px] font-sans font-semibold text-primary shrink-0">
                    Load Path
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Status Messaging */}
        {statusMessage && (
          <div className="flex items-center gap-2 font-mono text-xs text-amber-500 bg-amber-500/10 border border-amber-500/20 py-3 px-4 rounded-xl shadow-xs select-text">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-amber-500" />
            <span className="flex-1">{statusMessage}</span>
          </div>
        )}
      </div>
    </div>
  );
}
