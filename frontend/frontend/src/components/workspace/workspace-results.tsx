"use client";

import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { useWorkspace } from "@/context/WorkspaceContext";
import { RefreshCw, RotateCcw, Search, Sparkles, CheckCircle2 } from "lucide-react";

interface WorkspaceResultsProps {
  vaultPath?: string;
}

export default function WorkspaceResults({ vaultPath }: WorkspaceResultsProps) {
  const {
    vaultSessions,
    isLoading,
    executeScan,
    resetWorkspace,
    activeVaultPath,
  } = useWorkspace();

  const resolvedVaultPath = vaultPath || activeVaultPath;
  const activeSession = vaultSessions[resolvedVaultPath] || null;

  const scanResult = activeSession ? activeSession.scanResult : null;
  const sortedTerms = activeSession ? activeSession.sortedTerms : [];
  const notesFiles = activeSession ? activeSession.notesFiles : [];

  const currentVaultPath = resolvedVaultPath || "Local Vault";
  const dirName = currentVaultPath.split(/[/\\]/).pop() || currentVaultPath;

  const handleReScan = () => {
    if (activeSession) {
      executeScan(activeSession.projectPath, activeSession.notesPath);
    }
  };

  const [activeTab, setActiveTab] = useState<"all" | "gaps" | "notes">("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Parse notes file names into clean terms
  const existingNotes = useMemo(() => {
    return notesFiles.map((file) => {
      const parts = file.path.split("/");
      const filename = parts[parts.length - 1] || "";
      return {
        term: filename.replace(/\.md$/i, ""),
        path: file.path,
        content: file.content,
      };
    });
  }, [notesFiles]);

  const existingNotesMap = useMemo(() => {
    const map = new Map<string, typeof existingNotes[0]>();
    existingNotes.forEach((note) => {
      map.set(note.term.toLowerCase().trim(), note);
    });
    return map;
  }, [existingNotes]);

  // Gaps from scan report
  const gaps = useMemo(() => {
    return scanResult?.report || [];
  }, [scanResult]);

  const gapsMap = useMemo(() => {
    const map = new Map<string, typeof gaps[0]>();
    gaps.forEach((gap) => {
      map.set(gap.term.toLowerCase().trim(), gap);
    });
    return map;
  }, [gaps]);

  // Combine everything to list all scanned terms and vault files (case-insensitively deduplicated)
  const items = useMemo(() => {
    const normalizedTermsMap = new Map<string, string>();

    const addTerm = (rawTerm: string) => {
      const trimmed = rawTerm.trim();
      if (!trimmed) return;
      const key = trimmed.toLowerCase();
      if (!normalizedTermsMap.has(key)) {
        normalizedTermsMap.set(key, trimmed);
      } else {
        const existing = normalizedTermsMap.get(key)!;
        if (existing === existing.toLowerCase() && trimmed !== trimmed.toLowerCase()) {
          normalizedTermsMap.set(key, trimmed);
        }
      }
    };

    gaps.forEach((g) => addTerm(g.term));
    existingNotes.forEach((n) => addTerm(n.term));
    sortedTerms.forEach((t) => addTerm(t));

    const list = Array.from(normalizedTermsMap.entries()).map(([cleanTerm, displayTerm]) => {
      const note = existingNotesMap.get(cleanTerm);
      const gap = gapsMap.get(cleanTerm);
      const finalTerm = gap?.term || note?.term || displayTerm;

      return {
        term: finalTerm,
        isGap: !!gap,
        isNote: !!note,
        classification: gap?.classification || "existing_note",
        reason: gap?.reason || `Note file is present in notes vault.`,
        sources: gap?.detected_from || [note?.path || "Notes Vault"],
      };
    });

    // Sort: gaps first, then notes alphabetically
    return list.sort((a, b) => {
      if (a.isGap && !b.isGap) return -1;
      if (!a.isGap && b.isGap) return 1;
      return a.term.localeCompare(b.term);
    });
  }, [sortedTerms, gaps, existingNotes, existingNotesMap, gapsMap]);

  // Filter items based on active tab and search query
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesTab =
        activeTab === "all" ||
        (activeTab === "gaps" && item.isGap) ||
        (activeTab === "notes" && item.isNote);
      
      const matchesSearch = item.term.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesTab && matchesSearch;
    });
  }, [items, activeTab, searchQuery]);

  return (
    <div className="w-full h-full flex flex-col bg-graph-paper text-foreground overflow-hidden">
      {/* Header Bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0 bg-[#0c1117] font-mono">
        <div className="space-y-0.5">
          <h1 className="text-xl font-bold text-foreground tracking-tight font-handwriting text-2xl">
            {dirName} Notes Dashboard
          </h1>
          <p className="text-xs text-muted-foreground">
            {scanResult ? `Scanned Vault: ${currentVaultPath}` : `Obsidian Notes Vault: ${currentVaultPath}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => {
              if (typeof window !== "undefined") {
                window.dispatchEvent(new CustomEvent("open-project-analyzer"));
              }
            }}
            className="bg-accent hover:bg-accent/90 text-white font-mono font-bold text-xs cursor-pointer h-9 px-4 flex items-center gap-1.5 shadow-md"
          >
            <Sparkles className="w-3.5 h-3.5" />
            {scanResult ? "Re-scan Codebase" : "Connect Project Codebase"}
          </Button>
          <Button
            onClick={resetWorkspace}
            disabled={isLoading}
            variant="outline"
            className="border-border bg-card text-muted-foreground hover:text-foreground font-mono text-xs cursor-pointer h-9 px-4"
          >
            Reset
          </Button>
        </div>
      </div>

      {/* Pure Note-Taking Banner if codebase is not yet scanned */}
      {!scanResult && (
        <div className="mx-6 mt-4 p-3.5 rounded-xl bg-primary/10 border border-primary/30 text-xs font-mono text-foreground flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2.5">
            <span className="text-base">📝</span>
            <div>
              <span className="font-bold text-primary">Pure Note-Taking Mode Active</span>
              <p className="text-[11px] text-muted-foreground">Your notes vault is connected. Open any note from the sidebar tree to edit or create notes. Click <strong>Connect Project Codebase</strong> to run AI AST Gap Detection!</p>
            </div>
          </div>
          <Button
            onClick={() => {
              if (typeof window !== "undefined") {
                window.dispatchEvent(new CustomEvent("open-project-analyzer"));
              }
            }}
            className="bg-card hover:bg-muted text-primary border border-primary/40 text-[11px] font-mono font-bold h-8 px-3 shrink-0 cursor-pointer"
          >
            Connect Codebase
          </Button>
        </div>
      )}

      {/* Stats counter grid - Dark Notebook Cards */}
      <div className="grid grid-cols-3 gap-4 px-6 py-4 border-b border-border shrink-0 bg-[#0d1420]/50">
        <div className="bg-card border border-border p-3.5 rounded-xl text-center">
          <div className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground">Vault Markdown Notes</div>
          <div className="text-2xl font-bold text-foreground mt-0.5 font-mono">
            {existingNotes.length}
          </div>
        </div>
        <div className="bg-accent/10 border border-accent/30 p-3.5 rounded-xl text-center">
          <div className="text-[10px] uppercase font-mono tracking-wider text-accent font-semibold">Gaps Found</div>
          <div className="text-2xl font-bold text-accent mt-0.5 font-mono">
            {scanResult ? (scanResult.gaps_found || gaps.length) : "Pending Code Connection"}
          </div>
        </div>
        <div className="bg-primary/10 border border-primary/30 p-3.5 rounded-xl text-center">
          <div className="text-[10px] uppercase font-mono tracking-wider text-primary font-semibold">Saved Notes</div>
          <div className="text-2xl font-bold text-primary mt-0.5 font-mono">
            {existingNotes.length}
          </div>
        </div>
      </div>

      {/* Tabs and search filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 px-6 py-3 border-b border-border bg-muted/80 shrink-0">
        {/* Tab buttons */}
        <div className="flex items-center bg-card p-1 rounded-xl border border-border self-start font-mono">
          <button
            onClick={() => setActiveTab("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "all"
                ? "bg-[#6e346b] text-white font-bold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            All Items ({items.length})
          </button>
          <button
            onClick={() => setActiveTab("gaps")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "gaps"
                ? "bg-accent/20 text-accent font-bold border border-accent/30"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Gaps Only ({gaps.length})
          </button>
          <button
            onClick={() => setActiveTab("notes")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "notes"
                ? "bg-primary/20 text-primary font-bold border border-primary/30"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Notes Only ({existingNotes.length})
          </button>
        </div>

        {/* Search Input */}
        <div className="w-full sm:w-60 relative">
          <input
            type="text"
            placeholder="Search terms..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-1.5 bg-[#0a0f16] border border-border rounded-xl text-xs font-mono text-foreground focus:outline-none focus:border-primary pl-8"
          />
          <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-2.5" />
        </div>
      </div>

      {/* Results content list */}
      <div className="flex-1 overflow-y-auto p-6 space-y-3">
        {filteredItems.length === 0 ? (
          <div className="h-40 flex flex-col items-center justify-center border border-dashed border-border rounded-2xl text-center p-6 bg-card">
            <Search className="w-8 h-8 text-muted-foreground/60 mb-2" />
            <p className="text-xs font-mono text-muted-foreground">No matching items found in scan results.</p>
          </div>
        ) : (
          filteredItems.map((item) => (
            <div
              key={item.term}
              className={`border p-4.5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all duration-200 ${
                item.isGap
                  ? "bg-accent/5 hover:bg-accent/10 border-accent/30"
                  : "bg-card hover:bg-muted border-border"
              }`}
            >
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex items-center flex-wrap gap-2">
                  <span className={`${item.isGap ? "text-accent" : "text-primary"} font-bold font-mono`}>↳</span>
                  <span className="font-handwriting text-lg font-bold text-foreground truncate max-w-xs sm:max-w-md">
                    {item.term}
                  </span>
                  
                  {item.isGap ? (
                    <span className="text-[9px] font-mono font-bold tracking-wider px-2 py-0.5 bg-accent/20 text-accent rounded-md border border-accent/30 uppercase shrink-0">
                      GAP
                    </span>
                  ) : (
                    <span className="text-[9px] font-mono font-bold tracking-wider px-2 py-0.5 bg-primary/20 text-primary rounded-md border border-primary/30 uppercase shrink-0">
                      SAVED
                    </span>
                  )}
                  
                  {item.classification !== "existing_note" && (
                    <span className="text-[9px] font-mono px-2 py-0.5 bg-muted text-muted-foreground rounded-md border border-border uppercase shrink-0">
                      {item.classification.replace("_", " ")}
                    </span>
                  )}
                </div>
                
                <p className="text-xs text-muted-foreground leading-relaxed max-w-2xl font-sans">
                  {item.reason}
                </p>
                
                <div className="text-[10px] font-mono text-muted-foreground/75 truncate">
                  Source: {item.sources.join(", ")}
                </div>
              </div>

              {item.isGap ? (
                <Button 
                  onClick={() => {
                    if (typeof window !== "undefined") {
                      window.dispatchEvent(new CustomEvent("open-note", { detail: { name: item.term, autoSynthesize: true } }));
                    }
                  }}
                  className="h-8 text-xs bg-accent hover:bg-accent/90 text-white font-bold font-mono shrink-0 px-4 cursor-pointer shadow-md"
                >
                  <Sparkles className="w-3.5 h-3.5 mr-1" /> Fill Gap
                </Button>
              ) : (
                <Button 
                  onClick={() => window.dispatchEvent(new CustomEvent("open-note", { detail: item.term }))}
                  variant="ghost" 
                  className="h-8 text-xs text-primary font-mono font-semibold shrink-0 px-3 hover:bg-primary/10 cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Documented Note →
                </Button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
