"use client";

import React, { useState, useEffect, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { useWorkspace } from "@/context/WorkspaceContext";
import { API_PATHS } from "@/lib/api-paths";
import { Save, Edit2, Eye, Check, Sparkles, Link2, HelpCircle, ChevronDown, Settings, LucideAtom } from "lucide-react";
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

function getCaretCoordinates(element: HTMLTextAreaElement, position: number) {
  if (typeof window === "undefined") return { top: 0, left: 0 };
  const style = window.getComputedStyle(element);

  const div = document.createElement("div");
  document.body.appendChild(div);

  const styleProperties = [
    "direction",
    "boxSizing",
    "width",
    "height",
    "overflowX",
    "overflowY",
    "borderWidth",
    "borderStyle",
    "paddingTop",
    "paddingRight",
    "paddingBottom",
    "paddingLeft",
    "fontStyle",
    "fontVariant",
    "fontWeight",
    "fontStretch",
    "fontSize",
    "fontSizeAdjust",
    "lineHeight",
    "fontFamily",
    "textAlign",
    "textTransform",
    "textIndent",
    "textDecoration",
    "letterSpacing",
    "wordSpacing",
    "tabSize",
    "MozTabSize"
  ];

  styleProperties.forEach((prop) => {
    // @ts-ignore
    div.style[prop] = style[prop];
  });

  div.style.position = "absolute";
  div.style.visibility = "hidden";
  div.style.whiteSpace = "pre-wrap";
  div.style.wordBreak = "break-word";

  const content = element.value.substring(0, position);
  div.textContent = content;

  const span = document.createElement("span");
  span.textContent = ".";
  div.appendChild(span);

  const left = span.offsetLeft - element.scrollLeft;
  const top = span.offsetTop - element.scrollTop;

  document.body.removeChild(div);

  return { top, left };
}

interface NoteEditorProps {
  noteName: string;
  autoSynthesize?: boolean;
}

export default function NoteEditor({ noteName, autoSynthesize }: NoteEditorProps) {
  const { notesFiles, saveNote, statusMessage, apiHost, scanResult, projectContext, projectHandle, editorFontStyle, editorFontSize } = useWorkspace();
  const [content, setContent] = useState("");
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("preview");
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showSavedIndicator, setShowSavedIndicator] = useState(false);

  // Suggestions states
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionQuery, setSuggestionQuery] = useState("");
  const [cursorPosition, setCursorPosition] = useState(0);
  const [suggestionCoords, setSuggestionCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  // RAG Connections Sidebar States
  const [showRagPanel, setShowRagPanel] = useState(false);
  const [ragMatches, setRagMatches] = useState<any[]>([]);
  const [isLoadingRag, setIsLoadingRag] = useState(false);
  const [isAiMenuOpen, setIsAiMenuOpen] = useState(false);

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
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("show-toast", { detail: { id: "save-note", message: "Saving note to vault...", type: "loading" } }));
    }
    
    try {
      const cleanTarget = normalizeTerm(noteName);
      const existingFile = notesFiles.find((file) => {
        const fileBase = file.path.split("/").pop() || "";
        return normalizeTerm(fileBase.replace(/\.md$/i, "")) === cleanTarget;
      });
      const targetFilename = existingFile ? existingFile.path : (noteName.endsWith(".md") ? noteName : `${noteName}.md`);
      await saveNote(targetFilename, content);
      setIsSaving(false);
      setShowSavedIndicator(true);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("show-toast", { detail: { id: "save-note", message: `Note "${noteName}" saved successfully!`, type: "success" } }));
      }
      setTimeout(() => setShowSavedIndicator(false), 2000);
    } catch (err: any) {
      setIsSaving(false);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("show-toast", { detail: { id: "save-note", message: `Failed to save note: ${err.message || err}`, type: "error" } }));
      }
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setActiveTab("edit");
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("show-toast", { detail: { id: "synthesis", message: `AI Synthesizing content for "${noteName}"...`, type: "loading" } }));
    }
    
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
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("show-toast", { detail: { id: "synthesis", message: `AI Synthesis for "${noteName}" completed!`, type: "success" } }));
      }
    } catch (err: any) {
      console.warn("FastAPI server offline. Falling back to local offline note generation.", err);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("show-toast", { detail: { id: "synthesis", message: `Server offline. Using local synthesis fallback...`, type: "loading" } }));
      }
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
          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("show-toast", { detail: { id: "synthesis", message: `Local synthesis fallback completed!`, type: "success" } }));
          }
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

        const textarea = e.target;
        setTimeout(() => {
          const coords = getCaretCoordinates(textarea, pos);
          setSuggestionCoords({
            top: coords.top + 24, // below the text line
            left: coords.left
          });
        }, 0);
        return;
      }
    }
    setShowSuggestions(false);
  };

  const handleTextareaScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    if (showSuggestions) {
      const textarea = e.currentTarget;
      const coords = getCaretCoordinates(textarea, cursorPosition);
      setSuggestionCoords({
        top: coords.top + 24,
        left: coords.left
      });
    }
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
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 border-b border-white/15 shrink-0 bg-muted/50 select-none">
        <div className="flex items-center p-1 rounded-xl border border-white/15 font-mono">
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
          
        </div>

        <div className="flex flex-wrap items-center gap-2 relative">
          {showSavedIndicator && (
            <span className="text-xs text-primary font-mono font-bold flex items-center gap-1 mr-2">
              <Check className="w-3.5 h-3.5" /> Saved locally
            </span>
          )}

          {/* Settings Trigger Button */}
          <Button
            onClick={() => {
              if (typeof window !== "undefined") {
                window.dispatchEvent(new CustomEvent("open-settings-modal"));
              }
            }}
            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground bg-card border border-white/15 hover:bg-white/10 rounded-lg cursor-pointer flex items-center justify-center"
            title="Open Editor Typography Settings"
          >
            <Settings className="w-4 h-4" />
          </Button>

          {/* AI Tools Dropdown Menu */}
          <div className="relative">
            <Button
              onClick={() => setIsAiMenuOpen(!isAiMenuOpen)}
              className={`text-xs font-mono font-bold cursor-pointer h-8 px-3 flex items-center gap-1.5 shadow-md border ${
                isAiMenuOpen || showRagPanel
                  ? "bg-accent/20 text-accent border-accent/40"
                  : "bg-card hover:bg-white/10 text-muted-foreground border-white/15"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-accent" />
              <span>AI Tools</span>
              <ChevronDown className="w-3 h-3 text-muted-foreground" />
            </Button>

            {isAiMenuOpen && (
              <>
                {/* Backdrop overlay to close when clicking outside */}
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={() => setIsAiMenuOpen(false)}
                />
                
                <div className="absolute right-0 mt-1.5 w-52 bg-card border border-border shadow-2xl rounded-xl py-1.5 z-20 flex flex-col font-mono text-sm animate-in fade-in slide-in-from-top-2 duration-150">
                  <button
                    onClick={() => {
                      handleGenerate();
                      setIsAiMenuOpen(false);
                    }}
                    disabled={isGenerating || isSaving}
                    className="w-full px-3 py-2 text-left hover:bg-muted text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-accent shrink-0" />
                    <span>{isGenerating ? "Synthesizing..." : "AI Synthesize"}</span>
                  </button>
                  
                  <button
                    onClick={() => {
                      setShowRagPanel(!showRagPanel);
                      setIsAiMenuOpen(false);
                    }}
                    className={`w-full px-3 py-2 text-left hover:bg-muted transition-colors flex items-center gap-2 cursor-pointer ${
                      showRagPanel ? "text-accent font-bold" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <LucideAtom className="w-3.5 h-3.5 text-accent shrink-0" />
                    <span>RAG Connections</span>
                  </button>

                  <button
                    onClick={() => {
                      const filename = noteName.endsWith(".md") ? noteName : `${noteName}.md`;
                      if (typeof window !== "undefined") {
                        window.dispatchEvent(new CustomEvent("open-new-quiz", { detail: filename }));
                      }
                      setIsAiMenuOpen(false);
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-muted text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    <HelpCircle className="w-3.5 h-3.5 text-accent shrink-0" />
                    <span>Quiz Me</span>
                  </button>

                  
                </div>
              </>
            )}
          </div>

          {/* Primary Action Button: Save */}
          <Button
            onClick={handleSave}
            disabled={isSaving || isGenerating}
            className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-mono font-bold cursor-pointer h-8 px-3.5 flex items-center gap-1.5 shadow-md shrink-0"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? "Saving..." : "Save"}</span>
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
                onScroll={handleTextareaScroll}
                className={`w-full h-full p-6 bg-graph-paper text-foreground focus:outline-none resize-none leading-relaxed overflow-y-auto ${editorFontStyle} ${editorFontSize}`}
                placeholder="Type your markdown here... Use [[ to link concepts."
              />
              {/* Auto-complete suggestions */}
              {showSuggestions && filteredSuggestions.length > 0 && (
                <div 
                  style={{
                    left: `${typeof window !== "undefined" ? Math.max(16, Math.min(suggestionCoords.left, (document.getElementById("note-textarea")?.clientWidth || 800) - 270)) : suggestionCoords.left}px`,
                    top: `${suggestionCoords.top}px`
                  }}
                  className="absolute max-h-48 w-64 overflow-y-auto bg-card text-foreground border border-border rounded-xl shadow-2xl z-50 flex flex-col p-2 font-mono"
                >
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
                const displayMetadata = metadata || {
                  title: noteName,
                  tags: "documented, general",
                  status: "documented",
                  confidence_level: "1.00",
                  created: new Date().toISOString().split("T")[0]
                };

                return (
                  <div className="max-w-4xl mx-auto space-y-4">
                    {/* Render YAML Frontmatter as a stylized Obsidian card */}
                    {displayMetadata && (
                      <div className="px-4 py-2 rounded-2xl bg-card/80 border border-white/15 font-mono text-base space-y-1.5 shadow-inner select-text">
                        <div className="flex items-center justify-between border-b border-white/10 pb-1.5 mb-1.5">
                          <span className="text-primary font-bold uppercase tracking-wider text-base">Note Metadata</span>
                          {displayMetadata.status && (
                            <span className="px-2 py-0.5 rounded-full text-xs uppercase font-bold bg-primary/20 text-primary border border-primary/30">
                              {displayMetadata.status}
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-muted-foreground text-base">
                          {displayMetadata.tags && <div><span className="text-foreground/75 font-semibold">Tags:</span> {displayMetadata.tags}</div>}
                          {displayMetadata.confidence_level && <div><span className="text-foreground/75 font-semibold">Confidence:</span> {(parseFloat(displayMetadata.confidence_level) * 100).toFixed(0)}%</div>}
                          {displayMetadata.created && <div><span className="text-foreground/75 font-semibold">Created:</span> {displayMetadata.created}</div>}
                          {displayMetadata.last_reviewed && <div><span className="text-foreground/75 font-semibold">Last Reviewed:</span> {displayMetadata.last_reviewed}</div>}
                        </div>
                      </div>
                    )}

                    {/* Markdown Body */}
                    <div className={`prose prose-invert max-w-none prose-headings:font-mono prose-headings:text-foreground prose-p:text-foreground/90 prose-pre:bg-muted prose-pre:border prose-pre:border-border select-text`}>
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
                                    if (noteExists) {
                                      window.dispatchEvent(new CustomEvent("open-note", { detail: target }));
                                    } else {
                                      const filename = target.endsWith(".md") ? target : `${target}.md`;
                                      const defaultContent = `---\ntitle: ${target}\ntags: [tech, gap]\ncreated: ${new Date().toISOString().split("T")[0]}\nconfidence_level: 0.20\n---\n\n# ${target} :-\n\nThis note was synthesized for the knowledge gap **${target}**.\n\n## Overview :-\nAdd overview notes here...\n\n## Code Example :-\n\`\`\`javascript\n// Reference code...\n\`\`\`\n`;
                                      
                                      if (typeof window !== "undefined") {
                                        window.dispatchEvent(new CustomEvent("show-toast", { 
                                          detail: { id: `create-${targetNormalized}`, message: `Creating note "${target}"...`, type: "loading" } 
                                        }));
                                      }
                                      
                                      try {
                                        await saveNote(filename, defaultContent);
                                        if (typeof window !== "undefined") {
                                          window.dispatchEvent(new CustomEvent("show-toast", { 
                                            detail: { id: `create-${targetNormalized}`, message: `Note "${target}" created!`, type: "success" } 
                                          }));
                                          window.dispatchEvent(new CustomEvent("open-note", { detail: target }));
                                        }
                                      } catch (err: any) {
                                        if (typeof window !== "undefined") {
                                          window.dispatchEvent(new CustomEvent("show-toast", { 
                                            detail: { id: `create-${targetNormalized}`, message: `Failed to create note: ${err.message || err}`, type: "error" } 
                                          }));
                                        }
                                      }
                                    }
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
