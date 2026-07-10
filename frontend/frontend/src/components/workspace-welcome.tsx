"use client";

import React from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { useWorkspace } from "@/context/WorkspaceContext";

export default function WorkspaceWelcome() {
  const {
    apiHost,
    setApiHost,
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
    <div className="w-full flex-1 flex flex-col items-center justify-center p-6 md:p-12 overflow-y-auto">
      <div className="max-w-2xl w-full flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* Welcome message with text clipping */}
        <div className="text-center space-y-3">
          <h1 className="text-5xl font-extrabold tracking-tight bg-linear-to-r from-primary via-amber-400 to-emerald-400 bg-clip-text text-transparent pb-1">
            Good Morning!
          </h1>
          <p className="text-xs font-mono text-muted-foreground/80 tracking-wide">
            // Analyze dependencies, code imports, and identify knowledge debt in your notes.
          </p>
        </div>

        {/* Configuration Card */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-2xl space-y-6">
          <div className="border-b border-border pb-3 flex items-center justify-between">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" /> 
              Initialize Workspace Scan
            </h2>
            <span className="text-[10px] font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">
              Web API
            </span>
          </div>

          {/* Host input */}
          <div className="flex flex-col gap-2">
            <label className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider">
              API Base Host
            </label>
            <Input
              type="text"
              value={apiHost}
              onChange={(e) => setApiHost(e.target.value)}
              className="bg-background border-border text-foreground focus-visible:ring-primary font-mono text-xs h-10"
            />
          </div>

          {/* Directory Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Project Folder */}
            <div className="bg-muted/30 border border-border p-4 rounded-lg flex flex-col gap-3">
              <label className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider">
                Project Files Folder
              </label>
              <div className="flex items-center gap-2">
                <Button 
                  onClick={handleSelectProjectDir}
                  disabled={isLoading}
                  className="bg-secondary hover:bg-secondary/80 text-secondary-foreground text-xs border border-border h-9 px-3 shrink-0 cursor-pointer font-semibold"
                >
                  Choose Folder
                </Button>
                <div className="text-xs font-mono text-foreground truncate bg-background px-2.5 py-2 rounded border border-border w-full">
                  {projectPath || "No folder selected..."}
                </div>
              </div>
              {projectHandle && (
                <span className="text-[10px] text-emerald-500 font-semibold flex items-center gap-1 font-mono">
                  ● Handles Attached
                </span>
              )}
            </div>

            {/* Notes Folder */}
            <div className="bg-muted/30 border border-border p-4 rounded-lg flex flex-col gap-3">
              <label className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider">
                Notes Vault Folder
              </label>
              <div className="flex items-center gap-2">
                <Button 
                  onClick={handleSelectNotesDir}
                  disabled={isLoading}
                  className="bg-secondary hover:bg-secondary/80 text-secondary-foreground text-xs border border-border h-9 px-3 shrink-0 cursor-pointer font-semibold"
                >
                  Choose Folder
                </Button>
                <div className="text-xs font-mono text-foreground truncate bg-background px-2.5 py-2 rounded border border-border w-full">
                  {notesPath || "No folder selected..."}
                </div>
              </div>
              {notesHandle && (
                <span className="text-[10px] text-emerald-500 font-semibold flex items-center gap-1 font-mono">
                  ● Handles Attached
                </span>
              )}
            </div>
          </div>

          {/* Scan button */}
          <Button
            onClick={executeScan}
            disabled={isLoading || (!projectPath && !projectHandle)}
            className="w-full py-6 text-xs font-bold tracking-widest uppercase bg-primary hover:bg-primary/95 text-primary-foreground disabled:bg-muted disabled:text-muted-foreground rounded-lg transition-all shadow-md shadow-primary/10 cursor-pointer"
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                Scanning Workspace...
              </div>
            ) : (
              "Execute Workspace Scan"
            )}
          </Button>

          {/* Load Mock Data button */}
          <div className="flex justify-center border-t border-border pt-4">
            <Button
              onClick={loadMockData}
              variant="outline"
              disabled={isLoading}
              className="text-xs text-muted-foreground border-border hover:bg-muted hover:text-foreground cursor-pointer font-semibold px-4 h-9 w-full flex items-center justify-center gap-1.5"
            >
              🚀 Load Mock Data (UI Testing)
            </Button>
          </div>
        </div>

        {/* Status log */}
        {statusMessage && (
          <div className="text-center font-mono text-xs text-amber-500 bg-amber-500/10 border border-amber-500/20 py-3 px-4 rounded-lg shadow-sm">
            {statusMessage}
          </div>
        )}
      </div>
    </div>
  );
}
