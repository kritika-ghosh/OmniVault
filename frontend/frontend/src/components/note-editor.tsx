"use client";

import React, { useState, useEffect, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import { Button } from "./ui/button";
import { useWorkspace } from "@/context/WorkspaceContext";
import { API_PATHS } from "@/lib/api-paths";
import { Save, Edit2, Eye, Check, Sparkles, Link2 } from "lucide-react";
import { mockNotesFiles } from "@/lib/data";

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
    return `[${label.trim()}](wiki://${encodeURIComponent(target.trim())})`;
  });
  // Replace [[TargetNote]]
  processed = processed.replace(/\[\[([^\]]+)\]\]/g, (match, target) => {
    return `[${target.trim()}](wiki://${encodeURIComponent(target.trim())})`;
  });
  return processed;
}

interface NoteEditorProps {
  noteName: string;
}

export default function NoteEditor({ noteName }: NoteEditorProps) {
  const { notesFiles, saveNote, statusMessage, apiHost, scanResult } = useWorkspace();
  const [content, setContent] = useState("");
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showSavedIndicator, setShowSavedIndicator] = useState(false);

  // Suggestions states
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionQuery, setSuggestionQuery] = useState("");
  const [cursorPosition, setCursorPosition] = useState(0);

  const filename = noteName.endsWith(".md") ? noteName : `${noteName}.md`;

  // Hydrate content from context on load
  useEffect(() => {
    const cleanTarget = noteName.replace(/\.md$/i, "").toLowerCase();
    const existingFile = notesFiles.find((file) => {
      const fileBase = file.path.split("/").pop() || "";
      return fileBase.replace(/\.md$/i, "").toLowerCase() === cleanTarget;
    });

    if (existingFile) {
      setContent(existingFile.content);
    } else {
      // Default template for a new gap note
      setContent(
        `---\ntitle: ${noteName}\ntags: [tech, gap]\ncreated: ${new Date().toISOString().split("T")[0]}\nconfidence_level: 0.20\n---\n\n# ${noteName} :-\n\nThis note was synthesized for the knowledge gap **${noteName}**.\n\n## Overview :-\nAdd overview notes here...\n\n## Code Example :-\n\`\`\`javascript\n// Reference code...\n\`\`\`\n`
      );
    }
  }, [noteName, notesFiles]);

  const handleSave = async () => {
    setIsSaving(true);
    await saveNote(filename, content);
    setIsSaving(false);
    setShowSavedIndicator(true);
    setTimeout(() => setShowSavedIndicator(false), 2000);
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setActiveTab("edit");
    try {
      const synthesizeUrl = `${apiHost}${API_PATHS.SYNTHESIZE}`;
      const response = await safeFetch(synthesizeUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          term: noteName,
          project_context: "General Tech Stack Workspace",
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

  // Backlinks calculations
  const backlinks = useMemo(() => {
    const cleanTarget = noteName.replace(/\.md$/i, "").toLowerCase();
    return notesFiles.filter((file) => {
      const fileBase = file.path.split("/").pop() || "";
      if (fileBase.replace(/\.md$/i, "").toLowerCase() === cleanTarget) return false;
      const lowerContent = file.content.toLowerCase();
      return lowerContent.includes(`[[${cleanTarget}`) || lowerContent.includes(`[[${cleanTarget}.md`);
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
          /* PREVIEW MODE - DARK GRAPH PAPER NOTEBOOK VIEW */
          <div className="flex-1 w-full h-full p-8 overflow-y-auto bg-graph-paper text-zinc-100 font-handwriting text-lg">
            {(() => {
              const { metadata, markdownContent } = parseMarkdown(content);
              return (
                <div className="max-w-4xl mx-auto space-y-6">
                  {metadata && (
                    <div className="p-5 rounded-2xl bg-card border border-border space-y-3 font-mono">
                      <div className="flex items-center justify-between border-b border-border pb-2">
                        <h2 className="text-base font-bold text-foreground font-handwriting text-xl notebook-underline m-0">
                          {metadata.title || noteName}
                        </h2>
                        {metadata.status && (
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-primary/20 text-primary rounded border border-primary/30 uppercase">
                            {metadata.status}
                          </span>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                        {metadata.created && (
                          <div>
                            <span className="text-muted-foreground block text-[10px] uppercase">Created</span>
                            <span className="text-foreground font-medium">{metadata.created}</span>
                          </div>
                        )}
                        {metadata.confidence_level && (
                          <div>
                            <span className="text-muted-foreground block text-[10px] uppercase">Confidence</span>
                            <span className="text-primary font-bold">{metadata.confidence_level}</span>
                          </div>
                        )}
                        {metadata.tags && (
                          <div className="col-span-2 sm:col-span-1">
                            <span className="text-muted-foreground block text-[10px] uppercase">Tags</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {metadata.tags.split(",").map(t => t.trim()).filter(Boolean).map(t => (
                                <span key={t} className="text-[9px] font-mono bg-muted px-2 py-0.5 rounded border border-border text-primary">
                                  {t}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  <div className="prose dark:prose-invert max-w-none font-handwriting text-lg leading-relaxed text-zinc-100">
                    <ReactMarkdown
                      components={{
                        h1: ({ children }) => <h1 className="text-2xl font-bold font-handwriting text-foreground notebook-underline mt-6 mb-3">{children}</h1>,
                        h2: ({ children }) => <h2 className="text-xl font-bold font-handwriting text-foreground notebook-underline mt-5 mb-2">{children}</h2>,
                        h3: ({ children }) => <h3 className="text-lg font-bold font-handwriting text-foreground notebook-underline mt-4 mb-2">{children}</h3>,
                        a: ({ href, children, ...props }) => {
                          if (href && href.startsWith("wiki://")) {
                            const target = decodeURIComponent(href.slice(7));
                            const cleanTarget = target.replace(/\.md$/i, "").toLowerCase();
                            
                            const noteExists = notesFiles.some(file => {
                              const fileBase = file.path.split("/").pop() || "";
                              return fileBase.replace(/\.md$/i, "").toLowerCase() === cleanTarget;
                            });

                            return (
                              <a
                                href="#"
                                onClick={(e) => {
                                  e.preventDefault();
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
    </div>
  );
}
