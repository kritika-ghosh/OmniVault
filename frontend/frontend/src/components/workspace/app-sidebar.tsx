"use client";

import * as React from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"
import Link from "next/link";
import { useWorkspace } from "@/context/WorkspaceContext";
import { ChevronDown, ChevronRight, FileText, Folder, Play, Trash2, Sparkles, Layers, User, Search, FilePlus, X, MoreHorizontal } from "lucide-react"
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible"
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu"

interface TreeNode {
  name: string;
  path: string;
  isFolder: boolean;
  isGap?: boolean;
  children?: TreeNode[];
}

function buildTree(
  notesFiles: { path: string }[],
  gaps: { term: string }[]
): TreeNode[] {
  const root: TreeNode[] = [];

  // 1. Process existing files (ignore .obsidian metadata folder)
  notesFiles
    .filter((file) => !file.path.startsWith(".obsidian") && !file.path.includes("/.obsidian"))
    .forEach((file) => {
    const parts = file.path.split("/");
    let currentLevel = root;

    parts.forEach((part, index) => {
      const isLast = index === parts.length - 1;
      const cleanName = isLast ? part.replace(/\.md$/i, "") : part;

      let existingNode = currentLevel.find(
        (node) => node.name === cleanName && node.isFolder === !isLast
      );

      if (!existingNode) {
        const newNode: TreeNode = {
          name: cleanName,
          path: parts.slice(0, index + 1).join("/"),
          isFolder: !isLast,
          isGap: false,
          children: isLast ? undefined : [],
        };
        currentLevel.push(newNode);
        existingNode = newNode;
      }

      if (!isLast && existingNode.children) {
        currentLevel = existingNode.children;
      }
    });
  });

  // 2. Process gaps as virtual files at the root level
  gaps.forEach((gap) => {
    const cleanTerm = gap.term.trim();
    const termLower = cleanTerm.toLowerCase();
    const isDocIndexed = notesFiles.some((f) => {
      const parts = f.path.split("/");
      const name = (parts[parts.length - 1] || "").replace(/\.md$/i, "").toLowerCase();
      return name === termLower;
    });

    if (!isDocIndexed) {
      root.push({
        name: cleanTerm,
        path: `${cleanTerm}.md`,
        isFolder: false,
        isGap: true,
      });
    }
  });

  const sortTree = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => {
      if (a.isFolder && !b.isFolder) return -1;
      if (!a.isFolder && b.isFolder) return 1;
      return a.name.localeCompare(b.name);
    });
    nodes.forEach((node) => {
      if (node.children) sortTree(node.children);
    });
  };

  sortTree(root);
  return root;
}

