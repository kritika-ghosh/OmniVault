"use client";

import { useState, useEffect } from "react";
import '@/app/globals.css'
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/app-sidebar'
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarTrigger,
} from "@/components/ui/menubar"

import { WorkspaceProvider } from "@/context/WorkspaceContext";

export default function DashboardLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    if (savedTheme) {
      setTheme(savedTheme);
    }
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

  return (
    <html lang="en" className={theme}>
      <body className="min-h-screen bg-background text-foreground antialiased overflow-hidden">
        <WorkspaceProvider>
          <SidebarProvider className="flex flex-row h-screen w-screen overflow-hidden">
            {/* Left stuck Vertical Menubar */}
            <header className="w-12 h-full border-r border-foreground/10 bg-background flex flex-col items-center justify-between py-4 z-50 shrink-0 gap-4">
              <div className="flex flex-col items-center gap-4 w-full">
                {/* Logo / Short Title */}
                <div className="text-xs font-bold tracking-wider text-primary select-none mt-1" title="OmniVault">
                  OV
                </div>
                
                <SidebarTrigger className="text-foreground/50 hover:text-primary cursor-pointer" />
                
                <Menubar className="border-none bg-transparent flex flex-col gap-2 p-0 h-auto">
                  <MenubarMenu>
                    <MenubarTrigger className="cursor-pointer px-2 py-1 hover:bg-muted rounded text-xs select-none">
                      nav
                    </MenubarTrigger>
                    <MenubarContent side="right" align="start">
                      <MenubarItem onClick={() => navigate('scan')} className="cursor-pointer">
                        scan dashboard
                      </MenubarItem>
                      <MenubarItem onClick={() => navigate('node-graph')} className="cursor-pointer">
                        node-graph.tsx
                      </MenubarItem>
                      <MenubarItem onClick={() => navigate('quiz')} className="cursor-pointer">
                        quiz.tsx
                      </MenubarItem>
                      <MenubarItem onClick={() => navigate('synthesize-note')} className="cursor-pointer">
                        synthesize-note.tsx
                      </MenubarItem>
                    </MenubarContent>
                  </MenubarMenu>
                </Menubar>
              </div>

              <button
                onClick={toggleTheme}
                className="text-foreground/50 hover:text-primary cursor-pointer p-2 rounded text-xs flex items-center justify-center border border-foreground/10 hover:bg-muted font-medium transition-colors"
                title="Toggle Theme"
              >
                {theme === 'dark' ? '🌙' : '☀️'}
              </button>
            </header>

            {/* Main workspace layout */}
            <div className="flex-1 flex overflow-hidden relative w-full h-full">
              <AppSidebar className="h-full" />
              <main className="flex-1 h-full w-full relative overflow-hidden">
                {children}
              </main>
            </div>
          </SidebarProvider>
        </WorkspaceProvider>
      </body>
    </html>
  )
}


