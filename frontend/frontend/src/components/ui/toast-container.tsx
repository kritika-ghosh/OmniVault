"use client";

import React, { useState, useEffect } from "react";
import { Sparkles, CheckCircle, AlertTriangle, Loader2, X } from "lucide-react";

export interface ToastItem {
  id: string;
  message: string;
  type: "info" | "success" | "error" | "loading";
  duration: number;
}

export default function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const handleShowToast = (e: Event) => {
      const { id = Math.random().toString(36).substring(2, 9), message, type, duration = 3000 } = (e as CustomEvent).detail;
      setToasts((prev) => {
        const index = prev.findIndex((t) => t.id === id);
        if (index > -1) {
          const updated = [...prev];
          updated[index] = { id, message, type, duration };
          return updated;
        }
        return [...prev, { id, message, type, duration }];
      });
      
      if (type !== "loading") {
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== id));
        }, duration);
      }
    };
    
    const handleDismissToast = (e: Event) => {
      const { id } = (e as CustomEvent).detail;
      setToasts((prev) => prev.filter((t) => t.id !== id));
    };

    window.addEventListener("show-toast", handleShowToast);
    window.addEventListener("dismiss-toast", handleDismissToast);
    return () => {
      window.removeEventListener("show-toast", handleShowToast);
      window.removeEventListener("dismiss-toast", handleDismissToast);
    };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 max-w-sm w-full pointer-events-none select-none">
      {toasts.map((toast) => {
        let borderLeftClass = "border-l-4 border-l-primary";
        let icon = <Sparkles className="w-4 h-4 text-primary" />;

        if (toast.type === "success") {
          borderLeftClass = "border-l-4 border-l-emerald-500";
          icon = <CheckCircle className="w-4 h-4 text-emerald-400" />;
        } else if (toast.type === "error") {
          borderLeftClass = "border-l-4 border-l-red-500";
          icon = <AlertTriangle className="w-4 h-4 text-red-400" />;
        } else if (toast.type === "loading") {
          borderLeftClass = "border-l-4 border-l-accent";
          icon = <Loader2 className="w-4 h-4 text-accent animate-spin" />;
        }

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start justify-between gap-3 bg-[#0f141c]/95 border border-white/10 ${borderLeftClass} rounded-xl p-4 shadow-2xl animate-in slide-in-from-bottom-5 duration-200`}
          >
            <div className="flex items-start gap-2.5 min-w-0">
              <div className="shrink-0 mt-0.5">{icon}</div>
              <p className="text-xs font-mono text-foreground font-semibold leading-relaxed break-words">
                {toast.message}
              </p>
            </div>
            {toast.type !== "loading" && (
              <button
                onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
                className="shrink-0 text-muted-foreground hover:text-foreground cursor-pointer transition-colors p-0.5 rounded hover:bg-white/5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
