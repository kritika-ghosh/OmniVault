"use client";

import React, { useState, useEffect, useRef } from "react";
import { useWorkspace } from "@/context/WorkspaceContext";
import { API_PATHS } from "@/lib/api-paths";
import { Search, FileText, Sparkles, Layers, ArrowRight, X } from "lucide-react";
import { normalizeTerm } from "@/lib/utils";

interface CommandPaletteProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function CommandPalette({ isOpen: externalIsOpen, onClose: externalOnClose }: CommandPaletteProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen;
  
  const handleClose = () => {
    if (externalOnClose) externalOnClose();
    setInternalIsOpen(false);
  };

  const { notesFiles, scanResult, apiHost } = useWorkspace();
  const [query, setQuery] = useState("");
  const [ragResults, setRagResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Global Cmd+K / Ctrl+K keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setInternalIsOpen((prev) => !prev);
      } else if (e.key === "Escape" && isOpen) {
        handleClose();
      }
    };

    const handleCustomOpen = () => setInternalIsOpen(true);

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("open-command-palette", handleCustomOpen);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("open-command-palette", handleCustomOpen);
    };
  }, [isOpen]);

  // Auto-focus input when palette opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    } else {
      setQuery("");
      setRagResults([]);
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Debounced semantic RAG search via backend vector store API
  useEffect(() => {
    if (!query.trim()) {
      setRagResults([]);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const response = await fetch(`${apiHost}${API_PATHS.SEARCH}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: query.trim(),
            notes_files: notesFiles.map((n) => ({ path: n.path, content: n.content })),
            limit: 6,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          setRagResults(data.results || []);
        } else {
          setRagResults([]);
        }
      } catch (err) {
        console.warn("RAG command palette search fallback:", err);
        setRagResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query, apiHost, notesFiles]);

  // Client-side quick filter matches for offline fallback
  const localMatches = React.useMemo(() => {
    if (!query.trim()) return [];
    const qLower = query.toLowerCase();

    const matchedNotes = notesFiles
      .filter((n) => {
        const name = (n.path.split("/").pop() || "").replace(/\.md$/i, "");
        return name.toLowerCase().includes(qLower) || n.content.toLowerCase().includes(qLower);
      })
      .slice(0, 5)
      .map((n) => {
        const name = (n.path.split("/").pop() || "").replace(/\.md$/i, "");
        return {
          term: name,
          path: n.path,
          type: "note",
          reason: n.content.slice(0, 100) + "...",
        };
      });

    const matchedGaps = (scanResult?.report || [])
      .filter((g: any) => g.term.toLowerCase().includes(qLower))
      .slice(0, 4)
      .map((g: any) => ({
        term: g.term,
        path: `${g.term}.md`,
        type: "gap",
        reason: g.reason || "Identified Knowledge Gap",
      }));

    return [...matchedNotes, ...matchedGaps];
  }, [query, notesFiles, scanResult]);

  // Combined search results
  const allResults = React.useMemo(() => {
    if (ragResults.length > 0) {
      return ragResults.map((r: any) => ({
        term: r.term || r.path || r.id || "Vault Note",
        type: r.type || "rag",
        reason: r.snippet || r.reason || r.text || "Semantic vector store match",
        similarity: r.similarity ? Math.round(r.similarity * 100) : 92,
      }));
    }
    return localMatches;
  }, [ragResults, localMatches]);

  const handleSelect = (item: any) => {
    if (!item) return;
    const noteName = item.term || item.path;
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("open-note", {
          detail: { name: noteName, autoSynthesize: item.type === "gap" },
        })
      );
    }
    handleClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (allResults.length > 0 ? (prev + 1) % allResults.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (allResults.length > 0 ? (prev - 1 + allResults.length) % allResults.length : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (allResults[selectedIndex]) {
        handleSelect(allResults[selectedIndex]);
      } else if (query.trim()) {
        handleSelect({ term: query.trim(), type: "gap" });
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/60 backdrop-blur-xs animate-fade-in font-mono select-none">
      <div
        className="w-full max-w-xl bg-[#161619] border border-white/15 rounded-2xl shadow-2xl overflow-hidden flex flex-col mx-4 animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3 border-b border-white/15 bg-[#1f1f23]">
          <Search className="w-4 h-4 text-accent shrink-0 mr-3" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Ask Vault & Codebase RAG (Search notes, gaps, code...)"
            className="w-full bg-transparent text-foreground text-xs font-mono focus:outline-none placeholder:text-muted-foreground/60"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="text-muted-foreground hover:text-foreground text-xs cursor-pointer p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <span className="text-[10px] font-bold text-muted-foreground px-2 py-0.5 rounded bg-muted border border-border ml-2 uppercase shrink-0">
            ESC
          </span>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {isSearching ? (
            <div className="p-4 text-center text-xs text-muted-foreground animate-pulse flex items-center justify-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-accent animate-spin" />
              Searching ChromaDB vector store...
            </div>
          ) : allResults.length > 0 ? (
            allResults.map((item: any, idx: number) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={idx}
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`p-3 rounded-xl cursor-pointer transition-all flex items-center justify-between border ${
                    isSelected
                      ? "bg-primary/20 border-primary/40 text-foreground shadow-xs"
                      : "border-transparent hover:bg-white/5 text-muted-foreground"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {item.type === "gap" ? (
                      <Sparkles className="w-4 h-4 text-accent shrink-0" />
                    ) : (
                      <FileText className="w-4 h-4 text-primary shrink-0" />
                    )}
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-foreground truncate">
                          {item.term}
                        </span>
                        {item.type === "gap" && (
                          <span className="text-[9px] px-1.5 py-0.2 bg-accent/20 text-accent rounded font-bold uppercase border border-accent/30">
                            Knowledge Gap
                          </span>
                        )}
                        {item.similarity && (
                          <span className="text-[9px] px-1.5 py-0.2 bg-primary/20 text-primary rounded font-bold uppercase border border-primary/30">
                            {item.similarity}% match
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-muted-foreground truncate font-sans">
                        {item.reason}
                      </span>
                    </div>
                  </div>

                  <ArrowRight
                    className={`w-4 h-4 shrink-0 transition-transform ${
                      isSelected ? "text-primary translate-x-1" : "opacity-0"
                    }`}
                  />
                </div>
              );
            })
          ) : query.trim() ? (
            <div className="p-6 text-center text-xs text-muted-foreground space-y-2">
              <p>No exact match found in vector store.</p>
              <button
                onClick={() => handleSelect({ term: query.trim(), type: "gap" })}
                className="px-3 py-1.5 bg-accent hover:bg-accent/90 text-white font-bold text-xs rounded-xl cursor-pointer shadow-md inline-flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Synthesize New Note on "{query.trim()}"
              </button>
            </div>
          ) : (
            <div className="p-4 text-center text-xs text-muted-foreground/60 space-y-1">
              <p>Type a topic or concept to search your Obsidian vault & codebase.</p>
              <p className="text-[10px] text-muted-foreground/40">
                Press <kbd className="px-1 bg-muted rounded border border-border">↑</kbd> <kbd className="px-1 bg-muted rounded border border-border">↓</kbd> to navigate, <kbd className="px-1 bg-muted rounded border border-border">Enter</kbd> to open.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
