"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import dynamic from "next/dynamic";
import { Button } from "./ui/button";
import { useWorkspace } from "@/context/WorkspaceContext";
import { Compass, Layers, Zap } from "lucide-react";

// Dynamically import force graphs to prevent Next.js SSR WebGL/Three.js crashes
const ForceGraph2D = dynamic(
  () => import("react-force-graph-2d"),
  { ssr: false }
);

const ForceGraph3D = dynamic(
  () => import("react-force-graph-3d"),
  { ssr: false }
);

interface GraphNode {
  id: string;
  name: string;
  isGap: boolean;
}

interface GraphLink {
  source: string;
  target: string;
}

export default function NodeGraph() {
  const { notesFiles, scanResult, vaultSessions, activeVaultPath, setActiveVaultPath } = useWorkspace();
  const [is3D, setIs3D] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 600, height: 400 });
  const fgRef2D = useRef<any>(null);
  const fgRef3D = useRef<any>(null);

  // Handle automatic panel resizing
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        setDimensions({
          width: Math.max(100, entry.contentRect.width),
          height: Math.max(100, entry.contentRect.height),
        });
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Parse notes and gaps into force-directed graph format
  const graphData = useMemo(() => {
    const nodes: GraphNode[] = [];
    const links: GraphLink[] = [];
    const nodeIds = new Set<string>();

    // 1. Add documented notes as nodes
    notesFiles.forEach((file) => {
      const filename = file.path.split("/").pop() || "";
      const termName = filename.replace(/\.md$/i, "");
      const id = termName.toLowerCase().trim();

      if (id && !nodeIds.has(id)) {
        nodes.push({
          id,
          name: termName,
          isGap: false,
        });
        nodeIds.add(id);
      }
    });

    // 2. Add gaps as nodes
    const gaps = scanResult?.report || [];
    gaps.forEach((gap) => {
      const termName = gap.term;
      const id = termName.toLowerCase().trim();

      if (id && !nodeIds.has(id)) {
        nodes.push({
          id,
          name: termName,
          isGap: true,
        });
        nodeIds.add(id);
      }
    });

    // 3. Add link connections based on gap detection sources
    gaps.forEach((gap) => {
      const gapId = gap.term.toLowerCase().trim();
      const sources = gap.detected_from || [];

      sources.forEach((src) => {
        const srcName = src.split("/").pop() || "";
        const srcTerm = srcName.replace(/\.md$/i, "");
        const srcId = srcTerm.toLowerCase().trim();

        if (nodeIds.has(srcId) && nodeIds.has(gapId)) {
          links.push({
            source: srcId,
            target: gapId,
          });
        }
      });
    });

    // 4. Add links between notes based on cross-mentions in content
    notesFiles.forEach((file) => {
      const filename = file.path.split("/").pop() || "";
      const termName = filename.replace(/\.md$/i, "");
      const sourceId = termName.toLowerCase().trim();
      const content = file.content || "";

      nodes.forEach((targetNode) => {
        if (targetNode.id === sourceId) return;

        // Simple match: search for bracketed wiki-links [[Target]] or case-insensitive text mention
        const wikiLinkRegex = new RegExp(`\\[\\[${targetNode.name}\\]\\]`, "i");
        const nameRegex = new RegExp(`\\b${targetNode.name}\\b`, "i");

        if (wikiLinkRegex.test(content) || nameRegex.test(content)) {
          // Avoid duplicate links
          const alreadyLinked = links.some(
            (l) => l.source === sourceId && l.target === targetNode.id
          );
          if (!alreadyLinked) {
            links.push({
              source: sourceId,
              target: targetNode.id,
            });
          }
        }
      });
    });

    return { nodes, links };
  }, [notesFiles, scanResult]);

  // Configure forces to pull nodes closer together on mount/data change
  useEffect(() => {
    const timer = setTimeout(() => {
      const fg = fgRef2D.current;
      if (fg) {
        const chargeForce = fg.d3Force("charge");
        const linkForce = fg.d3Force("link");
        if (chargeForce && linkForce) {
          chargeForce.strength(-10);
          linkForce.distance(50);
          try {
            fg.d3ReheatSimulation();
          } catch (e) {
            console.warn("D3 reheat skipped:", e);
          }
        }
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [is3D, graphData]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const fg = fgRef3D.current;
      if (fg) {
        const chargeForce = fg.d3Force("charge");
        const linkForce = fg.d3Force("link");
        if (chargeForce && linkForce) {
          chargeForce.strength(-10);
          linkForce.distance(35);
          try {
            fg.d3ReheatSimulation();
          } catch (e) {
            console.warn("D3 reheat skipped:", e);
          }
        }
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [is3D, graphData]);

  return (
    <div className="w-full h-full flex flex-col bg-background text-foreground overflow-hidden">
      {/* Graph Toolbar Controls */}
      <div className="flex flex-row items-center justify-between gap-4 p-4 border-b border-border shrink-0 bg-muted/10 select-none">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-sm font-bold flex items-center gap-1.5 text-foreground">
            <Compass className="w-4 h-4 text-primary" />
            Knowledge Graph Explorer
          </h2>
          <span className="text-[10px] font-mono text-muted-foreground/80">
            {graphData.nodes.length} nodes · {graphData.links.length} relationships
          </span>
        </div>

        <div className="flex items-center gap-3">
          {Object.keys(vaultSessions).length > 0 && (
            <div className="flex items-center gap-1.5 bg-muted px-2.5 py-1 rounded-lg border border-border">
              <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Vault:</span>
              <select
                value={activeVaultPath}
                onChange={(e) => setActiveVaultPath(e.target.value)}
                className="bg-transparent text-xs font-mono text-foreground focus:outline-hidden cursor-pointer"
              >
                {Object.keys(vaultSessions).map((path) => {
                  const label = path.split(/[/\\]/).pop() || path;
                  return (
                    <option key={path} value={path} className="bg-background text-foreground">
                      {label}
                    </option>
                  );
                })}
              </select>
            </div>
          )}

          <div className="flex items-center bg-muted p-0.5 rounded-lg border border-border">
            <button
            onClick={() => setIs3D(false)}
            className={`px-3 py-1 rounded text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              !is3D
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            2D Graph
          </button>
          <button
            onClick={() => setIs3D(true)}
            className={`px-3 py-1 rounded text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              is3D
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            3D Graph
          </button>
        </div>
      </div>
    </div>

      {/* Render Graph Container */}
      <div ref={containerRef} className="flex-1 w-full h-full relative overflow-hidden bg-black/5 dark:bg-black/25">
        {graphData.nodes.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center select-none">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
              <Layers className="w-6 h-6 text-muted-foreground/60" />
            </div>
            <span className="text-sm font-bold text-muted-foreground">No graph nodes generated</span>
            <span className="text-xs text-muted-foreground/60 mt-1 max-w-xs">
              Select and scan a workspace directory or load mock data to display connections.
            </span>
          </div>
        ) : is3D ? (
          <ForceGraph3D
            ref={fgRef3D}
            graphData={graphData}
            width={dimensions.width}
            height={dimensions.height}
            backgroundColor="rgba(0,0,0,0)"
            nodeColor={(node: any) => (node.isGap ? "#f59e0b" : "#14b8a6")}
            nodeVal={4}
            nodeLabel={(node: any) => `${node.name} (${node.isGap ? "Gap Warning" : "Documented"})`}
            linkWidth={1.5}
            linkColor={() => "rgba(148, 163, 184, 0.65)"}
            linkDirectionalParticles={3}
            linkDirectionalParticleWidth={2}
            linkDirectionalParticleSpeed={0.006}
          />
        ) : (
          <ForceGraph2D
            ref={fgRef2D}
            graphData={graphData}
            width={dimensions.width}
            height={dimensions.height}
            backgroundColor="rgba(0,0,0,0)"
            linkWidth={1.5}
            linkColor={() => "rgba(148, 163, 184, 0.65)"}
            linkDirectionalParticles={2}
            linkDirectionalParticleWidth={1.5}
            linkDirectionalParticleSpeed={0.005}
            nodeCanvasObject={(node: any, ctx, globalScale) => {
              const label = node.name;
              const fontSize = Math.max(3, 11 / globalScale);
              ctx.font = `${fontSize}px Sans-Serif`;

              // Render Glowing Node Sphere
              ctx.beginPath();
              ctx.arc(node.x, node.y, 5, 0, 2 * Math.PI, false);
              ctx.fillStyle = node.isGap ? "#f59e0b" : "#14b8a6";
              ctx.shadowColor = node.isGap ? "#f59e0b" : "#14b8a6";
              ctx.shadowBlur = Math.max(2, 6 / globalScale);
              ctx.fill();
              ctx.shadowBlur = 0; // reset blur

              // Render Label text below the node
              ctx.textAlign = "center";
              ctx.textBaseline = "middle";
              ctx.fillStyle = "var(--foreground)";
              ctx.fillText(label, node.x, node.y + 11);
            }}
          />
        )}
      </div>
    </div>
  );
}
