import '@/app/globals.css'
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/app-sidebar'

export default function DashboardLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="light">
      <body className="min-h-screen bg-background text-foreground antialiased overflow-hidden">
        
        <SidebarProvider>
          <AppSidebar />
          <main className="flex-1 h-screen flex flex-col overflow-hidden">
            <div className="p-2 border-b border-foreground/10 bg-background flex items-center">
              <SidebarTrigger className="text-foreground/50 hover:text-white" />
            </div>
            
            <div className="flex-1 overflow-auto">
              {children}
            </div>
          </main>
        </SidebarProvider>
      </body>
    </html>
  )
}