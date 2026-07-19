"use client";

import React, { useState, useMemo } from "react";
import { Button } from "./ui/button";
import { useWorkspace } from "@/context/WorkspaceContext";

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

  // Combine everything to list all scanned terms and vault files
  const items = useMemo(() => {
    // Collect all unique terms from both scanned codebase terms and existing vault files
    const allTermsSet = new Set<string>();
    
    sortedTerms.forEach((t) => allTermsSet.add(t.trim()));
    gaps.forEach((g) => allTermsSet.add(g.term.trim()));
    existingNotes.forEach((n) => allTermsSet.add(n.term.trim()));

    const list = Array.from(allTermsSet).map((term) => {
      const cleanTerm = term.toLowerCase().trim();
      const note = existingNotesMap.get(cleanTerm);
      const gap = gapsMap.get(cleanTerm);

      return {
        term,
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
    <div className="w-full h-full flex flex-col bg-background text-foreground overflow-hidden">
      {/* Top action header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 border-b border-border shrink-0 bg-muted/20">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            Workspace Debt Analysis
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Overview of knowledge base coverage and missing documentation.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleReScan}
            disabled={isLoading}
            className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold cursor-pointer h-9 px-4 flex items-center gap-1.5"
          >
            {isLoading ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                Scanning...
              </>
            ) : (
              "Re-scan"
            )}
          </Button>
          <Button
            onClick={resetWorkspace}
            disabled={isLoading}
            variant="outline"
            className="border-border text-muted-foreground hover:text-foreground text-xs cursor-pointer h-9 px-4"
          >
            Reset
          </Button>
        </div>
      </div>

      {/* Stats counter grid */}
      <div className="grid grid-cols-3 gap-4 px-6 py-4 border-b border-border shrink-0 bg-card">
        <div className="bg-muted/30 border border-border p-3.5 rounded-lg text-center">
          <div className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground">Scanned Items</div>
          <div className="text-xl font-bold text-foreground mt-1">
            {scanResult?.total_terms_scanned || items.length}
          </div>
        </div>
        <div className="bg-amber-500/5 border border-amber-500/20 p-3.5 rounded-lg text-center">
          <div className="text-[10px] uppercase font-mono tracking-wider text-amber-500 font-semibold">Gaps Found</div>
          <div className="text-xl font-bold text-amber-500 mt-1">
            {scanResult?.gaps_found || gaps.length}
          </div>
        </div>
        <div className="bg-primary/5 border border-primary/20 p-3.5 rounded-lg text-center">
          <div className="text-[10px] uppercase font-mono tracking-wider text-primary font-semibold">Saved Notes</div>
          <div className="text-xl font-bold text-primary mt-1">
            {existingNotes.length}
          </div>
        </div>
      </div>

      {/* Tabs and search filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 px-6 py-3 border-b border-border bg-muted/10 shrink-0">
        {/* Tab buttons */}
        <div className="flex items-center bg-muted p-1 rounded-lg border border-border self-start">
          <button
            onClick={() => setActiveTab("all")}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "all"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            All Items ({items.length})
          </button>
          <button
            onClick={() => setActiveTab("gaps")}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "gaps"
                ? "bg-amber-500/10 text-amber-500 shadow-sm border border-amber-500/10"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Gaps Only ({gaps.length})
          </button>
          <button
            onClick={() => setActiveTab("notes")}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "notes"
                ? "bg-primary/10 text-primary shadow-sm border border-primary/10"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Notes Only ({existingNotes.length})
          </button>
        </div>

        {/* Search Input */}
        <div className="w-full sm:w-60">
          <input
            type="text"
            placeholder="Search technical terms..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-foreground"
          />
        </div>
      </div>

      {/* Results content list */}
      <div className="flex-1 overflow-y-auto p-6 space-y-3">
        {filteredItems.length === 0 ? (
          <div className="h-40 flex flex-col items-center justify-center border border-dashed border-border rounded-lg text-center p-6">
            <span className="text-xl">🔍</span>
            <p className="text-xs text-muted-foreground mt-2">No matching items found in scan results.</p>
          </div>
        ) : (
          filteredItems.map((item) => (
            <div
              key={item.term}
              className={`border p-4 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all duration-200 ${
                item.isGap
                  ? "bg-amber-500/5 hover:bg-amber-500/10 border-amber-500/20 hover:border-amber-500/30"
                  : "bg-card hover:bg-muted/30 border-border hover:border-primary/20"
              }`}
            >
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex items-center flex-wrap gap-2">
                  <span className="font-mono text-sm font-bold text-foreground truncate max-w-xs sm:max-w-md">
                    {item.term}
                  </span>
                  
                  {item.isGap ? (
                    <span className="text-[9px] font-mono font-bold tracking-wider px-2 py-0.5 bg-amber-500/10 text-amber-500 rounded-full border border-amber-500/25 uppercase shrink-0">
                      GAP
                    </span>
                  ) : (
                    <span className="text-[9px] font-mono font-bold tracking-wider px-2 py-0.5 bg-primary/10 text-primary rounded-full border border-primary/25 uppercase shrink-0">
                      SAVED
                    </span>
                  )}
                  
                  {item.classification !== "existing_note" && (
                    <span className="text-[9px] font-mono px-2 py-0.5 bg-muted text-muted-foreground rounded-full border border-border uppercase shrink-0">
                      {item.classification.replace("_", " ")}
                    </span>
                  )}
                </div>
                
                <p className="text-xs text-muted-foreground leading-relaxed max-w-2xl font-sans">
                  {item.reason}
                </p>
                
                <div className="text-[10px] font-mono text-muted-foreground/60 truncate">
                  Source: {item.sources.join(", ")}
                </div>
              </div>

              {item.isGap ? (
                <Button
                  onClick={() => {
                    if (typeof window !== "undefined") {
                      window.dispatchEvent(new CustomEvent("open-note", { detail: item.term }));
                    }
                  }}
                  className="h-8 text-xs bg-amber-500 hover:bg-amber-600 text-black font-bold shrink-0 px-4 cursor-pointer border border-amber-500/10"
                >
                  Fill Gap
                </Button>
              ) : (
                <Button variant="ghost" className="h-8 text-xs text-primary font-semibold shrink-0 px-3 cursor-default hover:bg-transparent">
                  ✓ Documented
                </Button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