export function AppSidebar({ className, ...props }: React.ComponentProps<typeof Sidebar>) {
  const { vaultSessions, saveNote, deleteNote, activeVaultPath, setActiveVaultPath, deleteVaultSession } = useWorkspace();
  const [isDragOverRoot, setIsDragOverRoot] = React.useState<string | null>(null);

  const [currentUser, setCurrentUser] = React.useState<{ name?: string; email?: string; avatar?: string } | null>(null);
  const [isAddNoteModalOpen, setIsAddNoteModalOpen] = React.useState(false);
  const [newNoteName, setNewNoteName] = React.useState("");
  const [newNoteVault, setNewNoteVault] = React.useState("");
  const [pendingNoteToCreate, setPendingNoteToCreate] = React.useState<{name: string, vault: string} | null>(null);

  React.useEffect(() => {
    if (isAddNoteModalOpen) {
      setNewNoteVault(activeVaultPath || Object.keys(vaultSessions)[0] || "");
      setNewNoteName("");
    }
  }, [isAddNoteModalOpen, activeVaultPath, vaultSessions]);

  React.useEffect(() => {
    const handleOpenAddNote = () => setIsAddNoteModalOpen(true);
    window.addEventListener("open-add-note-modal", handleOpenAddNote);
    return () => window.removeEventListener("open-add-note-modal", handleOpenAddNote);
  }, []);

  const handleCreateNote = () => {
    if (newNoteName.trim() && newNoteVault) {
      setActiveVaultPath(newNoteVault);
      setPendingNoteToCreate({ name: newNoteName.trim(), vault: newNoteVault });
      setIsAddNoteModalOpen(false);
    }
  };

  React.useEffect(() => {
    if (pendingNoteToCreate && activeVaultPath === pendingNoteToCreate.vault) {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("show-toast", { detail: { id: "create-note", message: `Creating note "${pendingNoteToCreate.name}"...`, type: "loading" } }));
      }
      saveNote(pendingNoteToCreate.name, "").then(() => {
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("show-toast", { detail: { id: "create-note", message: `Note "${pendingNoteToCreate.name}" created!`, type: "success" } }));
          window.dispatchEvent(new CustomEvent("open-note", { detail: pendingNoteToCreate.name }));
        }
        setPendingNoteToCreate(null);
      }).catch((err) => {
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("show-toast", { detail: { id: "create-note", message: `Failed to create note: ${err.message || err}`, type: "error" } }));
        }
        setPendingNoteToCreate(null);
      });
    }
  }, [pendingNoteToCreate, activeVaultPath, saveNote]);

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = sessionStorage.getItem("omnivault_user");
      if (stored) {
        try { setCurrentUser(JSON.parse(stored)); } catch (e) {}
      }
    }
  }, []);

  const totalNotesCount = React.useMemo(() => {
    return Object.values(vaultSessions).reduce((acc, session) => acc + session.notesFiles.length, 0);
  }, [vaultSessions]);

  const handleDragOverRoot = (e: React.DragEvent, path: string) => {
    e.preventDefault();
    setIsDragOverRoot(path);
  };

  const handleDragLeaveRoot = () => {
    setIsDragOverRoot(null);
  };

  const handleDropRoot = async (e: React.DragEvent, destVaultPath: string) => {
    e.preventDefault();
    setIsDragOverRoot(null);
    const notePath = e.dataTransfer.getData("notePath");
    const sourceVaultPath = e.dataTransfer.getData("sourceVaultPath");
    if (!notePath || !sourceVaultPath) return;

    const filename = notePath.split("/").pop() || "";
    
    // Find the file to move from the source session
    const sourceSession = vaultSessions[sourceVaultPath];
    const fileToMove = sourceSession?.notesFiles.find((f) => f.path === notePath);
    if (!fileToMove) return;

    // 1. Temporarily activate destination to trigger correct saving handle/API
    setActiveVaultPath(destVaultPath);

    // 2. Save note to destination root
    await saveNote(filename, fileToMove.content);

    // 3. Temporarily activate source to trigger correct deleting handle/API
    setActiveVaultPath(sourceVaultPath);
    await deleteNote(notePath);

    // 4. Reactive target focus
    setActiveVaultPath(destVaultPath);
  };

  return (
    <Sidebar className={cn("border-r border-border",className)} {...props}>
      <SidebarHeader className="px-3 py-3 border-b border-border shrink-0 space-y-1 font-sans">
        <button
          onClick={() => {
            if (typeof window !== "undefined") {
              window.dispatchEvent(new CustomEvent("open-command-palette"));
            }
          }}
          className="w-full flex items-center justify-between px-2 py-1.5 bg-muted/50 text-xs text-muted-foreground transition-all cursor-pointer"
          title="Search Vault & Codebase (Cmd+K / Ctrl+K)"
        >
          <span className="flex items-center gap-2 text-foreground/80 group-hover:text-foreground text-xs">
            <Search className="w-3.5 h-3.5" />
            Search Vault & RAG...
          </span>
          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-muted/60 text-muted-foreground border border-border">
            ⌘K
          </span>
        </button>
        

        {/* Global RAG Command Palette Search Trigger */}
        

        {/* Code Analyzer Trigger */}
        <button
          onClick={() => {
            if (typeof window !== "undefined") {
              window.dispatchEvent(new CustomEvent("open-project-analyzer"));
            }
          }}
          className="w-full flex items-center justify-between px-2 py-1.5 bg-accent/10 border border-accent/50 hover:border-accent/40 text-xs text-accent transition-all cursor-pointer shadow-xs group"
          title="Connect Project Codebase"
        >
          <span className="flex items-center gap-2 text-accent font-bold">
            <Layers className="w-3.5 h-3.5" />
            Codebase Analyzer
          </span>
          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-accent/20 text-accent border border-accent/30">
            AST
          </span>
        </button>

      </SidebarHeader>

      <SidebarContent className="p-2 overflow-y-auto overflow-x-hidden select-none space-y-2">
        <h1 className="text-foreground/60 text-xs font-semibold tracking-tight underline underline-offset-4 px-2">
          Notes Vaults
        </h1>

        {Object.keys(vaultSessions).length === 0 ? (
          <div className="text-xs text-muted-foreground/50 italic p-4 text-center">
            No active vaults. Initialize a scan to display trees.
          </div>
        ) : (
          Object.values(vaultSessions).map((session) => {
            const notesDirName = session.notesPath.split(/[/\\]/).pop() || session.notesPath;
            const treeData = buildTree(session.notesFiles || [], session.scanResult?.report || []);
            const isActive = activeVaultPath === session.notesPath;

            return (
              <Collapsible key={session.notesPath} defaultOpen={true} className="w-full">
                <div className={cn(
                  "flex items-center justify-between w-full hover:bg-muted/40  px-1.5 py-1 transition-all mb-1",
                  isActive && "bg-primary/10 border-primary/25 shadow-xs",
                  isDragOverRoot === session.notesPath && "bg-primary/15 border-dashed border-primary"
                )}>
                  <CollapsibleTrigger
                    onDragOver={(e) => handleDragOverRoot(e, session.notesPath)}
                    onDragLeave={handleDragLeaveRoot}
                    onDrop={(e) => handleDropRoot(e, session.notesPath)}
                    className="group flex items-center gap-1.5 min-w-0 flex-1 text-base text-foreground hover:text-foreground font-mono text-left cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-90" />
                    <Folder className={cn("w-4 h-4 shrink-0", isActive ? "text-primary" : "text-muted-foreground/70")} />
                    <span className={cn("truncate", isActive && "text-primary font-black")}>{notesDirName}</span>
                  </CollapsibleTrigger>

                  {/* Launch & Delete controls */}
                  <div className="flex items-center gap-1 shrink-0 ml-1.5">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (typeof window !== "undefined") {
                          window.dispatchEvent(new CustomEvent("open-scan-dashboard", { detail: session.notesPath }));
                        }
                      }}
                      className="p-1 hover:bg-background border border-border/40 rounded-lg shrink-0 cursor-pointer text-muted-foreground hover:text-primary transition-all"
                      title="Open Dashboard"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                    </button>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        onClick={(e: React.MouseEvent) => e.stopPropagation()}
                        className="p-1 hover:bg-background border border-transparent hover:border-border/40 rounded-lg shrink-0 cursor-pointer text-muted-foreground hover:text-primary transition-all ml-1"
                        title="More Options"
                      >
                        <MoreHorizontal className="w-3.5 h-3.5" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Remove vault "${notesDirName}" from workspace?`)) {
                              deleteVaultSession(session.notesPath);
                            }
                          }}
                          className="text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5 mr-2" />
                          Remove Vault
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                <CollapsibleContent className="w-full pl-2 mt-0.5 space-y-0.5">
                  {treeData.length === 0 ? (
                    <div className="pl-6 py-1 text-xs text-muted-foreground/50 italic">
                      Empty vault...
                    </div>
                  ) : (
                    treeData.map((node) => (
                      <RenderTreeNode
                        key={node.path}
                        node={node}
                        level={0}
                        sessionPath={session.notesPath}
                      />
                    ))
                  )}
                </CollapsibleContent>
              </Collapsible>
            );
          })
        )}
      </SidebarContent>

      <SidebarFooter className="p-2 border-t border-border bg-muted/10 shrink-0 font-sans">
        {currentUser ? (
          <div className="flex items-center justify-between p-2 rounded-xl">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-primary bg-primary/30 p-1 text-[10px] font-bold shrink-0">
                {currentUser.avatar || currentUser.name?.charAt(0).toUpperCase() || <User className="w-3.5 h-3.5" />}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold text-foreground truncate">{currentUser.name || "Vault Architect"}</span>
                <span className="text-xs text-muted-foreground truncate">{currentUser.email || "session auth"}</span>
              </div>
            </div>
            <button
              onClick={() => {
                sessionStorage.removeItem("omnivault_user");
                setCurrentUser(null);
                if (typeof window !== "undefined") {
                  window.location.href = "/auth";
                }
              }}
              className="text-[10px] text-red-400 font-bold px-1.5 py-0.5 rounded bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 cursor-pointer transition-all"
              title="Sign Out"
            >
              Sign Out
            </button>
          </div>
        ) : (
          <Link href="/auth" className="flex items-center justify-between p-2 rounded-xl bg-card border border-border hover:border-accent/40 transition-colors">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 rounded-full bg-accent/20 border border-accent/40 flex items-center justify-center text-accent text-[10px] font-bold shrink-0">
                <User className="w-3.5 h-3.5" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[11px] font-bold text-foreground truncate">Vault Account</span>
                <span className="text-[9px] text-muted-foreground truncate">Session-only Auth</span>
              </div>
            </div>
            <span className="text-[10px] text-accent font-bold px-1.5 py-0.5 rounded bg-accent/10 border border-accent/20">Sign In</span>
          </Link>
        )}
      </SidebarFooter>
      
      {isAddNoteModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 font-sans select-none animate-in fade-in duration-200">
          <div className="bg-[#0f141c] border border-white/15 rounded-2xl max-w-md w-full p-6 shadow-2xl flex flex-col gap-5 max-h-[90vh] overflow-hidden text-foreground animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-primary/20 text-primary border border-primary/30">
                  <FilePlus className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold font-sans text-foreground flex items-center gap-2">
                    Create New Note
                  </h2>
                  <p className="text-xs font-sans tracking-tight text-muted-foreground">
                    Enter a title and select the destination vault
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddNoteModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="space-y-4 shrink-0">
              {/* Note Title Input */}
              <div className="space-y-2 px-4">
                <span className="text-base font-bold text-foreground flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-primary" /> Note Title:
                </span>
                <input
                  type="text"
                  autoFocus
                  placeholder="e.g. System Architecture"
                  value={newNoteName}
                  onChange={(e) => setNewNoteName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreateNote()}
                  className="w-full h-10 bg-muted border border-white/30 rounded-xl px-3 text-sm font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-all select-text"
                />
              </div>

              {/* Vault Destination Dropdown */}
              <div className="space-y-2 px-4">
                <span className="text-base font-bold text-foreground flex items-center gap-1.5">
                  <Folder className="w-4 h-4 text-primary" /> Destination Vault:
                </span>
                <select
                  value={newNoteVault}
                  onChange={(e) => setNewNoteVault(e.target.value)}
                  className="w-full h-10 bg-muted border border-white/30 rounded-xl px-3 py-2 text-sm text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary transition-all cursor-pointer"
                >
                  {Object.keys(vaultSessions).map((vp) => (
                    <option key={vp} value={vp}>
                      {vp}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center gap-2 pt-2 px-4 border-t border-white/5 font-sans">
              <button
                onClick={handleCreateNote}
                disabled={!newNoteName.trim() || !newNoteVault}
                className="flex-1 h-9 text-xs font-bold uppercase tracking-wider bg-primary hover:bg-primary/95 text-primary-foreground rounded-lg transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Create Note
              </button>

              <button
                onClick={() => setIsAddNoteModalOpen(false)}
                className="h-9 px-4 text-xs font-bold bg-card hover:bg-white/5 border border-border text-foreground rounded-lg cursor-pointer flex items-center gap-1.5"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </Sidebar>
  );
}

interface RenderTreeNodeProps {
  node: TreeNode;
  level: number;
  sessionPath: string;
}

function RenderTreeNode({ node, level, sessionPath }: RenderTreeNodeProps) {
  const [isOpen, setIsOpen] = React.useState(true);
  const [isDragOver, setIsDragOver] = React.useState(false);
  const { saveNote, deleteNote, vaultSessions, setActiveVaultPath, deleteVaultSession } = useWorkspace();

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const notePath = e.dataTransfer.getData("notePath");
    const sourceVaultPath = e.dataTransfer.getData("sourceVaultPath");
    if (!notePath || !sourceVaultPath) return;

    const filename = notePath.split("/").pop() || "";
    const destFolder = node.path;
    const newPath = destFolder ? `${destFolder}/${filename}` : filename;

    if (newPath.toLowerCase() === notePath.toLowerCase() && sourceVaultPath === sessionPath) return;

    const sourceSession = vaultSessions[sourceVaultPath];
    const fileToMove = sourceSession?.notesFiles.find((f) => f.path === notePath);
    if (!fileToMove) return;

    // 1. Temporarily activate destination to trigger correct saving handle/API
    setActiveVaultPath(sessionPath);
    await saveNote(newPath, fileToMove.content);

    // 2. Temporarily activate source to trigger correct deleting handle/API
    setActiveVaultPath(sourceVaultPath);
    await deleteNote(notePath);

    // 3. Reactive target focus
    setActiveVaultPath(sessionPath);
  };

  if (node.isFolder) {
    return (
      <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-full">
        <CollapsibleTrigger
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            "group flex items-center gap-1.5 w-full py-0.5 hover:bg-muted/40 rounded text-sm text-foreground/80 hover:text-foreground font-semibold text-left cursor-pointer transition-colors border border-transparent font-mono",
            isDragOver && "bg-primary/10 border-dashed border-primary"
          )}
          style={{ paddingLeft: `${level * 12 + 6}px` }}
        >
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-90" />
          <Folder className="w-3.5 h-3.5 text-primary/80 shrink-0" />
          <span className="truncate">{node.name}</span>
        </CollapsibleTrigger>
        <CollapsibleContent className="w-full">
          {node.children?.map((child) => (
            <RenderTreeNode
              key={child.path}
              node={child}
              level={level + 1}
              sessionPath={sessionPath}
            />
          ))}
        </CollapsibleContent>
      </Collapsible>
    );
  }

  return (
    <div className="group flex items-center justify-between w-full hover:bg-muted/40 rounded transition-colors pr-1.5">
      <button
        draggable={!node.isGap}
        onDragStart={(e) => {
          e.dataTransfer.setData("notePath", node.path);
          e.dataTransfer.setData("sourceVaultPath", sessionPath);
        }}
        onClick={() => {
          // Dynamically focus the active vault containing this note
          setActiveVaultPath(sessionPath);
          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("open-note", { detail: node.name }));
          }
        }}
        className={cn(
          "flex items-center gap-1.5 flex-1 py-0.5 text-sm font-mono text-left cursor-pointer transition-colors font-medium border border-transparent active:opacity-60 min-w-0",
          node.isGap
            ? "text-accent hover:text-accent/80"
            : "text-muted-foreground hover:text-foreground"
        )}
        style={{ paddingLeft: `${level * 12 + 20}px` }}
      >
        <FileText
          className={cn(
            "w-3.5 h-3.5 shrink-0",
            node.isGap ? "text-accent" : "text-primary/75"
          )}
        />
        <span className="truncate">{node.name}</span>
        {node.isGap && (
          <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" title="Knowledge Gap" />
        )}
      </button>

      {/* Delete Note Button (only for non-gap physical files) */}
      {!node.isGap && (
        <DropdownMenu>
          <DropdownMenuTrigger
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
            className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-background border border-transparent hover:border-border/40 rounded-lg shrink-0 cursor-pointer text-muted-foreground hover:text-primary transition-all ml-1"
            title="More Options"
          >
            <MoreHorizontal className="w-3.5 h-3.5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={async (e) => {
                e.stopPropagation();
                if (confirm(`Are you sure you want to delete note "${node.name}"?`)) {
                  setActiveVaultPath(sessionPath);
                  await deleteNote(node.path);
                }
              }}
              className="text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5 mr-2" />
              Delete Note
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
