"use client";

import React, { useState, useEffect, useRef } from "react";
import { useWorkspace } from "@/context/WorkspaceContext";
import WorkspaceWelcome from "./workspace-welcome";
import WorkspaceResults from "./workspace-results";

interface NewPageProps {
  forceWelcome?: boolean;
  panel?: any;
  vaultPath?: string;
}

export default function NewPage({ forceWelcome, panel, vaultPath }: NewPageProps) {
  const { vaultSessions, isLoading, activeVaultPath } = useWorkspace();
  const [hasScannedLocally, setHasScannedLocally] = useState(false);
  const prevLoading = useRef(isLoading);

  // Resolve the notes vault path and active session specifically bound to this tab instance
  const resolvedNotesPath = vaultPath || activeVaultPath;
  const activeSession = vaultSessions[resolvedNotesPath] || null;

  const scanResult = activeSession ? activeSession.scanResult : null;
  const notesPath = activeSession ? activeSession.notesPath : resolvedNotesPath;

  useEffect(() => {
    // When scanning finishes (isLoading goes true -> false) and scanResult exists,
    // transition this specific tab to show results and rename the tab to the scanned directory.
    if (prevLoading.current && !isLoading && scanResult) {
      setHasScannedLocally(true);
      if (notesPath && panel) {
        const dirName = notesPath.split(/[/\\]/).pop() || notesPath;
        panel.setTitle(dirName);
      }
    }
    prevLoading.current = isLoading;
  }, [isLoading, scanResult, notesPath, panel]);

  // Hydration sync: if a scanResult already exists on mount, rename the tab title immediately
  useEffect(() => {
    if (scanResult && notesPath && panel) {
      const dirName = notesPath.split(/[/\\]/).pop() || notesPath;
      panel.setTitle(dirName);
    }
  }, [scanResult, notesPath, panel]);

  // If forceWelcome is set, keep rendering the welcome directory picker until a scan completes locally.
  const showWelcome = forceWelcome ? !hasScannedLocally : !scanResult;

  return (
    <div className="w-full h-full flex flex-col bg-background text-foreground overflow-hidden">
      {showWelcome ? <WorkspaceWelcome /> : <WorkspaceResults />}
    </div>
  );
}