"use client";

import React from "react";
import dynamic from "next/dynamic";

// Dynamically import the Workspace IDE component with SSR disabled
// to prevent hydration mismatches and window-undefined errors.
const WorkspaceIDE = dynamic(() => import("@/components/workspace-ide"), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 flex flex-col items-center justify-center p-8 bg-[#0a0f16] text-muted-foreground font-mono text-xs select-none">
      <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin mb-3" />
      <span>Loading IDE Workspace Canvas...</span>
    </div>
  ),
});

export default function WorkspacePage() {
  return <WorkspaceIDE />;
}
