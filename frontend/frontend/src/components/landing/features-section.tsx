"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  BookOpen,
  Sparkles,
  Scan,
  RefreshCw,
  GraduationCap,
  Terminal,
  ShieldCheck,
  Network,
  Layers,
  Code2,
  Clock,
  Globe,
  ChevronDown,
  ArrowRight,
} from "lucide-react";
import { PLAYGROUND_DATA, FAQ_ITEMS } from "@/lib/landing-mock-data";

import { motion, AnimatePresence } from "framer-motion";

export function InteractivePlayground() {
  const [activeKey, setActiveKey] = useState<string>("pandas");
  const [activeNoteTab, setActiveNoteTab] = useState<"md" | "yaml">("md");

  const [activeCard, setActiveCard] = useState<number | null>(null);

  const [isScanning, setIsScanning] = useState(false);
  const [scanLogs, setScanLogs] = useState<string[]>([]);
  const [scannedDone, setScannedDone] = useState(false);

  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [streamedText, setStreamedText] = useState("");

  const concept = PLAYGROUND_DATA[activeKey] || PLAYGROUND_DATA.pandas;

  const [quizInput, setQuizInput] = useState(concept.defaultAnswer);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [quizResult, setQuizResult] = useState<{
    score: number;
    passed: boolean;
    feedback: string;
  } | null>(null);

  const handleSelectConcept = (key: string) => {
    setActiveKey(key);
    setActiveCard(null);
    const item = PLAYGROUND_DATA[key];
    if (item) {
      setQuizInput(item.defaultAnswer);
      setQuizResult(null);
      setStreamedText("");
    }
  };

  const handleRunScan = () => {
    setActiveCard(1);
    setIsScanning(true);
    setScannedDone(false);
    setScanLogs(["Reading workspace files...", "AST parser loading modules..."]);

    setTimeout(() => {
      setScanLogs((prev) => [
        ...prev,
        `Detected package imports: ${Object.values(PLAYGROUND_DATA).map(c => c.term.toLowerCase()).join(", ")}`,
        "Comparing with notes directory...",
        "Scan analysis completed!"
      ]);
      setIsScanning(false);
      setScannedDone(true);
    }, 2000);
  };

  const handleStreamSynthesize = () => {
    setActiveCard(2);
    setIsSynthesizing(true);
    setStreamedText("");
    const targetText = concept.markdown;
    let idx = 0;

    const timer = setInterval(() => {
      if (idx < targetText.length) {
        setStreamedText(targetText.slice(0, idx + 5));
        idx += 5;
      } else {
        setStreamedText(targetText);
        setIsSynthesizing(false);
        clearInterval(timer);
      }
    }, 40);
  };

  const handleEvaluateQuiz = () => {
    setActiveCard(3);
    setIsEvaluating(true);
    setQuizResult(null);

    setTimeout(() => {
      const isCorrect = quizInput.toLowerCase().includes(concept.expectedKeyword.toLowerCase());
      setQuizResult({
        score: isCorrect ? 95 : 40,
        passed: isCorrect,
        feedback: isCorrect
          ? `Correct! Found keyword '${concept.expectedKeyword}'. Patched frontmatter confidence: 0.35 -> 0.85!`
          : `Under review. Expected function keyword '${concept.expectedKeyword}'. Review note and retry.`,
      });
      setIsEvaluating(false);
    }, 1500);
  };

  return (
    <section id="playground" className="relative z-10 py-16 px-6 max-w-7xl mx-auto w-full">
      <div className="text-center mb-12 space-y-3">
        <div className="text-sm font-mono text-accent uppercase tracking-widest font-semibold">
          INTERACTIVE PLAYGROUND
        </div>
        <h2 className="text-3xl md:text-4xl font-black text-foreground tracking-tight font-sans">
          Try the Vault Notebook Engine Live
        </h2>
        <p className="text-base text-muted-foreground max-w-2xl mx-auto font-sans">
          Select a topic tab, execute the AST scan, stream synthesized notes, and evaluate your active recall answers live!
        </p>
      </div>

      {/* Notebook Concept Selector Tabs */}
      <div className="flex flex-wrap items-center justify-center gap-3 mb-8 font-mono">
        {Object.keys(PLAYGROUND_DATA).map((key) => {
          const isActive = activeKey === key;
          const item = PLAYGROUND_DATA[key];
          return (
            <button
              key={key}
              onClick={() => handleSelectConcept(key)}
              className={`relative px-5 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer flex items-center gap-2 ${
                isActive ? "text-white" : "bg-card text-foreground hover:text-primary border border-border"
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="active-pill"
                  className="absolute inset-0 bg-[#af547b] rounded-xl shadow-lg shadow-[#af547b]/20 z-0"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              <span className="relative z-10">{item.term.toUpperCase()}</span>
              <span className="relative z-10 text-[10px] opacity-85">({key === "pandas" || key === "fastapi" ? "SAVED" : "GAP"})</span>
            </button>
          );
        })}
      </div>

      {/* Interactive Notebook Split Canvas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* COLUMN 1 */}
        <div className="relative z-10 p-6 rounded-2xl bg-card border border-border flex flex-col justify-between space-y-4 shadow-xl">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-bold font-handwriting text-foreground">Notebook Objectives</h3>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/30">
                STEP 01: SCAN
              </span>
            </div>

            <div className="font-handwriting space-y-2">
              <h4 className="text-base font-bold text-foreground notebook-underline">
                {concept.term} Objectives :-
              </h4>
              <ul className="space-y-1.5 text-base text-foreground/90">
                {concept.objectives.map((obj, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-accent font-bold">↳</span>
                    <span>{obj}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-mono text-muted-foreground">AST Code Snippet:</label>
              <pre className="p-3 rounded-xl bg-background border border-border text-sm font-mono text-primary overflow-x-auto [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[#af547b]/30 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-[#af547b]/60">
                {concept.codeSnippet}
              </pre>
            </div>
          </div>

          <div className="space-y-2 font-mono">
            {isScanning && (
              <div className="p-3 rounded-xl bg-background border border-border text-[10px] text-muted-foreground space-y-0.5">
                {scanLogs.map((log, i) => (
                  <div key={i} className="animate-fade-in">&gt; {log}</div>
                ))}
              </div>
            )}
            
            <Button
              onClick={handleRunScan}
              disabled={isScanning}
              className="w-full bg-card hover:bg-muted text-primary font-bold text-sm h-9 rounded-xl border border-border cursor-pointer flex items-center justify-center gap-2"
            >
              {isScanning ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Scanning AST Vault...
                </>
              ) : (
                <>
                  <Scan className="w-3.5 h-3.5" /> Execute AST Scan
                </>
              )}
            </Button>
          </div>
        </div>

        {/* COLUMN 2 */}
        <div className="relative z-10 p-6 rounded-2xl bg-card border border-border flex flex-col justify-between space-y-4 shadow-xl">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-bold font-handwriting text-foreground">Synthesized Note</h3>
              </div>

              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/30">
                STEP 02: SYNTHESIZE
              </span>
            </div>

            <div className="p-3 rounded-xl bg-background border border-border text-sm font-mono text-foreground whitespace-pre-wrap min-h-55 max-h-60 overflow-y-auto leading-relaxed [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[#af547b]/30 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-[#af547b]/60">
              {streamedText || concept.markdown}
              {isSynthesizing && (
                <motion.span
                  animate={{ opacity: [1, 0] }}
                  transition={{ repeat: Infinity, duration: 0.8 }}
                  className="inline-block ml-0.5 text-accent"
                >
                  |
                </motion.span>
              )}
            </div>
          </div>

          <Button
            onClick={handleStreamSynthesize}
            disabled={isSynthesizing}
            className="w-full bg-accent/10 hover:bg-accent/20 text-accent font-mono font-bold text-sm h-9 rounded-xl border border-accent/30 cursor-pointer flex items-center justify-center gap-2"
          >
            {isSynthesizing ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Streaming Note...
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" /> Stream Synthesize Note Guide
              </>
            )}
          </Button>
        </div>

        {/* COLUMN 3 */}
        <div className="relative z-10 p-6 rounded-2xl bg-card border border-border flex flex-col justify-between space-y-4 shadow-xl">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-bold font-handwriting text-foreground">Quiz Exercise Sheet</h3>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/30">
                STEP 03: TEST
              </span>
            </div>

            <div className="space-y-2 font-handwriting">
              <h4 className="text-base font-bold text-foreground notebook-underline">Question Activity :-</h4>
              <p className="text-base text-foreground/90">{concept.quizQuestion}</p>
            </div>

            <div className="p-3 rounded-xl bg-background border border-border text-sm font-mono space-y-2">
              <div className="text-muted-foreground">{concept.quizPrefix}</div>
              <input
                type="text"
                value={quizInput}
                onChange={(e) => setQuizInput(e.target.value)}
                className="w-full bg-card border border-border rounded px-2.5 py-1.5 text-sm text-primary font-mono focus:outline-none focus:border-primary"
              />
            </div>

            {/* Quiz Evaluated Results View */}
            {isEvaluating ? (
              <div className="p-3 rounded-xl bg-background border border-border text-sm font-mono text-muted-foreground flex items-center justify-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Evaluating solution payload...
              </div>
            ) : (
              quizResult && (
                <div className="p-3 rounded-xl bg-background border border-border text-sm font-mono space-y-1 animate-in fade-in">
                  <div className={quizResult.passed ? "text-primary font-bold" : "text-accent font-bold"}>
                    {quizResult.passed ? "✓ Quiz Solution Passed (Score: 95%)" : "⚠ Solution Review Recommended"}
                  </div>
                  <p className="text-foreground/90 font-handwriting text-base mt-1">
                    {quizResult.feedback}
                  </p>
                </div>
              )
            )}
          </div>

          <Button
            onClick={handleEvaluateQuiz}
            disabled={isEvaluating}
            className="w-full bg-accent hover:bg-accent/90 text-white font-bold font-mono text-sm h-9 rounded-xl cursor-pointer flex items-center justify-center gap-2"
          >
            <Terminal className="w-4 h-4" /> Evaluate Solution & Patch Note
          </Button>
        </div>
      </div>
    </section>
  );
}

const AgentCard = ({ icon: Icon, title, desc, index }: { icon: React.ElementType, title: string, desc: string, index: number }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.7, delay: index * 0.25, ease: "easeOut" }}
      className="relative p-6 rounded-2xl bg-card border border-border"
    >
      <motion.div 
        initial={{ opacity: 0 }}
        whileInView={{ opacity: [0, 1, 0] }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{ duration: 0.5, delay: (index * 0.25) + 0.7, ease: "easeInOut", times: [0, 0.5, 1] }}
        className="absolute inset-0 rounded-2xl border-2 border-[#af547b] shadow-[0_0_20px_rgba(175,84,123,0.4)] pointer-events-none z-20" 
      />
      <div className="relative z-10 space-y-3">
        <Icon className="w-8 h-8 text-[#af547b]" />
        <h3 className="text-xl font-bold text-foreground font-sans">{title}</h3>
        <p className="text-base text-muted-foreground leading-relaxed font-sans">{desc}</p>
      </div>
    </motion.div>
  );
};

export function AgentArchitecture() {
  return (
    <section id="architecture" className="relative z-10 py-16 px-6 max-w-7xl mx-auto w-full">
      <div className="text-center mb-12 space-y-3">
        <div className="text-sm font-mono text-accent uppercase tracking-widest font-semibold">
          DECOUPLED AGENT SYSTEM
        </div>
        <h2 className="text-3xl md:text-4xl font-black text-foreground tracking-tight font-sans">
          Three Specialized Autonomous Agents
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <AgentCard 
          icon={Scan} 
          title="Agent 1: Codebase Scanner" 
          desc="Parses imports & dependencies across your codebase directory. Diff-checks imports against local markdown vault notes using LLM intelligence." 
          index={0} 
        />
        <AgentCard 
          icon={Sparkles} 
          title="Agent 2: Synthesizer" 
          desc="Streams structured Markdown guides with code patterns and YAML frontmatter metadata directly to your local Obsidian vault." 
          index={1} 
        />
        <AgentCard 
          icon={GraduationCap} 
          title="Agent 3: Mutated Quizzer" 
          desc="Generates context-aware coding challenges, evaluates submitted code solutions, and mutates syllabus tasks if gaps are detected." 
          index={2} 
        />
      </div>
    </section>
  );
}

const FEATURES_DATA = [
  { icon: ShieldCheck, title: "Local File Access", desc: "Read and edit Markdown files directly on your disk via browser APIs." },
  { icon: Network, title: "2D & 3D Knowledge Graph", desc: "Visualize relationships between imports and vault notes in 2D or 3D." },
  { icon: Layers, title: "Dockview Multi-Tab IDE", desc: "Tile and split note editors, node graphs, and quiz terminals easily." },
  { icon: Code2, title: "Monaco Editor", desc: "VS Code style Markdown editing with side-by-side live rendered preview." },
  { icon: Clock, title: "Decay Recall Engine", desc: "Calculates memory retention decay curves to highlight review priority." },
  { icon: Globe, title: "Stateless REST Backend", desc: "Deploy FastAPI containers to Render, Vercel, or run locally via Uvicorn." }
];

const FeatureCard = ({ icon: Icon, title, desc, index }: { icon: React.ElementType, title: string, desc: string, index: number }) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      whileInView={{ opacity: 1, scale: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5, delay: index * 0.1, ease: "easeOut" }}
      className="p-6 rounded-2xl bg-card border border-border space-y-2 hover:border-[#af547b]/40 transition-colors"
    >
      <Icon className="w-7 h-7 text-[#af547b]" />
      <h3 className="text-lg font-bold text-foreground font-sans">{title}</h3>
      <p className="text-base text-muted-foreground leading-relaxed font-sans">{desc}</p>
    </motion.div>
  );
};

export function FeatureMatrix() {
  return (
    <section id="features" className="relative z-10 py-16 px-6 max-w-7xl mx-auto w-full">
      <div className="text-center mb-12 space-y-3">
        <div className="text-sm font-mono text-accent uppercase tracking-widest font-semibold">
          FEATURE CAPABILITIES
        </div>
        <h2 className="text-3xl md:text-4xl font-black text-foreground tracking-tight font-sans">
          Built for Local Markdown Vaults
        </h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {FEATURES_DATA.map((feature, i) => (
          <FeatureCard key={i} {...feature} index={i} />
        ))}
      </div>
    </section>
  );
}

export function FAQSection() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <section id="faq" className="relative z-10 py-16 px-6 max-w-4xl mx-auto w-full">
      <div className="text-center mb-12 space-y-3">
        <div className="text-sm font-mono text-accent uppercase tracking-widest font-semibold">
          FREQUENTLY ASKED QUESTIONS
        </div>
        <h2 className="text-3xl md:text-4xl font-black text-foreground tracking-tight font-sans">
          Frequently Asked Questions
        </h2>
      </div>

      <div className="space-y-3">
        {FAQ_ITEMS.map((faq, index) => (
          <div key={index} className="border border-border rounded-xl bg-card overflow-hidden">
            <button
              onClick={() => setOpenFaq(openFaq === index ? null : index)}
              className="w-full p-4 text-left flex items-center justify-between gap-4 font-bold text-base text-foreground hover:text-[#af547b] transition-colors cursor-pointer font-sans"
            >
              <span>{faq.q}</span>
              <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${openFaq === index ? "rotate-180 text-primary" : ""}`} />
            </button>
            {openFaq === index && (
              <div className="px-4 pb-4 text-base text-muted-foreground leading-relaxed border-t border-border pt-3 font-sans">
                {faq.a}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

export function CTABanner() {
  return (
    <section className="relative z-10 py-12 px-6 max-w-4xl mx-auto w-full">
      <div className="rounded-2xl border border-border bg-graph-paper p-8 sm:p-12 text-center space-y-6 shadow-2xl">
        <h2 className="text-3xl md:text-4xl font-black text-foreground tracking-tight font-sans mb-4">
          Ready to Open Your Markdown Notebook Vault?
        </h2>
        <p className="text-base text-muted-foreground max-w-2xl mx-auto font-sans mb-8">
          Launch the OmniVault Workspace IDE to connect your local codebase directory and markdown notes vault.
        </p>

        <div>
          <Link href="/workspace">
            <Button className="h-11 px-8 bg-accent hover:bg-accent/90 text-white font-bold text-sm rounded-xl cursor-pointer inline-flex items-center gap-2 font-mono">
              <span>Launch Workspace Now</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
