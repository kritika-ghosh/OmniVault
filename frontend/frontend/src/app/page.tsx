"use client";

import NewPage from "@/components/new-page";
import NodeGraph from "@/components/node-graph";
import Quiz from "@/components/quiz";
import NoteEditor from "@/components/note-editor";
import QuizEditor from "@/components/quiz-editor";
import { useEffect, useState, useCallback } from "react";
import { DockviewReact, DockviewReadyEvent, DockviewApi, IDockviewPanelProps } from "dockview-react";
import "dockview-react/dist/styles/dockview.css";
import { customTheme } from "@/lib/dockview";

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
  "quiz-editor": (props: IDockviewPanelProps) => (
    <div className="w-full h-full overflow-y-auto">
      <QuizEditor />
    </div>
  ),
  "note-editor": (props: IDockviewPanelProps<{ noteName: string }>) => (
    <div className="w-full h-full overflow-y-auto">
      <NoteEditor noteName={props.params.noteName} />
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
      window.dispatchEvent(new CustomEvent("active-view-changed", { detail: view }));
    };

    const handleOpenNote = (e: Event) => {
      const noteName = (e as CustomEvent).detail;
      if (!noteName) return;

      const panelId = `note-${noteName.toLowerCase()}`;
      const existingPanel = api.getPanel(panelId);
      if (existingPanel) {
        existingPanel.focus();
      } else {
        api.addPanel({
          id: panelId,
          component: "note-editor",
          title: noteName,
          params: {
            noteName: noteName,
          },
        });
      }
      window.dispatchEvent(new CustomEvent("active-view-changed", { detail: panelId }));
    };

    const handleOpenQuizEditor = () => {
      const panelId = "quiz-editor";
      const existingPanel = api.getPanel(panelId);
      if (existingPanel) {
        existingPanel.focus();
      } else {
        api.addPanel({
          id: panelId,
          component: "quiz-editor",
          title: "Quiz Answer Terminal",
          position: {
            referencePanel: "quiz",
            direction: "right",
          },
        });
      }
    };

    const handleCloseQuizEditor = () => {
      const panel = api.getPanel("quiz-editor");
      if (panel) {
        api.removePanel(panel);
      }
    };

    const activePanelListener = api.onDidActivePanelChange((event) => {
      if (event.panel) {
        window.dispatchEvent(new CustomEvent("active-view-changed", { detail: event.panel.id }));
      }
    });

    window.addEventListener("navigate-view", handleNavigate);
    window.addEventListener("open-note", handleOpenNote);
    window.addEventListener("open-quiz-editor", handleOpenQuizEditor);
    window.addEventListener("close-quiz-editor", handleCloseQuizEditor);
    return () => {
      window.removeEventListener("navigate-view", handleNavigate);
      window.removeEventListener("open-note", handleOpenNote);
      window.removeEventListener("open-quiz-editor", handleOpenQuizEditor);
      window.removeEventListener("close-quiz-editor", handleCloseQuizEditor);
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
    </div>
  );
}
