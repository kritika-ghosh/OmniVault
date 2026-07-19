"use client";

import React, { useRef, useEffect, useCallback, useMemo } from "react";

interface DotGridProps {
  dotSize?: number;
  gap?: number;
  baseColor?: string;
  activeColor?: string; // Kept for backward compatibility
  proximity?: number; // Kept for backward compatibility
  speedTrigger?: number; // Kept for backward compatibility
  shockRadius?: number; // Kept for backward compatibility
  shockStrength?: number; // Kept for backward compatibility
  maxSpeed?: number; // Kept for backward compatibility
  resistance?: number; // Kept for backward compatibility
  returnDuration?: number; // Kept for backward compatibility
  className?: string;
  style?: React.CSSProperties;
}

interface Dot {
  cx: number;
  cy: number;
}

const DotGrid: React.FC<DotGridProps> = ({
  dotSize = 3,
  gap = 24,
  baseColor = "var(--muted-foreground)",
  className = "",
  style,
}) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dotsRef = useRef<Dot[]>([]);

  const circlePath = useMemo(() => {
    if (typeof window === "undefined" || !window.Path2D) return null;
    const p = new Path2D();
    p.arc(0, 0, dotSize / 2, 0, Math.PI * 2);
    return p;
  }, [dotSize]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const isDark = document.documentElement.classList.contains("dark");
    let colorStr = baseColor;

    if (baseColor.startsWith("var(")) {
      const varName = baseColor.slice(4, -1).trim();
      const resolved = window.getComputedStyle(canvas).getPropertyValue(varName).trim();
      // If the CSS variable resolves to oklch (which canvas fillStyle doesn't support well),
      // we fall back to a high-compatibility rgba value based on light/dark mode.
      if (resolved && !resolved.includes("oklch")) {
        colorStr = resolved;
      } else {
        colorStr = isDark ? "rgba(255, 255, 255, 0.35)" : "rgba(0, 0, 0, 0.15)";
      }
    }
    
    ctx.fillStyle = colorStr;
    
    const circle = circlePath;
    if (!circle) return;

    for (const dot of dotsRef.current) {
      ctx.save();
      ctx.translate(dot.cx, dot.cy);
      ctx.fill(circle);
      ctx.restore();
    }
  }, [baseColor, circlePath]);

  const buildGrid = useCallback(() => {
    const wrap = wrapperRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;

    const { width, height } = wrap.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.resetTransform();
      ctx.scale(dpr, dpr);
    }

    const cols = Math.floor((width + gap) / (dotSize + gap));
    const rows = Math.floor((height + gap) / (dotSize + gap));
    const cell = dotSize + gap;

    const gridW = cell * cols - gap;
    const gridH = cell * rows - gap;

    const extraX = width - gridW;
    const extraY = height - gridH;

    const startX = extraX / 2 + dotSize / 2;
    const startY = extraY / 2 + dotSize / 2;

    const dots: Dot[] = [];
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const cx = startX + x * cell;
        const cy = startY + y * cell;
        dots.push({ cx, cy });
      }
    }
    dotsRef.current = dots;
    draw();
  }, [dotSize, gap, draw]);

  useEffect(() => {
    buildGrid();

    // Redraw on element resize
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => {
        buildGrid();
      });
      wrapperRef.current && ro.observe(wrapperRef.current);
    } else {
      window.addEventListener("resize", buildGrid);
    }

    // Redraw on theme change (class changes on documentElement)
    const observer = new MutationObserver(() => {
      draw();
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => {
      if (ro) ro.disconnect();
      else window.removeEventListener("resize", buildGrid);
      observer.disconnect();
    };
  }, [buildGrid, draw]);

  return (
    <section className={`p-4 flex items-center justify-center h-full w-full relative ${className}`} style={style}>
      <div ref={wrapperRef} className="w-full h-full relative">
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
      </div>
    </section>
  );
};

export default DotGrid;
