"use client";

import * as React from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"
import { useWorkspace } from "@/context/WorkspaceContext"
import { ChevronDown, ChevronRight, FileText, Folder, Play, Trash2, Sparkles } from "lucide-react"
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible"

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

  // 1. Process existing files
  notesFiles.forEach((file) => {
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
    <Sidebar className={cn("border-r border-border/40", className)} {...props}>
      <SidebarHeader className="px-4 py-2 border-b border-border/30 shrink-0">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Workspace Tree</span>
          <span className="text-[10px] font-mono text-muted-foreground/60">
            {totalNotesCount} items total
          </span>
        </div>
      </SidebarHeader>

      <SidebarContent className="p-2 overflow-y-auto overflow-x-hidden select-none space-y-3">
        {/* Adaptive Planner Entry Link */}
        <div className="px-1.5 pb-1 shrink-0">
          <button
            onClick={() => {
              if (typeof window !== "undefined") {
                window.dispatchEvent(new CustomEvent("navigate-view", { detail: "mutated-companion" }));
              }
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 bg-primary/10 border border-primary/20 hover:bg-primary/15 hover:border-primary/30 rounded-xl transition-all text-xs font-extrabold text-primary text-left cursor-pointer shadow-xs"
          >
            <Sparkles className="w-4 h-4 shrink-0 text-primary animate-pulse" />
            <div className="flex flex-col min-w-0">
              <span>Mutated Study Planner</span>
              <span className="text-[9px] text-primary/70 font-normal mt-0.5">Adaptive RAG syllabus loop</span>
            </div>
          </button>
        </div>

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
                  "flex items-center justify-between w-full hover:bg-muted/40 rounded-xl px-1.5 py-1 transition-all border border-transparent mb-1",
                  isActive && "bg-primary/10 border-primary/25 shadow-xs",
                  isDragOverRoot === session.notesPath && "bg-primary/15 border-dashed border-primary"
                )}>
                  <CollapsibleTrigger
                    onDragOver={(e) => handleDragOverRoot(e, session.notesPath)}
                    onDragLeave={handleDragLeaveRoot}
                    onDrop={(e) => handleDropRoot(e, session.notesPath)}
                    className="flex items-center gap-1.5 min-w-0 flex-1 text-sm text-foreground hover:text-foreground font-bold text-left cursor-pointer"
                  >
                    <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
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
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Remove vault "${notesDirName}" from workspace?`)) {
                          deleteVaultSession(session.notesPath);
                        }
                      }}
                      className="p-1 hover:bg-background border border-border/40 rounded-lg shrink-0 cursor-pointer text-muted-foreground hover:text-destructive transition-all"
                      title="Remove Vault"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
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

      <SidebarFooter className="p-2 border-t border-border/30 bg-muted/10 shrink-0">
        <div className="text-[10px] font-mono text-muted-foreground/50 text-center">
          OmniVault v0.1.0
        </div>
      </SidebarFooter>
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
            "flex items-center gap-1.5 w-full py-0.5 hover:bg-muted/40 rounded text-sm text-foreground/80 hover:text-foreground font-semibold text-left cursor-pointer transition-colors border border-transparent",
            isDragOver && "bg-primary/10 border-dashed border-primary"
          )}
          style={{ paddingLeft: `${level * 12 + 6}px` }}
        >
          {isOpen ? (
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          )}
          <Folder className="w-3.5 h-3.5 text-amber-500/80 shrink-0" />
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
          "flex items-center gap-1.5 flex-1 py-0.5 text-left cursor-pointer transition-colors font-medium border border-transparent active:opacity-60 min-w-0",
          node.isGap
            ? "text-amber-500 hover:text-amber-400"
            : "text-muted-foreground hover:text-foreground"
        )}
        style={{ paddingLeft: `${level * 12 + 20}px` }}
      >
        <FileText
          className={cn(
            "w-3.5 h-3.5 shrink-0",
            node.isGap ? "text-amber-500" : "text-primary/75"
          )}
        />
        <span className="truncate">{node.name}</span>
        {node.isGap && (
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" title="Knowledge Gap" />
        )}
      </button>

      {/* Delete Note Button (only for non-gap physical files) */}
      {!node.isGap && (
        <button
          onClick={async (e) => {
            e.stopPropagation();
            if (confirm(`Are you sure you want to delete note "${node.name}"?`)) {
              setActiveVaultPath(sessionPath);
              await deleteNote(node.path);
            }
          }}
          className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-background border border-transparent hover:border-border/40 rounded-lg shrink-0 cursor-pointer text-muted-foreground hover:text-destructive transition-all ml-1"
          title="Delete Note"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}