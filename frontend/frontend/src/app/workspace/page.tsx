"use client";

import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";

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
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const user = sessionStorage.getItem("omnivault_user");
      if (!user) {
        router.replace("/auth");
      } else {
        setIsAuthenticated(true);
      }
    }
  }, [router]);

  if (isAuthenticated === null) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center p-8 bg-[#0a0f16] text-muted-foreground font-mono text-xs select-none">
        <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin mb-3" />
        <span>Verifying Vault Authorization...</span>
      </div>
    );
  }

  return <WorkspaceIDE />;
}
