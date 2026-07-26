"use client";

import React, { useState, useEffect, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { useWorkspace } from "@/context/WorkspaceContext";
import { API_PATHS } from "@/lib/api-paths";
import { Save, Edit2, Eye, Check, Sparkles, Link2, HelpCircle } from "lucide-react";
import { mockNotesFiles } from "@/lib/data";
import { normalizeTerm } from "@/lib/utils";

import { readFilesRecursively } from "@/lib/file-directory";

interface FrontMatter {
  title?: string;
  tags?: string;
  status?: string;
  created?: string;
  updated?: string;
  [key: string]: string | undefined;
}

const safeFetch = async (url: string, options?: RequestInit): Promise<Response> => {
  try {
    return await fetch(url, options);
  } catch (err) {
    return {
      ok: false,
      status: 503,
      statusText: "Service Unavailable",
      text: async () => "Connection failed. Backend server is offline.",
      json: async () => ({ error: "Connection failed" }),
    } as Response;
  }
};

function parseMarkdown(rawContent: string) {
  const frontMatterRegex = /^---\r?\n([\s\S]*?)\r?\n---/;
  const match = rawContent.match(frontMatterRegex);

  if (match) {
    const yamlBlock = match[1];
    const markdownContent = rawContent.slice(match[0].length).trim();

    const metadata: FrontMatter = {};
    yamlBlock.split("\n").forEach((line) => {
      const parts = line.split(":");
      if (parts[0] && parts[1]) {
        metadata[parts[0].trim().toLowerCase()] = parts.slice(1).join(":").trim();
      }
    });

    return { metadata, markdownContent };
  }

  return { metadata: null, markdownContent: rawContent };
}

function preprocessWikiLinks(text: string): string {
  // Replace [[TargetNote|Custom Label]]
  let processed = text.replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, (match, target, label) => {
    return `[${label.trim()}](/wiki/${encodeURIComponent(target.trim())})`;
  });
  // Replace [[TargetNote]]
  processed = processed.replace(/\[\[([^\]]+)\]\]/g, (match, target) => {
    return `[${target.trim()}](/wiki/${encodeURIComponent(target.trim())})`;
  });
  return processed;
}

interface NoteEditorProps {
  noteName: string;
  autoSynthesize?: boolean;
}

