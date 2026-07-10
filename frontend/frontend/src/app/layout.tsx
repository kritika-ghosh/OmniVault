"use client";

import { useState, useEffect } from "react";
import '@/app/globals.css'
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/app-sidebar'
import { WorkspaceProvider } from "@/context/WorkspaceContext";
import { Scan, FilePlus, Network, GraduationCap, Sun, Moon } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export default function DashboardLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [activeView, setActiveView] = useState<string>("scan");

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    if (savedTheme) {
      setTheme(savedTheme);
    }

    const handleActiveView = (e: Event) => {
      const viewId = (e as CustomEvent).detail;
      if (viewId) {
        setActiveView(viewId);
      }
    };

    window.addEventListener("active-view-changed", handleActiveView);
    return () => {
      window.removeEventListener("active-view-changed", handleActiveView);
    };
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('theme', nextTheme);
  };

  const navigate = (view: string) => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('navigate-view', { detail: view }));
    }
  };

  const handleCreateNote = () => {
    const name = window.prompt("Enter note name:");
    if (name && name.trim()) {
      window.dispatchEvent(new CustomEvent("open-note", { detail: name.trim() }));
    }
  };

  return (
    <html lang="en" className={theme}>
      <body className="min-h-screen bg-background text-foreground antialiased overflow-hidden">
        <WorkspaceProvider>
          <TooltipProvider>
            <SidebarProvider className="flex flex-row h-screen w-screen overflow-hidden">
              {/* Left stuck Vertical Menubar */}
              <header className="w-12 h-full border-r border-border bg-sidebar flex flex-col items-center justify-between py-4 z-50 shrink-0 select-none">
                <div className="flex flex-col items-center w-full">
                  {/* Logo / Short Title */}
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-xs font-bold tracking-wider text-primary select-none mt-1" title="OmniVault">
                    OV
                  </div>
                  
                  {/* Sidebar Trigger (Clean Tooltip composition with render prop to prevent gaps) */}
                  <Tooltip>
                    <TooltipTrigger render={
                      <SidebarTrigger className="w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all cursor-pointer flex items-center justify-center mt-2.5" />
                    } />
                    <TooltipContent side="right">Toggle Sidebar</TooltipContent>
                  </Tooltip>

                  
                  {/* Navigation Toolbar (styled in a sleek menubar layout block) */}
                  <div className="flex flex-col items-center gap-2.5 w-full px-2 mt-1">
                    <Tooltip>
                      <TooltipTrigger
                        onClick={() => navigate('scan')}
                        className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center transition-all cursor-pointer",
                          activeView === "scan"
                            ? "bg-primary/15 text-primary font-bold shadow-xs"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                        )}
                      >
                        <Scan className="w-4 h-4" />
                      </TooltipTrigger>
                      <TooltipContent side="right">Scan Dashboard</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger
                        onClick={handleCreateNote}
                        className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center transition-all cursor-pointer",
                          activeView.startsWith("note-")
                            ? "bg-primary/15 text-primary font-bold shadow-xs"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                        )}
                      >
                        <FilePlus className="w-4 h-4" />
                      </TooltipTrigger>
                      <TooltipContent side="right">Create Note</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger
                        onClick={() => navigate('node-graph')}
                        className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center transition-all cursor-pointer",
                          activeView === "node-graph"
                            ? "bg-primary/15 text-primary font-bold shadow-xs"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                        )}
                      >
                        <Network className="w-4 h-4" />
                      </TooltipTrigger>
                      <TooltipContent side="right">Node Graph</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger
                        onClick={() => navigate('quiz')}
                        className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center transition-all cursor-pointer",
                          activeView === "quiz"
                            ? "bg-primary/15 text-primary font-bold shadow-xs"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                        )}
                      >
                        <GraduationCap className="w-4 h-4" />
                      </TooltipTrigger>
                      <TooltipContent side="right">Quiz</TooltipContent>
                    </Tooltip>
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="flex flex-col items-center gap-3 w-full px-2">
                  <Tooltip>
                    <TooltipTrigger
                      onClick={toggleTheme}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted hover:bg-muted/60 transition-all border border-border/50 cursor-pointer"
                    >
                      {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-slate-700" />}
                    </TooltipTrigger>
                    <TooltipContent side="right">Toggle Theme</TooltipContent>
                  </Tooltip>
                </div>
              </header>

              {/* Main workspace layout */}
              <div className="flex-1 flex overflow-hidden relative w-full h-full">
                <AppSidebar className="h-full" />
                <main className="flex-1 h-full w-full relative overflow-hidden">
                  {children}
                </main>
              </div>
            </SidebarProvider>
          </TooltipProvider>
        </WorkspaceProvider>
      </body>
    </html>
  );
}
