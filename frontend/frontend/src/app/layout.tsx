"use client";

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

export default function DashboardLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const navigate = (view: string) => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('navigate-view', { detail: view }));
    }
  };

  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-background text-foreground antialiased overflow-hidden">
        
        <SidebarProvider className="flex flex-col h-screen w-screen overflow-hidden">
          {/* Top stuck Menubar */}
          <header className="h-10 w-full border-b border-foreground/10 bg-background flex items-center px-4 z-50 shrink-0 gap-2">
            <SidebarTrigger className="text-foreground/50 hover:text-primary" />
            <h1>OmniVault</h1>
            <Menubar className="border-none bg-transparent">
              <MenubarMenu>
                <MenubarTrigger className="cursor-pointer">navigation</MenubarTrigger>
                <MenubarContent>
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
          </header>

          {/* Main workspace layout */}
          <div className="flex-1 flex overflow-hidden relative w-full h-[calc(100vh-2.5rem)]">
            <AppSidebar className="top-10 h-[calc(100vh-2.5rem)]" />
            <main className="flex-1 h-full w-full relative overflow-hidden">
              {children}
            </main>
          </div>
        </SidebarProvider>
      </body>
    </html>
  )
}
