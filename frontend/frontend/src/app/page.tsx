"use client";

import NewPage from "@/components/new-page";
import NodeGraph from "@/components/node-graph";
import Quiz from "@/components/quiz";
import SynthesizeNote from "@/components/synthesize-note";
import { useEffect, useState, useCallback } from "react";
import { DockviewReact, DockviewReadyEvent, DockviewApi, IDockviewPanelProps } from "dockview-react";
import "dockview-react/dist/styles/dockview.css";
import { customTheme } from "@/lib/dockview";
import { themeAbyss } from 'dockview-react';

const components = {
  scan: (props: IDockviewPanelProps) => (
    <div className="w-full h-full overflow-y-auto">
      <NewPage />
    </div>
  ),
  "node-graph": (props: IDockviewPanelProps) => (
    <div className="w-full h-full overflow-y-auto">
      <NodeGraph />
    </div>
  ),
  quiz: (props: IDockviewPanelProps) => (
    <div className="w-full h-full overflow-y-auto font-sans">
      <Quiz />
    </div>
  ),
  "synthesize-note": (props: IDockviewPanelProps) => (
    <div className="w-full h-full overflow-y-auto">
      <SynthesizeNote />
    </div>
  ),
};

export default function Home() {
  const [api, setApi] = useState<DockviewApi | null>(null);

  const onReady = useCallback((event: DockviewReadyEvent) => {
    setApi(event.api);
    event.api.addPanel({
      id: "scan",
      component: "scan",
      title: "Workspace Scan",
    });
  }, []);

  useEffect(() => {
    if (!api) return;

    const handleNavigate = (e: Event) => {
      const view = (e as CustomEvent).detail;
      if (!view) return;

      let title = view;
      if (view === "node-graph") title = "Node Graph";
      if (view === "quiz") title = "Quiz";
      if (view === "synthesize-note") title = "Synthesize Note";
      if (view === "scan") title = "Workspace Scan";

      const existingPanel = api.getPanel(view);
      if (existingPanel) {
        existingPanel.focus();
      } else {
        api.addPanel({
          id: view,
          component: view,
          title: title,
        });
      }
    };

    window.addEventListener("navigate-view", handleNavigate);
    return () => window.removeEventListener("navigate-view", handleNavigate);
  }, [api]);

  return (
    <div className="absolute inset-0 bg-background">
      <DockviewReact
        components={components}
        onReady={onReady}
        theme={customTheme}
        className="absolute inset-0"
      />
    </div>
  );
}
