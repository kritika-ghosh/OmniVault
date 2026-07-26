"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BookOpen, Zap, ArrowRight, Play, ChevronDown } from "lucide-react";

export function HeroSection() {
  const phrases = [
    "Markdown Vault Notes",
    "AST Import Gaps",
    "Evolving Roadmaps",
    "Active Recall Sheets",
  ];
  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0);
  const [typedText, setTypedText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    const currentPhrase = phrases[currentPhraseIndex];
    
    if (isDeleting) {
      timer = setTimeout(() => {
        setTypedText(currentPhrase.substring(0, typedText.length - 1));
      }, 35);
    } else {
      timer = setTimeout(() => {
        setTypedText(currentPhrase.substring(0, typedText.length + 1));
      }, 75);
    }

    if (!isDeleting && typedText === currentPhrase) {
      timer = setTimeout(() => setIsDeleting(true), 2000);
    } else if (isDeleting && typedText === "") {
      setIsDeleting(false);
      setCurrentPhraseIndex((prev) => (prev + 1) % phrases.length);
    }

    return () => clearTimeout(timer);
  }, [typedText, isDeleting, currentPhraseIndex]);

  return (
    <section className="relative z-10 pt-20 pb-16 px-6 max-w-6xl mx-auto text-center flex flex-col items-center justify-center min-h-[calc(100vh-5rem)]">
      {/* Notebook Title Badge */}
      <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-card border border-border text-sm font-mono text-primary mb-8 shadow-lg gsap-hero-badge">
        <BookOpen className="w-4 h-4 text-primary" />
        <span>Local-First Markdown Vault & AST Scanner</span>
      </div>

      {/* Hero Title */}
      <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-foreground leading-[1.25] mb-6 font-sans gsap-hero-title">
        Bridge Codebase Dependencies with Personal
        <span className="block mt-3 font-sans text-accent notebook-underline text-5xl sm:text-7xl min-h-[1.2em]">
          {typedText}
          <span className="animate-pulse ml-0.5 select-none font-sans font-normal text-3xl sm:text-5xl text-accent">|</span>
        </span>
      </h1>

      {/* Description */}
      <p className="text-base sm:text-base text-muted-foreground max-w-2xl leading-relaxed mb-10 font-sans gsap-hero-desc">
        MeowPad automatically parses python/JS import dependencies, identifies documentation gaps, synthesizes Markdown guides, and schedules context-aware active recall quizzes.
      </p>

      {/* Hero Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto mb-16">
        <Link href="/workspace" className="w-full sm:w-auto gsap-hero-btn">
          <Button className="w-full sm:w-auto h-12 px-8 bg-accent hover:bg-accent/90 text-white font-bold text-base rounded-lg shadow-xl shadow-accent/20 transition-all hover:scale-105 cursor-pointer flex items-center justify-center gap-2 font-mono">
            <Zap className="w-4 h-4 fill-current" />
            <span>Open Full Workspace IDE</span>
            <ArrowRight className="w-4 h-4" />
          </Button>
        </Link>

        <a href="#playground" className="w-full sm:w-auto gsap-hero-btn">
          <Button variant="outline" className="w-full sm:w-auto h-12 px-7 border-border bg-card hover:bg-muted text-foreground font-semibold text-base rounded-lg transition-all cursor-pointer flex items-center justify-center gap-2 font-mono">
            <Play className="w-3.5 h-3.5 text-primary fill-primary/20" />
            <span>Explore Interactive Playground</span>
          </Button>
        </a>
      </div>

      {/* Scroll Indicator */}
      <a href="#mock-ide" className="inline-flex items-center gap-1.5 text-sm font-mono text-muted-foreground hover:text-foreground transition-colors animate-bounce cursor-pointer pt-2">
        <span>Scroll to view Grid Vault Canvas</span>
        <ChevronDown className="w-4 h-4 text-accent" />
      </a>
    </section>
  );
}

export function MockIDEPreview() {
  return (
    <div id="mock-ide" className="w-full max-w-5xl mx-auto px-6 mb-24 pt-12 gsap-mock-ide">
      <div className="rounded-2xl border border-border bg-graph-paper-dense shadow-2xl overflow-hidden text-left flex flex-col">
        {/* Titlebar */}
        <div className="px-4 py-3 bg-muted border-b border-border flex items-center justify-between text-sm font-mono text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-destructive/80 inline-block" />
            <span className="w-3 h-3 rounded-full bg-accent/80 inline-block" />
            <span className="w-3 h-3 rounded-full bg-primary/80 inline-block" />
            <span className="ml-2 font-mono text-sm text-foreground font-bold">meowpad_active_recall_notes.md</span>
          </div>
          <span className="text-[11px] text-primary font-bold">GRID VAULT CANVAS</span>
        </div>

        {/* Split Page View */}
        <div className="grid grid-cols-1 md:grid-cols-2 text-left relative min-h-[380px]">
          <div className="hidden md:block absolute top-0 bottom-0 left-1/2 -ml-[1px] w-[2px] bg-border border-r border-dashed border-border/60 z-10 pointer-events-none" />

          {/* Left Page */}
          <div className="p-8 space-y-6 bg-graph-paper font-sans text-foreground text-base leading-snug">
            <div>
              <h2 className="text-xl font-bold text-foreground notebook-underline inline-block mb-3">
                Learning objectives :-
              </h2>
              <ul className="space-y-2 text-base text-foreground/90">
                <li className="flex items-start gap-2">
                  <span className="text-accent text-lg font-bold">↳</span>
                  <span>Analyse the concept of AST import dependencies and demonstrate coverage gaps in vault notes.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-accent text-lg font-bold">↳</span>
                  <span>Discuss technical guides around pandas, pytorch, fastapi, and vector databases. Apply 1-click note synthesis.</span>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-bold text-foreground notebook-underline inline-block mb-2">
                Identifying documentation gaps - ACTIVITY
              </h3>
              <div className="text-sm font-mono space-y-1 bg-background p-3 rounded-lg border border-border text-foreground/80 mt-1">
                <div>• Project Files: main.py, model.py, requirements.txt</div>
                <div>• Detected Imports: pandas, torch, fastapi</div>
                <div className="text-accent font-bold">• Gap Identified: 'PyTorch' note missing from vault</div>
              </div>
            </div>
          </div>

          {/* Right Page */}
          <div className="p-8 space-y-6 bg-graph-paper font-sans text-foreground text-base leading-snug">
            <div>
              <h3 className="text-lg font-bold text-foreground notebook-underline inline-block mb-2">
                Documented Vault Materials :-
              </h3>
              <p className="text-base text-foreground/80">
                The technical notes which get saved to your local disk.
              </p>
              <p className="text-sm font-mono text-primary mt-1 bg-background p-2 rounded border border-border">
                Example :- pandas.md, fastapi.md, numpy.md
              </p>
            </div>

            <div>
              <h3 className="text-lg font-bold text-foreground notebook-underline inline-block mb-2">
                Non-documented gaps :-
              </h3>
              <p className="text-base text-foreground/80">
                The missing concepts which need automated synthesis.
              </p>
              <p className="text-sm font-mono text-accent mt-1 bg-background p-2 rounded border border-border">
                Example :- pytorch.md, chromadb.md
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