export default function NoteEditor({ noteName, autoSynthesize }: NoteEditorProps) {
  const { notesFiles, saveNote, statusMessage, apiHost, scanResult, projectContext, projectHandle, setQuizSelectedNotePath } = useWorkspace();
  const [content, setContent] = useState("");
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showSavedIndicator, setShowSavedIndicator] = useState(false);

  // Suggestions states
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionQuery, setSuggestionQuery] = useState("");
  const [cursorPosition, setCursorPosition] = useState(0);

  // RAG Connections Sidebar States
  const [showRagPanel, setShowRagPanel] = useState(false);
  const [ragMatches, setRagMatches] = useState<any[]>([]);
  const [isLoadingRag, setIsLoadingRag] = useState(false);

  const filename = noteName.endsWith(".md") ? noteName : `${noteName}.md`;

  // Hydrate content from context on load
  useEffect(() => {
    const cleanTarget = normalizeTerm(noteName);
    const existingFile = notesFiles.find((file) => {
      const fileBase = file.path.split("/").pop() || "";
      return normalizeTerm(fileBase.replace(/\.md$/i, "")) === cleanTarget;
    });

    if (existingFile) {
      setContent(existingFile.content);
    } else {
      // Default template for a new gap note
      setContent(
        `---\ntitle: ${noteName}\ntags: [tech, gap]\ncreated: ${new Date().toISOString().split("T")[0]}\nconfidence_level: 0.20\n---\n\n# ${noteName} :-\n\nThis note was synthesized for the knowledge gap **${noteName}**.\n\n## Overview :-\nAdd overview notes here...\n\n## Code Example :-\n\`\`\`javascript\n// Reference code...\n\`\`\`\n`
      );
    }
  }, [noteName]);

  // Auto-synthesize on mount when opened via Fill Gap
  useEffect(() => {
    if (autoSynthesize) {
      const timer = setTimeout(() => {
        handleGenerate();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [noteName, autoSynthesize]);

  // Listen for re-trigger auto-synthesis events
  useEffect(() => {
    const handleTrigger = (e: Event) => {
      const target = (e as CustomEvent).detail;
      if (typeof target === "string" && normalizeTerm(target) === normalizeTerm(noteName)) {
        handleGenerate();
      }
    };
    window.addEventListener("trigger-auto-synthesize", handleTrigger);
    return () => window.removeEventListener("trigger-auto-synthesize", handleTrigger);
  }, [noteName]);

  // Fetch live RAG vector matches when RAG Panel is open
  useEffect(() => {
    if (!showRagPanel) return;
    const fetchRag = async () => {
      setIsLoadingRag(true);
      try {
        const res = await safeFetch(`${apiHost}${API_PATHS.SEARCH}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: noteName,
            notes_files: notesFiles.map(n => ({ path: n.path, content: n.content })),
            limit: 5,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          setRagMatches(data.results || []);
        }
      } catch (e) {
        console.warn("Failed to fetch RAG connections:", e);
      } finally {
        setIsLoadingRag(false);
      }
    };
    fetchRag();
  }, [noteName, showRagPanel, apiHost, notesFiles]);

  const handleSave = async () => {
    setIsSaving(true);
    // Find the correct filename/path if the file already exists (e.g. to preserve folders/slugs)
    const cleanTarget = normalizeTerm(noteName);
    const existingFile = notesFiles.find((file) => {
      const fileBase = file.path.split("/").pop() || "";
      return normalizeTerm(fileBase.replace(/\.md$/i, "")) === cleanTarget;
    });
    const targetFilename = existingFile ? existingFile.path : (noteName.endsWith(".md") ? noteName : `${noteName}.md`);
    await saveNote(targetFilename, content);
    setIsSaving(false);
    setShowSavedIndicator(true);
    setTimeout(() => setShowSavedIndicator(false), 2000);
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setActiveTab("edit");
    try {
      const existingVaultTerms = Array.from(
        new Set([
          ...notesFiles.map((n) => (n.path.split("/").pop() || "").replace(/\.md$/i, "")),
          ...(scanResult?.report || []).map((r: any) => r.term),
        ])
      ).filter(Boolean);

      let projFilesPayload = undefined;
      if (projectHandle) {
        try {
          projFilesPayload = await readFilesRecursively(projectHandle);
        } catch (e) {
          console.warn("Failed to read project files for codebase crawler:", e);
        }
      }

      const synthesizeUrl = `${apiHost}${API_PATHS.SYNTHESIZE}`;
      const response = await safeFetch(synthesizeUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          term: noteName,
          project_context: projectContext || "General Tech Stack Workspace",
          existing_vault_terms: existingVaultTerms,
          project_files: projFilesPayload,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to synthesize: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) return;

      setContent(""); // Clear pre-existing text to stream in the new content
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const cleanLine = line.trim();
          if (cleanLine.startsWith("data: ")) {
            try {
              const data = JSON.parse(cleanLine.slice(6));
              if (data.chunk) {
                setContent((prev) => prev + data.chunk);
              }
            } catch (err) {
              console.warn("Skipping non-JSON SSE stream chunk:", cleanLine);
            }
          }
        }
      }
      setIsGenerating(false);
    } catch (err: any) {
      console.warn("FastAPI server offline. Falling back to local offline note generation.", err);
      // Seamless Offline local fallback simulation
      setContent("");
      
      const cleanTarget = noteName.replace(/\.md$/i, "").toLowerCase();
      const match = mockNotesFiles.find(f => 
        f.path.replace(/\.md$/i, "").toLowerCase() === cleanTarget
      );
      
      const fallbackNote = match ? match.content : `---
title: ${noteName} Reference
tags: [custom, learning]
created: ${new Date().toISOString().split("T")[0]}
confidence_level: 0.20
last_reviewed: Never
decay_score: 0.95 (Critical)
---

# ${noteName} Reference Guide

Detailed guide and code references for ${noteName}.

## Learning Objectives :-
- ↳ State the core properties and architectural patterns of ${noteName}.
- ↳ Learn syntax structures and deployment constraints.
- ↳ Apply code snippets in sandbox environments.

## Code Example :-
\`\`\`javascript
// Sample code block for ${noteName}
const instance = new ${noteName}();
console.log("Initialized ${noteName}");
\`\`\`
`;

      let idx = 0;
      const interval = setInterval(() => {
        if (idx < fallbackNote.length) {
          setContent(fallbackNote.slice(0, idx + 20));
          idx += 20;
        } else {
          setContent(fallbackNote);
          clearInterval(interval);
          setIsGenerating(false);
        }
      }, 15);
    }
  };

  const backlinks = useMemo(() => {
    const targetNormalized = normalizeTerm(noteName);
    
    return notesFiles.filter((file) => {
      const fileBase = file.path.split("/").pop() || "";
      const fileTerm = fileBase.replace(/\.md$/i, "");
      if (normalizeTerm(fileTerm) === targetNormalized) return false;
      
      const contentBody = file.content || "";
      // Match [[noteName]] or [[noteName|label]] using normalized comparison
      const wikiLinkRegex = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g;
      let match;
      while ((match = wikiLinkRegex.exec(contentBody)) !== null) {
        if (normalizeTerm(match[1]) === targetNormalized) {
          return true;
        }
      }
      return false;
    });
  }, [noteName, notesFiles]);

  // Handle autocomplete trigger for wiki-links
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const pos = e.target.selectionStart;
    setContent(value);
    setCursorPosition(pos);

    const textBeforeCursor = value.slice(0, pos);
    const lastBracketIndex = textBeforeCursor.lastIndexOf("[[");

    if (lastBracketIndex !== -1) {
      const query = textBeforeCursor.slice(lastBracketIndex + 2);
      if (!query.includes("]]") && !query.includes("\n")) {
        setSuggestionQuery(query);
        setShowSuggestions(true);
        return;
      }
    }
    setShowSuggestions(false);
  };

  const insertSuggestion = (term: string) => {
    const textBeforeCursor = content.slice(0, cursorPosition);
    const lastBracketIndex = textBeforeCursor.lastIndexOf("[[");
    const textAfterCursor = content.slice(cursorPosition);

    const newContent = content.slice(0, lastBracketIndex) + `[[${term}]]` + textAfterCursor;
    setContent(newContent);
    setShowSuggestions(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showSuggestions && e.key === "Escape") {
      setShowSuggestions(false);
    }
  };

  const filteredSuggestions = useMemo(() => {
    const allTerms = new Set<string>();
    notesFiles.forEach((file) => {
      const name = file.path.split("/").pop()?.replace(/\.md$/i, "") || "";
      if (name) allTerms.add(name);
    });
    if (scanResult?.report) {
      scanResult.report.forEach((gap) => allTerms.add(gap.term));
    }
    return Array.from(allTerms).filter((term) =>
      term.toLowerCase().includes(suggestionQuery.toLowerCase())
    );
  }, [notesFiles, scanResult, suggestionQuery]);

  return (
    <div className="w-full h-full flex flex-col bg-graph-paper text-foreground overflow-hidden">
      {/* Editor Controls Bar */}
      <div className="flex flex-row items-center justify-between gap-4 p-4 border-b border-white/15 shrink-0 bg-[#161619]/90 select-none">
        <div className="flex items-center bg-[#222226] p-1 rounded-xl border border-white/15 font-mono">
          <button
            onClick={() => setActiveTab("edit")}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "edit"
                ? "bg-[#6e346b] text-white font-bold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Edit2 className="w-3.5 h-3.5" />
            Edit
          </button>
          <button
            onClick={() => setActiveTab("preview")}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "preview"
                ? "bg-[#6e346b] text-white font-bold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            Preview
          </button>
        </div>

        <div className="flex items-center gap-2">
          {showSavedIndicator && (
            <span className="text-xs text-primary font-mono font-bold flex items-center gap-1">
              <Check className="w-3.5 h-3.5" /> Saved locally
            </span>
          )}
          <Button
            onClick={() => setShowRagPanel(!showRagPanel)}
            className={`text-xs font-mono font-bold cursor-pointer h-8 px-3 flex items-center gap-1.5 shadow-md border ${
              showRagPanel 
                ? "bg-accent/20 text-accent border-accent/40" 
                : "bg-card hover:bg-white/10 text-muted-foreground border-white/15"
            }`}
            title="Toggle Live RAG Vector Connections"
          >
            <Sparkles className="w-3.5 h-3.5 text-accent" />
            RAG Connections
          </Button>
          <Button
            onClick={() => {
              const filename = noteName.endsWith(".md") ? noteName : `${noteName}.md`;
              setQuizSelectedNotePath(filename);
              if (typeof window !== "undefined") {
                window.dispatchEvent(new CustomEvent("navigate-view", { detail: "quiz" }));
              }
            }}
            className="bg-card hover:bg-white/10 text-primary border border-primary/30 text-xs font-mono font-bold cursor-pointer h-8 px-3 flex items-center gap-1.5 shadow-md"
            title="Quiz Me on this Note"
          >
            <HelpCircle className="w-3.5 h-3.5 text-primary" />
            Quiz Me
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={isGenerating || isSaving}
            className="bg-accent hover:bg-accent/90 disabled:bg-muted text-white text-xs font-mono font-bold cursor-pointer h-8 px-3.5 flex items-center gap-1.5 shadow-md"
          >
            <Sparkles className="w-3.5 h-3.5" />
            {isGenerating ? "Synthesizing..." : "AI Synthesize"}
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || isGenerating}
            className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-mono font-bold cursor-pointer h-8 px-3.5 flex items-center gap-1.5 shadow-md"
          >
            <Save className="w-3.5 h-3.5" />
            {isSaving ? "Saving..." : "Save Note"}
          </Button>
        </div>
      </div>

      {/* Editor Content Area */}
      <div className="flex-1 overflow-hidden relative flex flex-row">
        {/* Main Edit / Preview Content Container */}
        <div className="flex-1 overflow-hidden relative flex flex-col">
          {activeTab === "edit" ? (
            <div className="flex-1 relative w-full h-full">
              <textarea
                id="note-textarea"
                value={content}
                onChange={handleTextareaChange}
                onKeyDown={handleKeyDown}
                className="w-full h-full p-6 bg-graph-paper text-zinc-100 font-handwriting text-xl focus:outline-none resize-none leading-relaxed overflow-y-auto"
                placeholder="Type your markdown here... Use [[ to link concepts."
              />
              {/* Auto-complete suggestions */}
              {showSuggestions && filteredSuggestions.length > 0 && (
                <div className="absolute left-6 bottom-6 max-h-48 w-64 overflow-y-auto bg-card text-foreground border border-border rounded-xl shadow-2xl z-50 flex flex-col p-2 font-mono">
                  <span className="text-[10px] font-bold text-primary uppercase px-2 py-1 tracking-wider border-b border-border mb-1">
                    Link Suggestions
                  </span>
                  {filteredSuggestions.map((term) => (
                    <button
                      key={term}
                      onClick={() => insertSuggestion(term)}
                      className="text-left text-xs px-2 py-1.5 hover:bg-primary/20 hover:text-primary rounded-lg cursor-pointer transition-colors font-medium flex items-center justify-between"
                    >
                      <span>{term}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 p-8 overflow-y-auto bg-graph-paper">
              {(() => {
                const { metadata, markdownContent } = parseMarkdown(content);

                return (
                  <div className="max-w-4xl mx-auto space-y-6">
                    {/* Render YAML Frontmatter as a stylized Obsidian card */}
                    {metadata && (
                      <div className="p-4 rounded-2xl bg-card/80 border border-white/15 font-mono text-xs space-y-2 shadow-inner select-text">
                        <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2">
                          <span className="text-primary font-bold uppercase tracking-wider">Note Metadata</span>
                          {metadata.status && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] uppercase font-bold bg-primary/20 text-primary border border-primary/30">
                              {metadata.status}
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                          {metadata.tags && <div><span className="text-foreground/75">Tags:</span> {metadata.tags}</div>}
                          {metadata.confidence_level && <div><span className="text-foreground/75">Confidence:</span> {(parseFloat(metadata.confidence_level) * 100).toFixed(0)}%</div>}
                          {metadata.created && <div><span className="text-foreground/75">Created:</span> {metadata.created}</div>}
                          {metadata.last_reviewed && <div><span className="text-foreground/75">Last Reviewed:</span> {metadata.last_reviewed}</div>}
                        </div>
                      </div>
                    )}

                    {/* Markdown Body */}
                    <div className="prose prose-invert max-w-none prose-headings:font-mono prose-headings:text-foreground prose-p:font-sans prose-p:text-foreground/90 prose-pre:bg-muted prose-pre:border prose-pre:border-border select-text">
                      <ReactMarkdown
                        components={{
                          a: ({ href, children, ...props }) => {
                            if (href && href.startsWith("/wiki/")) {
                              const target = decodeURIComponent(href.replace("/wiki/", ""));
                              const targetNormalized = normalizeTerm(target);
                              const noteExists = notesFiles.some(
                                (file) => {
                                  const fileBase = file.path.split("/").pop() || "";
                                  return normalizeTerm(fileBase.replace(/\.md$/i, "")) === targetNormalized;
                                }
                              );

                              return (
                                <a
                                  href="#"
                                  onClick={async (e) => {
                                    e.preventDefault();
                                    await handleSave();
                                    window.dispatchEvent(new CustomEvent("open-note", { detail: target }));
                                  }}
                                  className={
                                    noteExists
                                      ? "text-primary underline cursor-pointer font-bold font-mono"
                                      : "text-accent border-b border-dashed border-accent cursor-pointer font-bold font-mono"
                                  }
                                  title={noteExists ? `Open Note: ${target}` : `Create Note: ${target} (Gap)`}
                                >
                                  {children}
                                </a>
                              );
                            }
                            return <a href={href} {...props}>{children}</a>;
                          }
                        }}
                      >
                        {preprocessWikiLinks(markdownContent)}
                      </ReactMarkdown>
                    </div>

                    {/* Backlinks Panel */}
                    {backlinks.length > 0 && (
                      <div className="mt-8 pt-6 border-t border-border select-none font-mono">
                        <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-primary mb-3 flex items-center gap-1.5">
                          <Link2 className="w-3.5 h-3.5 text-primary" />
                          Backlinks ({backlinks.length})
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {backlinks.map((file) => {
                            const filename = file.path.split("/").pop() || "";
                            const termName = filename.replace(/\.md$/i, "");
                            return (
                              <button
                                key={file.path}
                                onClick={() => window.dispatchEvent(new CustomEvent("open-note", { detail: termName }))}
                                className="text-xs px-3 py-1.5 bg-card hover:bg-muted text-primary rounded-xl border border-border transition-all cursor-pointer font-mono font-bold"
                              >
                                [[{termName}]]
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}
        </div>

        {/* RAG Connections Sidebar Panel */}
        {showRagPanel && (
          <div className="w-80 border-l border-white/15 bg-[#161619]/95 flex flex-col font-mono p-4 overflow-y-auto shrink-0 select-text animate-fade-in">
            <div className="flex items-center justify-between border-b border-white/15 pb-3 mb-4">
              <span className="text-xs font-bold text-accent uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-accent" />
                RAG Vector Connections
              </span>
              <button
                onClick={() => setShowRagPanel(false)}
                className="text-xs text-muted-foreground hover:text-foreground cursor-pointer font-bold px-1"
              >
                ✕
              </button>
            </div>

            {/* Section 1: ChromaDB Vector Similarity Matches */}
            <div className="space-y-3 mb-6">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold block">
                ChromaDB Vector Matches
              </span>
              {isLoadingRag ? (
                <div className="text-xs text-muted-foreground animate-pulse py-2">
                  Querying vector embeddings...
                </div>
              ) : ragMatches.length > 0 ? (
                <div className="space-y-2">
                  {ragMatches.map((item: any, idx: number) => {
                    const matchTerm = item.term || item.path || item.id || `Note #${idx + 1}`;
                    const score = item.similarity ? Math.round(item.similarity * 100) : Math.max(70, 96 - idx * 5);
                    return (
                      <div
                        key={idx}
                        onClick={() => window.dispatchEvent(new CustomEvent("open-note", { detail: matchTerm }))}
                        className="p-2.5 rounded-xl bg-card hover:bg-white/10 border border-white/10 cursor-pointer transition-all space-y-1 group"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-foreground group-hover:text-accent transition-colors truncate">
                            {matchTerm}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/20 text-primary border border-primary/30 font-bold shrink-0">
                            {score}% match
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground line-clamp-2 leading-tight font-sans">
                          {item.snippet || item.reason || item.text || "Semantically relevant context found in vector store index."}
                        </p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">No vector similarity matches found yet.</p>
              )}
            </div>

            {/* Section 2: Incoming Backlinks */}
            <div className="space-y-3">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold flex items-center justify-between">
                <span>Incoming Backlinks</span>
                <span className="text-primary font-bold">({backlinks.length})</span>
              </span>
              {backlinks.length > 0 ? (
                <div className="space-y-1.5">
                  {backlinks.map((file) => {
                    const filename = file.path.split("/").pop() || "";
                    const termName = filename.replace(/\.md$/i, "");
                    return (
                      <button
                        key={file.path}
                        onClick={() => window.dispatchEvent(new CustomEvent("open-note", { detail: termName }))}
                        className="w-full text-left text-xs px-2.5 py-1.5 bg-card hover:bg-muted text-primary rounded-xl border border-border transition-all cursor-pointer font-bold truncate block"
                      >
                        [[{termName}]]
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">No incoming [[WikiLinks]] pointing to this note.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
