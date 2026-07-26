"use client";

import React, { useState } from "react";
import { useWorkspace } from "@/context/WorkspaceContext";
import { Button } from "@/components/ui/button";
import { X, Settings, Type, BookOpen } from "lucide-react";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const {
    editorFontStyle,
    setEditorFontStyle,
    editorFontSize,
    setEditorFontSize
  } = useWorkspace();

  const [activeTab, setActiveTab] = useState<"settings" | "guide">("settings");

  if (!isOpen) return null;

  const fontStyleOptions = [
    { label: "Handwriting", value: "font-handwriting" },
    { label: "Sans-Serif", value: "font-sans" },
    { label: "Monospace", value: "font-mono" },
  ];

  const fontSizeOptions = [
    { label: "Small", value: "text-sm" },
    { label: "Medium", value: "text-base" },
    { label: "Large", value: "text-lg" },
    { label: "Extra Large", value: "text-xl" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 font-sans select-none animate-in fade-in duration-200">
      <div className="bg-[#0f141c] border border-white/15 rounded-2xl max-w-lg w-full p-6 shadow-2xl flex flex-col gap-5 max-h-[90vh] overflow-hidden text-foreground">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/20 text-primary border border-primary/30">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                Editor Configuration
              </h2>
              <p className="text-xs text-muted-foreground">
                Customize your reading & writing environment or learn syntax rules
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center rounded-xl border border-border p-1 bg-card self-start font-mono shrink-0">
          <button
            onClick={() => setActiveTab("settings")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "settings"
                ? "bg-[#6e346b] text-white font-bold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Type className="w-3.5 h-3.5" />
            Editor Settings
          </button>
          <button
            onClick={() => setActiveTab("guide")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "guide"
                ? "bg-[#6e346b] text-white font-bold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            Markdown Guide
          </button>
        </div>

        {/* Modal Content body */}
        <div className="flex-1 overflow-y-auto min-h-[220px]">
          {activeTab === "settings" ? (
            <div className="space-y-4 font-mono">
              {/* Font Style Selection */}
              <div className="space-y-2 bg-[#161c26] p-4 rounded-xl border border-white/10">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  Font Family Style:
                </span>
                <select
                  value={editorFontStyle}
                  onChange={(e) => setEditorFontStyle(e.target.value)}
                  className="w-full h-10 bg-background border border-white/10 rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-all cursor-pointer font-sans"
                >
                  {fontStyleOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Font Size Selection */}
              <div className="space-y-2 bg-[#161c26] p-4 rounded-xl border border-white/10">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  Editor Font Size:
                </span>
                <select
                  value={editorFontSize}
                  onChange={(e) => setEditorFontSize(e.target.value)}
                  className="w-full h-10 bg-background border border-white/10 rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-all cursor-pointer font-sans"
                >
                  {fontSizeOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            <div className="space-y-4 font-sans text-sm leading-relaxed text-muted-foreground p-2">
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-foreground font-mono">Basic Formatting Rules:</h3>
                <div className="bg-[#161c26] border border-white/10 rounded-xl p-3.5 font-mono text-xs space-y-2.5 text-foreground/90">
                  <div>
                    <span className="text-primary font-bold"># Header 1</span>
                    <p className="text-[11px] text-muted-foreground">Creates a large title</p>
                  </div>
                  <div>
                    <span className="text-primary font-bold">## Header 2</span>
                    <p className="text-[11px] text-muted-foreground">Creates a section header</p>
                  </div>
                  <div>
                    <span className="text-primary font-bold">**Bold Text**</span>
                    <p className="text-[11px] text-muted-foreground">Applies bold weight styling</p>
                  </div>
                  <div>
                    <span className="text-primary font-bold">*Italic Text*</span>
                    <p className="text-[11px] text-muted-foreground">Applies italic font slant</p>
                  </div>
                  <div>
                    <span className="text-primary font-bold">- Bullet List</span>
                    <p className="text-[11px] text-muted-foreground">Creates unordered bullet lists</p>
                  </div>
                  <div>
                    <span className="text-primary font-bold">[[Link Target]]</span>
                    <p className="text-[11px] text-muted-foreground">Creates internal concept wiki links</p>
                  </div>
                  <div>
                    <span className="text-primary font-bold">[[Target|Custom Label]]</span>
                    <p className="text-[11px] text-muted-foreground">Wiki links with a custom display label</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex justify-end pt-2 border-t border-white/5 shrink-0">
          <Button
            onClick={onClose}
            className="h-9 px-4 text-xs font-semibold bg-card hover:bg-white/5 border border-border text-foreground rounded-lg cursor-pointer flex items-center gap-1.5 font-sans"
          >
            Close Settings
          </Button>
        </div>
      </div>
    </div>
  );
}
