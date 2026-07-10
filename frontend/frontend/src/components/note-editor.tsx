"use client";

import React, { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { Button } from "./ui/button";
import { useWorkspace } from "@/context/WorkspaceContext";
import { Save, Edit2, Eye, Check } from "lucide-react";

interface NoteEditorProps {
  noteName: string;
}

export default function NoteEditor({ noteName }: NoteEditorProps) {
  const { notesFiles, saveNote, statusMessage } = useWorkspace();
  const [content, setContent] = useState("");
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");
  const [isSaving, setIsSaving] = useState(false);
  const [showSavedIndicator, setShowSavedIndicator] = useState(false);

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
            onClick={handleSave}
            disabled={isSaving}
            className="bg-primary hover:bg-primary/95 text-primary-foreground text-xs font-semibold cursor-pointer h-8 px-3.5 flex items-center gap-1.5"
          >
            <Save className="w-3.5 h-3.5" />
            {isSaving ? "Saving..." : "Save Note"}
          </Button>
        </div>
      </div>

      {/* Editor Content Area */}
      <div className="flex-1 overflow-hidden relative">
        {activeTab === "edit" ? (
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full h-full p-6 bg-background text-foreground font-mono text-sm focus:outline-none resize-none leading-relaxed overflow-y-auto"
            placeholder="Type your markdown here..."
          />
        ) : (
          <div className="w-full h-full p-6 overflow-y-auto prose dark:prose-invert prose-neutral prose-sm max-w-none prose-headings:text-foreground prose-a:text-primary prose-strong:text-foreground">
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}
