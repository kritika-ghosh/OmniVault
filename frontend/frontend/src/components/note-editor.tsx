"use client";

import React, { useState, useEffect, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import { Button } from "./ui/button";
import { useWorkspace } from "@/context/WorkspaceContext";
import { API_PATHS } from "@/lib/api-paths";
import { Save, Edit2, Eye, Check, Sparkles, Link2 } from "lucide-react";

interface FrontMatter {
  title?: string;
  tags?: string;
  status?: string;
  created?: string;
  updated?: string;
  [key: string]: string | undefined;
}

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
        `# ${noteName}\n\nThis note was generated as a placeholder for the knowledge gap **${noteName}**.\n\n## Overview\nAdd your overview of ${noteName} here...\n\n## Syntax / API Reference\n\`\`\`javascript\n// Examples...\n\`\`\`\n`
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
      const response = await fetch(synthesizeUrl, {
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
            } catch (e) {
              console.error("Failed to parse SSE JSON chunk:", e);
            }
          }
        }
      }
    } catch (err) {
      console.error("AI Generation failed:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  // Find backlinks to this note
  const backlinks = useMemo(() => {
    const cleanTarget = noteName.replace(/\.md$/i, "").toLowerCase();
    
    return notesFiles.filter((file) => {
      const fileBase = file.path.split("/").pop() || "";
      const fileTerm = fileBase.replace(/\.md$/i, "").toLowerCase();
      if (fileTerm === cleanTarget) return false;
      
      const contentBody = file.content || "";
      // Match [[noteName]] or [[noteName|label]]
      const escapedNote = noteName.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
      const wikiLinkRegex = new RegExp(`\\[\\[${escapedNote}(?:\\|[^\\]]+)?\\]\\]`, "i");
      
      return wikiLinkRegex.test(contentBody);
    });
  }, [noteName, notesFiles]);

  // Suggestions for autocomplete
  const filteredSuggestions = useMemo(() => {
    const allTerms = new Set<string>();
    
    notesFiles.forEach((file) => {
      const filename = file.path.split("/").pop() || "";
      allTerms.add(filename.replace(/\.md$/i, ""));
    });
    
    if (scanResult?.report) {
      scanResult.report.forEach((gap) => {
        allTerms.add(gap.term);
      });
    }
    
    const query = suggestionQuery.toLowerCase().trim();
    if (!query) return Array.from(allTerms).slice(0, 8);
    
    return Array.from(allTerms)
      .filter((term) => term.toLowerCase().includes(query))
      .slice(0, 8);
  }, [notesFiles, scanResult, suggestionQuery]);

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    const pos = e.target.selectionStart;
    setContent(val);
    
    const textBeforeCursor = val.slice(0, pos);
    const lastOpenIdx = textBeforeCursor.lastIndexOf("[[");
    const lastCloseIdx = textBeforeCursor.lastIndexOf("]]");
    
    if (lastOpenIdx !== -1 && lastOpenIdx > lastCloseIdx) {
      const query = textBeforeCursor.slice(lastOpenIdx + 2);
      if (!query.includes("\n")) {
        setSuggestionQuery(query);
        setShowSuggestions(true);
        setCursorPosition(pos);
        return;
      }
    }
    
    setShowSuggestions(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showSuggestions) {
      if (e.key === "Escape") {
        setShowSuggestions(false);
        e.preventDefault();
      }
    }
  };

  const insertSuggestion = (termName: string) => {
    const val = content;
    const pos = cursorPosition;
    
    const textBeforeCursor = val.slice(0, pos);
    const lastOpenIdx = textBeforeCursor.lastIndexOf("[[");
    
    if (lastOpenIdx !== -1) {
      const beforeLink = val.slice(0, lastOpenIdx);
      const afterCursor = val.slice(pos);
      
      const newLink = `[[${termName}]]`;
      const newContent = beforeLink + newLink + afterCursor;
      setContent(newContent);
      setShowSuggestions(false);
      
      setTimeout(() => {
        const textarea = document.getElementById("note-textarea") as HTMLTextAreaElement;
        if (textarea) {
          textarea.focus();
          const newPos = lastOpenIdx + newLink.length;
          textarea.setSelectionRange(newPos, newPos);
        }
      }, 50);
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-background text-foreground overflow-hidden">
      {/* Editor Controls Bar */}
      <div className="flex flex-row items-center justify-between gap-4 p-4 border-b border-border shrink-0 bg-muted/10 select-none">
        <div className="flex items-center bg-muted p-0.5 rounded-lg border border-border">
          <button
            onClick={() => setActiveTab("edit")}
            className={`px-3 py-1 rounded text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "edit"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Edit2 className="w-3.5 h-3.5" />
            Edit
          </button>
          <button
            onClick={() => setActiveTab("preview")}
            className={`px-3 py-1 rounded text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "preview"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            Preview
          </button>
        </div>

        <div className="flex items-center gap-2">
          {showSavedIndicator && (
            <span className="text-[10px] text-emerald-500 font-bold flex items-center gap-1 animate-fade-in animate-out fade-out duration-300">
              <Check className="w-3 h-3" /> Saved locally
            </span>
          )}
          <Button
            onClick={handleGenerate}
            disabled={isGenerating || isSaving}
            className="bg-amber-600 hover:bg-amber-500 disabled:bg-muted text-white text-xs font-semibold cursor-pointer h-8 px-3.5 flex items-center gap-1.5 border border-amber-500/20"
          >
            <Sparkles className="w-3.5 h-3.5" />
            {isGenerating ? "Synthesizing..." : "Generate AI Note"}
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || isGenerating}
            className="bg-primary hover:bg-primary/95 text-primary-foreground text-xs font-semibold cursor-pointer h-8 px-3.5 flex items-center gap-1.5"
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
              className="w-full h-full p-6 bg-background text-foreground font-mono text-sm focus:outline-hidden resize-none leading-relaxed overflow-y-auto"
              placeholder="Type your markdown here... Use [[ to link concepts."
            />
            {/* Auto-complete suggestions */}
            {showSuggestions && filteredSuggestions.length > 0 && (
              <div className="absolute left-6 bottom-6 max-h-48 w-64 overflow-y-auto bg-popover text-popover-foreground border border-border rounded-lg shadow-md z-50 flex flex-col p-1.5 font-sans">
                <span className="text-[9px] font-bold text-muted-foreground uppercase px-2 py-1 tracking-wider border-b border-border/40 mb-1">
                  Link suggestions
                </span>
                {filteredSuggestions.map((term) => (
                  <button
                    key={term}
                    onClick={() => insertSuggestion(term)}
                    className="text-left text-xs px-2 py-1.5 hover:bg-accent hover:text-accent-foreground rounded cursor-pointer transition-colors font-medium flex items-center justify-between"
                  >
                    <span>{term}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 w-full h-full p-6 overflow-y-auto prose dark:prose-invert prose-neutral prose-sm max-w-none prose-headings:text-foreground prose-a:text-primary prose-strong:text-foreground">
            {(() => {
              const { metadata, markdownContent } = parseMarkdown(content);
              return (
                <>
                  {metadata && (
                    <div className="mb-6 p-4 rounded-lg bg-muted/40 border border-border/50 flex flex-col gap-2.5">
                      <div className="flex items-center justify-between border-b border-border/40 pb-2">
                        <h2 className="text-base font-bold text-foreground m-0 leading-none">
                          {metadata.title || noteName}
                        </h2>
                        {metadata.status && (
                          <span className="text-[10px] font-mono font-bold tracking-wider px-2 py-0.5 bg-primary/10 text-primary rounded-full border border-primary/20 uppercase shrink-0">
                            {metadata.status}
                          </span>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                        {metadata.created && (
                          <div>
                            <span className="text-muted-foreground font-mono block text-[10px] uppercase">Created</span>
                            <span className="text-foreground font-medium">{metadata.created}</span>
                          </div>
                        )}
                        {metadata.updated && (
                          <div>
                            <span className="text-muted-foreground font-mono block text-[10px] uppercase">Updated</span>
                            <span className="text-foreground font-medium">{metadata.updated}</span>
                          </div>
                        )}
                        {metadata.tags && (
                          <div className="col-span-2 sm:col-span-1">
                            <span className="text-muted-foreground font-mono block text-[10px] uppercase">Tags</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {metadata.tags.split(",").map(t => t.trim()).filter(Boolean).map(t => (
                                <span key={t} className="text-[9px] font-semibold bg-muted px-1.5 py-0.5 rounded border border-border text-muted-foreground">
                                  {t}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  <ReactMarkdown
                    components={{
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
                                  ? "text-primary underline cursor-pointer hover:text-primary/80 font-semibold"
                                  : "text-amber-500 border-b border-dashed border-amber-500 hover:text-amber-400 cursor-pointer font-semibold"
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

                  {/* Backlinks Panel */}
                  {backlinks.length > 0 && (
                    <div className="mt-8 pt-6 border-t border-border/60 shrink-0 select-none">
                      <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
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
                              className="text-xs px-2.5 py-1 bg-muted hover:bg-muted/80 text-foreground rounded border border-border transition-all cursor-pointer font-medium"
                            >
                              {termName}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}
