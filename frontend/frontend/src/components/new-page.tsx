"use client";

import React, { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { HOST, API_PATHS } from "@/lib/api-paths";
import {
  readFilesRecursively,
  parseDependencies,
  parseSourceImports,
  FilePayload,
  ScanResponse,
} from "@/lib/file-directory";

export default function NewPage() {
  const [apiHost, setApiHost] = useState(HOST);
  const [projectPath, setProjectPath] = useState("");
  const [notesPath, setNotesPath] = useState("");
  
  // Handles from Directory Picker API
  const [projectHandle, setProjectHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [notesHandle, setNotesHandle] = useState<FileSystemDirectoryHandle | null>(null);
  
  const [scanResult, setScanResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  const handleSelectProjectDir = async () => {
    try {
      const handle = await window.showDirectoryPicker();
      setProjectHandle(handle);
      setProjectPath(handle.name);
      setStatusMessage(`Selected project folder: ${handle.name}`);
    } catch (err: any) {
      console.error(err);
      setStatusMessage(`Failed to select project directory: ${err.message}`);
    }
  };

  const handleSelectNotesDir = async () => {
    try {
      const handle = await window.showDirectoryPicker();
      setNotesHandle(handle);
      setNotesPath(handle.name);
      setStatusMessage(`Selected notes folder: ${handle.name}`);
    } catch (err: any) {
      console.error(err);
      setStatusMessage(`Failed to select notes directory: ${err.message}`);
    }
  };

  const executeScan = async () => {
    setIsLoading(true);
    setScanResult(null);
    setStatusMessage("Starting scan...");
    
    try {
      let payload: any = {};

      if (projectHandle && notesHandle) {
        setStatusMessage("Reading project files recursively...");
        const projFiles = await readFilesRecursively(projectHandle);
        
        setStatusMessage("Reading notes files recursively...");
        const notesFiles = await readFilesRecursively(notesHandle);

        setStatusMessage("Extracting dependencies and source code imports...");
        const depTerms = parseDependencies(projFiles);
        const importTerms = parseSourceImports(projFiles);
        
        const combinedTerms = new Set([...depTerms, ...importTerms]);
        const sortedTerms = Array.from(combinedTerms).sort();
 
        setStatusMessage(`Found ${sortedTerms.length} technical terms. Indexing & scanning...`);

        // We append our custom-extracted technical terms into a virtual requirements.txt
        // so that the backend's scan python logic picks them all up.
        const virtualReqsFile: FilePayload = {
          path: "requirements.txt",
          content: sortedTerms.join("\n"),
        };

        payload = {
          project_files: [virtualReqsFile, ...projFiles],
          notes_files: notesFiles,
        };
      } else {
        // Fallback to manual absolute paths mode
        if (!projectPath || !notesPath) {
          throw new Error("Please select directories or input manual absolute paths.");
        }
        
        payload = {
          project_path: projectPath,
          notes_path: notesPath,
        };
        setStatusMessage(`Sending absolute paths to local backend: ${projectPath} and ${notesPath}`);
      }

      const scanUrl = `${apiHost}${API_PATHS.SCAN}`;
      const response = await fetch(scanUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      setScanResult(data);
      setStatusMessage("Scan completed successfully.");
    } catch (err: any) {
      console.error(err);
      setStatusMessage(`Scan failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full min-h-full bg-[#0B0F19] text-slate-100 px-8 py-12 flex flex-col items-center">
    <div className="max-w-3xl w-full flex flex-col gap-8 animate-in fade-in duration-300">
      
      {/* HEADER SECTION */}
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-500 bg-clip-text text-transparent">
          Good Morning!
        </h1>
        <p className="text-sm text-slate-400 font-mono tracking-wide">
          // Let's patch some knowledge gaps.
        </p>
      </div>

      {/* CORE CONFIGURATION CARD */}
      <div className="bg-[#111827] border border-slate-800 rounded-xl p-6 shadow-2xl shadow-black/40 space-y-6">
        <div className="border-b border-slate-800 pb-3">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500" /> Initialize Local Workspace
          </h2>
        </div>

        {/* HOST INPUT */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-mono text-slate-400 uppercase tracking-wider">API Base Host</label>
          <Input
            type="text"
            value={apiHost}
            onChange={(e) => setApiHost(e.target.value)}
            className="bg-[#0B0F19] border-slate-800 text-slate-300 focus:border-amber-500 font-mono text-xs h-10"
          />
        </div>

        {/* DIRECTORIES SELECTION GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Project Path */}
          <div className="bg-[#0B0F19] border border-slate-800 p-4 rounded-lg flex flex-col gap-3">
            <label className="text-xs font-mono text-slate-400 uppercase tracking-wider">Project Files</label>
            <div className="flex items-center gap-2">
              <Button 
                onClick={handleSelectProjectDir}
                className="bg-slate-800 hover:bg-slate-700 text-xs font-medium border border-slate-700 text-slate-200 h-9 shrink-0"
              >
                Choose Folder
              </Button>
              <div className="text-xs font-mono text-slate-300 truncate bg-slate-900/50 px-2 py-1.5 rounded border border-slate-800/60 w-full">
                {projectPath || "Not selected..."}
              </div>
            </div>
            {projectHandle && (
              <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-mono">● Handle Attached</span>
            )}
          </div>

          {/* Notes Path */}
          <div className="bg-[#0B0F19] border border-slate-800 p-4 rounded-lg flex flex-col gap-3">
            <label className="text-xs font-mono text-slate-400 uppercase tracking-wider">Notes Directory</label>
            <div className="flex items-center gap-2">
              <Button 
                onClick={handleSelectNotesDir}
                className="bg-slate-800 hover:bg-slate-700 text-xs font-medium border border-slate-700 text-slate-200 h-9 shrink-0"
              >
                Choose Folder
              </Button>
              <div className="text-xs font-mono text-slate-300 truncate bg-slate-900/50 px-2 py-1.5 rounded border border-slate-800/60 w-full">
                {notesPath || "Not selected..."}
              </div>
            </div>
            {notesHandle && (
              <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-mono">● Handle Attached</span>
            )}
          </div>
        </div>

        {/* PRIMARY SUBMIT TRIGGER */}
        <Button
          onClick={executeScan}
          disabled={isLoading || (!projectPath && !projectHandle)}
          className="w-full py-6 text-sm font-bold tracking-wide uppercase bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded-lg transition-all border border-emerald-500/20 shadow-lg shadow-emerald-950/20"
        >
          {isLoading ? "Analyzing Dependency Tree..." : "Execute Workspace Scan"}
        </Button>
      </div>

      {/* FEEDBACK TRACKING STATUS MESSAGES */}
      {statusMessage && (
        <div className="text-center font-mono text-xs text-amber-500/80 bg-amber-500/5 border border-amber-500/10 py-2.5 rounded-lg">
          {statusMessage}
        </div>
      )}

      {/* RENDER DYNAMIC CARD BLOCKS FROM RESPONSE */}
      {scanResult && (
        <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-300">
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-[#111827] border border-slate-800 p-4 rounded-xl text-center">
              <div className="text-[10px] uppercase font-mono tracking-wider text-slate-400">Status</div>
              <div className="text-xl font-bold text-emerald-400 mt-1 capitalize">{scanResult.status}</div>
            </div>
            <div className="bg-[#111827] border border-slate-800 p-4 rounded-xl text-center">
              <div className="text-[10px] uppercase font-mono tracking-wider text-slate-400">Terms Scanned</div>
              <div className="text-xl font-bold text-slate-200 mt-1">{scanResult.total_terms_scanned}</div>
            </div>
            <div className="bg-[#111827] border border-slate-800 p-4 rounded-xl text-center border-amber-500/30 shadow-lg shadow-amber-950/10">
              <div className="text-[10px] uppercase font-mono tracking-wider text-amber-400">Gaps Detected</div>
              <div className="text-xl font-bold text-amber-500 mt-1">{scanResult.gaps_found}</div>
            </div>
          </div>

          {/* PARSED DETAILED GAP CARDS DISPLAY */}
          <div className="bg-[#111827] border border-slate-800 rounded-xl p-6 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 border-b border-slate-800 pb-2">
              Flagged Knowledge Debt Report
            </h3>
            <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2">
              {scanResult.report?.map((gap: any) => (
                <div key={gap.term} className="bg-[#0B0F19] border border-slate-800/80 p-4 rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-amber-500/40 transition-colors">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold text-amber-400">{gap.term}</span>
                      <span className="text-[9px] font-mono px-2 py-0.5 bg-amber-500/10 text-amber-400 rounded-full border border-amber-500/20 uppercase">
                        {gap.classification.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 font-sans leading-relaxed">{gap.reason}</p>
                    <div className="text-[10px] font-mono text-slate-500 pt-1">
                      Detected in: {gap.detected_from?.join(', ')}
                    </div>
                  </div>
                  <Button className="h-8 text-xs bg-amber-600 hover:bg-amber-500 text-white font-semibold shrink-0 px-4">
                    Fill Gap
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  </div>
  );
}