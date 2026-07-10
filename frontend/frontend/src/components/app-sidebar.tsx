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
import { ChevronDown, ChevronRight, FileText, Folder } from "lucide-react"
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
    // Only add if not already in the tree as an existing file
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

  // Sort: folders first, then files alphabetically
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
  const { scanResult, notesFiles, notesPath } = useWorkspace();

  const gaps = React.useMemo(() => {
    return scanResult?.report || [];
  }, [scanResult]);

  const treeData = React.useMemo(() => {
    const res = buildTree(notesFiles || [], gaps);
    console.log("AppSidebar treeData:", res, "notesFiles:", notesFiles, "gaps:", gaps);
    return res;
  }, [notesFiles, gaps]);

  const notesDirName = notesPath || "notes";

  return (
    <Sidebar className={cn("border-r border-border/40", className)} {...props}>
      <SidebarHeader className="px-4 py-2 border-b border-border/30 shrink-0">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Workspace Tree</span>
          <span className="text-[10px] font-mono text-muted-foreground/60">
            {notesFiles.length + gaps.filter(g => !notesFiles.some(f => f.path.toLowerCase().includes(g.term.toLowerCase()))).length} items total
          </span>
        </div>
      </SidebarHeader>

      <SidebarContent className="p-2 overflow-y-auto overflow-x-hidden select-none">
        {/* Main Folder Node representing notes directory */}
        <Collapsible defaultOpen={true} className="w-full">
          <CollapsibleTrigger className="flex items-center gap-1.5 w-full py-1 hover:bg-muted/40 rounded text-sm text-foreground hover:text-foreground font-bold text-left cursor-pointer transition-colors px-1">
            <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
            <Folder className="w-4 h-4 text-primary shrink-0" />
            <span className="truncate">{notesDirName}</span>
          </CollapsibleTrigger>
          <CollapsibleContent className="w-full pl-2 mt-0.5 space-y-0.5">
            {treeData.length === 0 ? (
              <div className="pl-6 py-1 text-xs text-muted-foreground/50 italic">
                Empty vault...
              </div>
            ) : (
              treeData.map((node) => (
                <RenderTreeNode key={node.path} node={node} level={0} />
              ))
            )}
          </CollapsibleContent>
        </Collapsible>
      </SidebarContent>

      <SidebarFooter className="p-2 border-t border-border/30 bg-muted/10 shrink-0">
        <div className="text-[10px] font-mono text-muted-foreground/50 text-center">
          OmniVault v0.1.0
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

function RenderTreeNode({ node, level }: { node: TreeNode; level: number }) {
  const [isOpen, setIsOpen] = React.useState(true);

  if (node.isFolder) {
    return (
      <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-full">
        <CollapsibleTrigger
          className="flex items-center gap-1.5 w-full py-0.5 hover:bg-muted/40 rounded text-sm text-foreground/80 hover:text-foreground font-semibold text-left cursor-pointer transition-colors"
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
            <RenderTreeNode key={child.path} node={child} level={level + 1} />
          ))}
        </CollapsibleContent>
      </Collapsible>
    );
  }

  return (
    <button
      onClick={() => {
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("open-note", { detail: node.name }));
        }
      }}
      className={cn(
        "flex items-center gap-1.5 w-full py-0.5 hover:bg-muted/40 rounded text-sm text-left cursor-pointer transition-colors font-medium",
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
  );
}