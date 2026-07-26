"use client";

import NewPage from "@/components/workspace/new-page";
import NodeGraph from "@/components/graph/node-graph";
import Quiz from "@/components/quiz";
import NoteEditor from "@/components/editor/note-editor";
import MutatedCompanion from "@/components/companion/mutated-companion";
import { useEffect, useState, useCallback } from "react";
import { DockviewReact, DockviewReadyEvent, DockviewApi, IDockviewPanelProps } from "dockview-react";
import "dockview-react/dist/styles/dockview.css";
import { customTheme } from "@/lib/dockview";

import ProjectAnalyzerModal from "@/components/workspace/project-analyzer-modal";
import CommandPalette from "@/components/workspace/command-palette";

const components = {
  scan: (props: IDockviewPanelProps<{ forceWelcome?: boolean; vaultPath?: string }>) => (
    <div className="w-full h-full overflow-y-auto">
      <NewPage 
        forceWelcome={props.params.forceWelcome} 
        vaultPath={props.params.vaultPath} 
        panel={props.api} 
      />
    </div>
  ),
  "node-graph": (props: IDockviewPanelProps) => (
    <div className="w-full h-full overflow-y-auto">
      <NodeGraph />
    </div>
  ),
  quiz: (props: IDockviewPanelProps<{ targetNotePath?: string }>) => (
    <div className="w-full h-full overflow-y-auto font-sans">
      <Quiz params={props.params} />
    </div>
  ),
  "note-editor": (props: IDockviewPanelProps<{ noteName: string; autoSynthesize?: boolean }>) => (
    <div className="w-full h-full overflow-y-auto">
      <NoteEditor noteName={props.params.noteName} autoSynthesize={props.params.autoSynthesize} />
    </div>
  ),
  "mutated-companion": (props: IDockviewPanelProps) => (
    <div className="w-full h-full overflow-y-auto">
      <MutatedCompanion />
    </div>
  ),
};

export default function WorkspaceIDE() {
  const [api, setApi] = useState<DockviewApi | null>(null);
  const [isProjectAnalyzerOpen, setIsProjectAnalyzerOpen] = useState(false);

  const onReady = useCallback((event: DockviewReadyEvent) => {
    setApi(event.api);
    event.api.addPanel({
      id: "scan-main",
      component: "scan",
      title: "Scan Dashboard",
      params: {
        forceWelcome: true,
      },
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
      if (view === "scan") title = "Scan Workspace";
      if (view === "mutated-companion") title = "Mutated Study Planner";

      if (view === "scan") {
        const panelId = `scan-${Date.now()}`;
        api.addPanel({
          id: panelId,
          component: "scan",
          title: "Scan Workspace",
          params: {
            forceWelcome: true,
          },
        });
        window.dispatchEvent(new CustomEvent("active-view-changed", { detail: panelId }));
        return;
      }

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
      window.dispatchEvent(new CustomEvent("active-view-changed", { detail: view }));
    };

    const handleOpenNote = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail) return;

      const noteName = typeof detail === "string" ? detail : detail.name;
      const autoSynthesize = typeof detail === "object" ? !!detail.autoSynthesize : false;
      if (!noteName) return;

      const panelId = `note-${noteName.toLowerCase()}`;
      const existingPanel = api.getPanel(panelId);
      if (existingPanel) {
        existingPanel.focus();
        if (autoSynthesize) {
          window.dispatchEvent(new CustomEvent("trigger-auto-synthesize", { detail: noteName }));
        }
      } else {
        api.addPanel({
          id: panelId,
          component: "note-editor",
          title: noteName,
          params: {
            noteName: noteName,
            autoSynthesize: autoSynthesize,
          },
        });
      }
      window.dispatchEvent(new CustomEvent("active-view-changed", { detail: panelId }));
    };

    const handleOpenNewQuiz = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      const targetNotePath = typeof detail === "string" ? detail : detail?.path;
      const noteName = targetNotePath ? targetNotePath.split(/[/\\]/).pop()?.replace(/\.md$/i, "") : "New";

      const panelId = `quiz-${Date.now()}`;
      api.addPanel({
        id: panelId,
        component: "quiz",
        title: `Quiz: ${noteName}`,
        params: {
          targetNotePath,
        },
      });
      window.dispatchEvent(new CustomEvent("active-view-changed", { detail: panelId }));
    };

    const handleOpenScanDashboard = (e: Event) => {
      const targetPath = (e as CustomEvent).detail;
      if (!targetPath) return;

      const cleanId = targetPath.toLowerCase().replace(/[^a-z0-9]/g, "-");
      const panelId = `scan-${cleanId}`;
      const existingPanel = api.getPanel(panelId);
      if (existingPanel) {
        existingPanel.focus();
      } else {
        const dirName = targetPath.split(/[/\\]/).pop() || targetPath;
        api.addPanel({
          id: panelId,
          component: "scan",
          title: dirName,
          params: {
            forceWelcome: false,
            vaultPath: targetPath,
          },
        });
      }
      window.dispatchEvent(new CustomEvent("active-view-changed", { detail: panelId }));
    };

    const activePanelListener = api.onDidActivePanelChange((event) => {
      if (event.panel) {
        window.dispatchEvent(new CustomEvent("active-view-changed", { detail: event.panel.id }));
      }
    });

    const handleOpenProjectAnalyzer = () => {
      setIsProjectAnalyzerOpen(true);
    };

    window.addEventListener("navigate-view", handleNavigate);
    window.addEventListener("open-note", handleOpenNote);
    window.addEventListener("open-new-quiz", handleOpenNewQuiz);
    window.addEventListener("open-scan-dashboard", handleOpenScanDashboard);
    window.addEventListener("open-project-analyzer", handleOpenProjectAnalyzer);
    return () => {
      window.removeEventListener("navigate-view", handleNavigate);
      window.removeEventListener("open-note", handleOpenNote);
      window.removeEventListener("open-new-quiz", handleOpenNewQuiz);
      window.removeEventListener("open-scan-dashboard", handleOpenScanDashboard);
      window.removeEventListener("open-project-analyzer", handleOpenProjectAnalyzer);
      activePanelListener.dispose();
    };
  }, [api]);

  return (
    <div className="absolute inset-0 bg-background">
      <DockviewReact
        components={components}
        onReady={onReady}
        theme={customTheme}
        className="absolute inset-0"
      />
      <ProjectAnalyzerModal
        isOpen={isProjectAnalyzerOpen}
        onClose={() => setIsProjectAnalyzerOpen(false)}
      />
      <CommandPalette />
    </div>
  );
}
