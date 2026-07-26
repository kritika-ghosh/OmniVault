"use client";

import { useState } from "react";
import { motion } from "framer-motion";

const steps = [
  {
    id: "scan",
    title: "01. Scan Your Codebase",
    description:
      "MeowPad automatically reads your project files and detects all the libraries and packages your code relies on.",
    codeSnippet:
      "# Scanning project dependencies...\nimport pandas as pd\nimport torch\nimport fastapi",
    activeTab: "main.py",
  },
  {
    id: "gaps",
    title: "02. Spot Missing Notes",
    description:
      "It compares your imports against your local notes folder to pinpoint exactly which technologies you haven't documented yet.",
    codeSnippet:
      '⚠️ Gap Detected: "pytorch.md" missing from /vault\n✅ Found: "pandas.md", "fastapi.md"',
    activeTab: "gap_report.log",
  },
  {
    id: "synthesize",
    title: "03. Auto-Generate Cheatsheets",
    description:
      "With one click, AI generates structured Markdown reference guides—with real code patterns—and saves them directly to your disk.",
    codeSnippet:
      "# PyTorch Core Concepts\n\nHigh-performance deep learning framework for tensor computation.",
    activeTab: "pytorch.md",
  },
  {
    id: "quiz",
    title: "04. Test Your Memory",
    description:
      "Interactive coding quizzes are created from your notes to help you practice and retain what you learn.",
    codeSnippet: "Quiz: Write a 3-line PyTorch tensor initialization example.",
    activeTab: "quiz_task.py",
  },
];

export function ScrollytellingSection() {
  const [activeStep, setActiveStep] = useState(0);

  return (
    <section className="relative max-w-7xl mx-auto px-6 py-24 z-10">
      <div className="text-center mb-12 space-y-3">
        <div className="text-sm font-mono text-accent uppercase tracking-widest font-semibold">
          THE WORKFLOW
        </div>
        <h2 className="text-3xl md:text-4xl font-black text-foreground tracking-tight font-sans">
          How It Works
        </h2>
      </div>

      <div className="flex flex-col lg:grid lg:grid-cols-2 gap-12 items-start">
        {/* RIGHT COLUMN (VISUAL): First on mobile, second on desktop */}
        <div className="order-1 lg:order-2 sticky top-24 lg:top-32 h-[400px] lg:h-[500px] w-full rounded-2xl border border-border bg-graph-paper-dense p-4 shadow-2xl flex flex-col z-20">
          {/* Header Bar */}
          <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
            <div className="flex gap-2">
              <div className="w-3 h-3 rounded-full bg-destructive/80" />
              <div className="w-3 h-3 rounded-full bg-accent/80" />
              <div className="w-3 h-3 rounded-full bg-primary/80" />
            </div>
            <span className="text-sm font-mono text-muted-foreground font-bold">
              {steps[activeStep].activeTab}
            </span>
            <span className="text-[11px] font-mono text-primary font-bold">
              GRID VAULT CANVAS
            </span>
          </div>

          {/* Animated IDE Content Box */}
          <div className="flex-1 bg-background rounded-lg p-6 font-mono text-base overflow-hidden border border-border shadow-inner">
            <motion.pre
              key={activeStep}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="text-primary whitespace-pre-wrap font-mono leading-relaxed"
            >
              <code>{steps[activeStep].codeSnippet}</code>
            </motion.pre>
          </div>
        </div>

        {/* LEFT COLUMN (TEXT): Second on mobile, first on desktop */}
        <div className="order-2 lg:order-1 space-y-[40vh] lg:space-y-[60vh] py-[5vh] lg:py-[20vh] w-full">
          {steps.map((step, index) => (
            <motion.div
              key={step.id}
              onViewportEnter={() => setActiveStep(index)}
              viewport={{ amount: 0.6 }}
              className={`transition-opacity duration-300 ${
                activeStep === index
                  ? "opacity-100 scale-100"
                  : "opacity-30 scale-95"
              }`}
            >
              <h3 className="text-2xl font-bold text-foreground mb-3 font-sans">
                {step.title}
              </h3>
              <p className="text-base text-muted-foreground leading-relaxed font-sans">
                {step.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
