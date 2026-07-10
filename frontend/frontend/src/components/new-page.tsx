"use client";

import React from "react";
import { useWorkspace } from "@/context/WorkspaceContext";
import WorkspaceWelcome from "./workspace-welcome";
import WorkspaceResults from "./workspace-results";

export default function NewPage() {
  const { scanResult } = useWorkspace();

  return (
    <div className="w-full h-full flex flex-col bg-background text-foreground overflow-hidden">
      {!scanResult ? <WorkspaceWelcome /> : <WorkspaceResults />}
    </div>
  );
}