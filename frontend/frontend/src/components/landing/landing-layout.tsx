"use client";

import React, { useEffect, useRef } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export function GridDistortionCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const mouse = { x: -1000, y: -1000, targetX: -1000, targetY: -1000 };

    const handleMouseMove = (e: MouseEvent) => {
      mouse.targetX = e.clientX;
      mouse.targetY = e.clientY;
    };

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      initGrid();
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("resize", handleResize);

    const spacing = 40;
    interface Point {
      x0: number;
      y0: number;
      x: number;
      y: number;
    }

    let points: Point[][] = [];

    const initGrid = () => {
      points = [];
      const cols = Math.ceil(width / spacing) + 2;
      const rows = Math.ceil(height / spacing) + 2;

      for (let r = 0; r < rows; r++) {
        const row: Point[] = [];
        for (let c = 0; c < cols; c++) {
          const x0 = c * spacing - spacing / 2;
          const y0 = r * spacing - spacing / 2;
          row.push({ x0, y0, x: x0, y: y0 });
        }
        points.push(row);
      }
    };

    initGrid();

    let animId: number;
    const radius = 180;
    const maxDistortion = 45;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      mouse.x += (mouse.targetX - mouse.x) * 0.15;
      mouse.y += (mouse.targetY - mouse.y) * 0.15;

      const rows = points.length;
      const cols = points[0]?.length || 0;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const pt = points[r][c];
          const dx = pt.x0 - mouse.x;
          const dy = pt.y0 - mouse.y;
          const dist = Math.hypot(dx, dy);

          let targetX = pt.x0;
          let targetY = pt.y0;

          if (dist < radius && dist > 0) {
            const force = (1 - dist / radius) * maxDistortion;
            const angle = Math.atan2(dy, dx);
            targetX = pt.x0 + Math.cos(angle) * force;
            targetY = pt.y0 + Math.sin(angle) * force;
          }

          pt.x += (targetX - pt.x) * 0.12;
          pt.y += (targetY - pt.y) * 0.12;
        }
      }

      ctx.lineWidth = 1;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const pt = points[r][c];

          if (c < cols - 1) {
            const pRight = points[r][c + 1];
            const distMouse = Math.hypot(pt.x - mouse.x, pt.y - mouse.y);
            const isNear = distMouse < radius;

            ctx.beginPath();
            ctx.moveTo(pt.x, pt.y);
            ctx.lineTo(pRight.x, pRight.y);
            ctx.strokeStyle = isNear
              ? `rgba(175, 84, 123, ${0.45 * (1 - distMouse / radius)})`
              : "rgba(255, 255, 255, 0.15)";
            ctx.stroke();
          }

          if (r < rows - 1) {
            const pDown = points[r + 1][c];
            const distMouse = Math.hypot(pt.x - mouse.x, pt.y - mouse.y);
            const isNear = distMouse < radius;

            ctx.beginPath();
            ctx.moveTo(pt.x, pt.y);
            ctx.lineTo(pDown.x, pDown.y);
            ctx.strokeStyle = isNear
              ? `rgba(56, 189, 248, ${0.45 * (1 - distMouse / radius)})`
              : "rgba(255, 255, 255, 0.15)";
            ctx.stroke();
          }

          const distMouse = Math.hypot(pt.x - mouse.x, pt.y - mouse.y);
          if (distMouse < radius) {
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, 1.5, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(158, 176, 210, ${0.4 * (1 - distMouse / radius)})`;
            ctx.fill();
          }
        }
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0 opacity-40"
    />
  );
}

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-6 h-15 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <img src="/logo.png" alt="MeowPad Logo" className="w-12 h-12 object-contain group-hover:scale-105 transition-transform" />
          <span className="font-extrabold text-base tracking-tight text-foreground flex items-center gap-1.5 font-sans">
            MeowPad <span className="text-[11px] font-mono px-1.5 py-0.2 rounded bg-muted text-accent border border-accent/30">Vault 1.0</span>
          </span>
        </Link>

        {/* Nav Links */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-mono text-muted-foreground">
          <a href="#playground" className="hover:text-foreground transition-colors">
            Playground
          </a>
          <a href="#architecture" className="hover:text-foreground transition-colors">
            3-Agent System
          </a>
          <a href="#features" className="hover:text-foreground transition-colors">
            Features
          </a>
          <a href="#faq" className="hover:text-foreground transition-colors">
            FAQ
          </a>
        </nav>

        {/* Action CTAs */}
        <div className="flex items-center gap-3">
          <Link href="/auth" className="hidden sm:block">
            <Button variant="outline" className="h-9 border-border bg-card hover:bg-muted text-sm font-mono font-bold cursor-pointer">
              Sign In
            </Button>
          </Link>

          <Link href="/workspace">
            <Button className="bg-accent hover:bg-accent/90 text-white font-bold text-sm h-9 px-5 rounded-lg transition-all cursor-pointer flex items-center gap-2 font-mono">
              <span className="hidden sm:inline">Launch Workspace</span>
              <span className="sm:hidden">Launch</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="relative z-10 border-t border-border py-8 px-6 bg-[#070b10] mt-auto">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6 text-sm text-muted-foreground font-mono text-center sm:text-left">
        <div className="flex flex-col sm:flex-row items-center gap-2">
          <span className="font-bold text-foreground font-sans text-base">MeowPad</span>
          <span className="hidden sm:inline">— local first markdown vault & ast scanner</span>
        </div>

        <div className="flex flex-col items-center sm:items-end gap-1">
          <div className="flex items-center gap-6">
            <Link href="/workspace" className="hover:text-foreground">
              Workspace IDE
            </Link>
            <span className="text-primary">API Operational</span>
          </div>
          <span className="text-xs mt-1">
            made by <a href="https://github.com/kritika-ghosh/OmniVault" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors underline underline-offset-2">Kritika and Diya</a>
          </span>
        </div>
      </div>
    </footer>
  );
}
