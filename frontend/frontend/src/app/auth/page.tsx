"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Lock,
  Mail,
  User,
  ArrowRight,
  Shield,
  KeyRound,
  GitBranch,
  Sparkles,
  BookOpen,
  Check,
  AlertCircle,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    setTimeout(() => {
      if (!email || !password) {
        setMessage({ type: "error", text: "Please enter both email and password." });
        setIsLoading(false);
        return;
      }

      const userData = {
        id: "user_" + Math.random().toString(36).substr(2, 9),
        email: email,
        name: mode === "signup" ? fullName || email.split("@")[0] : email.split("@")[0],
        avatar: (fullName || email).charAt(0).toUpperCase(),
        signedInAt: new Date().toISOString(),
      };

      // Store in session storage so it expires when session/tab closes
      sessionStorage.setItem("omnivault_user", JSON.stringify(userData));
      setMessage({ type: "success", text: mode === "signin" ? "Signed in successfully! Redirecting..." : "Account created! Redirecting to Workspace..." });

      setTimeout(() => {
        router.push("/workspace");
      }, 800);
    }, 600);
  };

  const handleDemoLogin = () => {
    setIsLoading(true);
    const demoUser = {
      id: "demo_user_001",
      email: "demo@omnivault.ai",
      name: "Demo Vault Architect",
      avatar: "DV",
      signedInAt: new Date().toISOString(),
    };
    sessionStorage.setItem("omnivault_user", JSON.stringify(demoUser));
    setMessage({ type: "success", text: "Demo Architect session loaded! Redirecting to Workspace..." });
    setTimeout(() => {
      router.push("/workspace");
    }, 600);
  };

  return (
    <div className="min-h-screen bg-graph-paper text-foreground flex flex-col items-center justify-center p-6 select-none font-sans relative">
      {/* Top Header Navigation */}
      <div className="absolute top-6 left-6 right-6 flex items-center justify-between max-w-7xl mx-auto">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-accent/20 border border-accent/30 flex items-center justify-center text-accent font-mono font-bold text-xs group-hover:scale-105 transition-transform">
            OV
          </div>
          <span className="font-bold  tracking-tight text-foreground flex items-center gap-1.5 font-sans text-lg">
            OmniVault <span className="text-[11px] font-mono px-1.5 py-0.2 rounded bg-muted text-accent border border-accent/30">Vault 1.0</span>
          </span>
        </Link>

        <Button
            type="button"
            onClick={handleDemoLogin}
            className="bg-muted hover:bg-muted/80 text-accent font-bold text-xs h-9 rounded-xl border border-accent/30 cursor-pointer flex items-center justify-center gap-2"
          >
            <Zap className="w-3.5 h-3.5 fill-current" />
            <span>1-Click Quick Demo Login</span>
          </Button>
      </div>

      {/* Main Authentication Card */}
      <div className="w-full max-w-md bg-card border border-border rounded-2xl p-8 shadow-2xl space-y-6 relative z-10 my-12">
        {/* Card Title Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent/10 border border-accent/30 text-accent text-xs font-mono">
            <Shield className="w-3.5 h-3.5" />
            <span>Encrypted Vault Auth</span>
          </div>

          <h1 className="text-2xl font-black tracking-tight text-foreground font-sans">
            {mode === "signin" ? "Welcome Back to OmniVault" : "Create Your Vault Account"}
          </h1>
          <p className="text-xs text-muted-foreground">
            {mode === "signin"
              ? "Sign in to access your synchronized codebase knowledge vault."
              : "Register to manage local markdown notes and AI AST gap scans."}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-muted p-1 rounded-xl font-mono text-xs border border-border">
          <button
            onClick={() => { setMode("signin"); setMessage(null); }}
            className={`flex-1 py-1.5 text-center rounded-lg font-bold transition-all cursor-pointer ${
              mode === "signin" ? "bg-card text-foreground shadow" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => { setMode("signup"); setMessage(null); }}
            className={`flex-1 py-1.5 text-center rounded-lg font-bold transition-all cursor-pointer ${
              mode === "signup" ? "bg-card text-foreground shadow" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Register
          </button>
        </div>

        {/* Feedback Message */}
        {message && (
          <div
            className={`p-3 rounded-xl text-xs font-mono flex items-start gap-2 border ${
              message.type === "success"
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                : "bg-destructive/10 border-destructive/30 text-destructive"
            }`}
          >
            {message.type === "success" ? <Check className="w-4 h-4 shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />}
            <span>{message.text}</span>
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="space-y-4 font-mono text-xs">
          {mode === "signup" && (
            <div className="space-y-1">
              <label className="text-muted-foreground">Full Name</label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="e.g. Sarah Connor"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl pl-9 pr-3 py-2 text-foreground focus:outline-none focus:border-accent"
                  required
                />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-muted-foreground">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
              <input
                type="email"
                placeholder="architect@omnivault.ai"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-background border border-border rounded-xl pl-9 pr-3 py-2 text-foreground focus:outline-none focus:border-accent"
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-muted-foreground">Password</label>
              {mode === "signin" && (
                <span className="text-[10px] text-accent hover:underline cursor-pointer">Forgot?</span>
              )}
            </div>
            <div className="relative">
              <KeyRound className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
              <input
                type="password"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-background border border-border rounded-xl pl-9 pr-3 py-2 text-foreground focus:outline-none focus:border-accent"
                required
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full bg-accent hover:bg-accent/90 text-white font-bold h-10 rounded-xl cursor-pointer flex items-center justify-center gap-2 mt-2"
          >
            <span>{mode === "signin" ? "Sign In to Vault" : "Create Vault Account"}</span>
            <ArrowRight className="w-4 h-4" />
          </Button>
        </form>

        {/* Divider */}
        <div className="relative flex items-center justify-center my-4">
          <div className="border-t border-border w-full" />
          <span className="bg-card px-3 text-[10px] font-mono text-muted-foreground uppercase absolute">Or continue with</span>
        </div>

        {/* OAuth Buttons & Demo Shortcut */}
        <div className="space-y-2 font-mono">
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              onClick={handleDemoLogin}
              variant="outline"
              className="h-9 border-border bg-background hover:bg-muted text-xs cursor-pointer flex items-center justify-center gap-2"
            >
              <GitBranch className="w-3.5 h-3.5" />
              <span>GitHub</span>
            </Button>

            <Button
              type="button"
              onClick={handleDemoLogin}
              variant="outline"
              className="h-9 border-border bg-background hover:bg-muted text-xs cursor-pointer flex items-center justify-center gap-2"
            >
              <Sparkles className="w-3.5 h-3.5 text-accent" />
              <span>Google</span>
            </Button>
          </div>

        </div>
      </div>
    </div>
  );
}
