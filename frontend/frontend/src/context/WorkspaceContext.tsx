"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { HOST, API_PATHS } from "@/lib/api-paths";
import {
  readFilesRecursively,
  parseDependencies,
  parseSourceImports,
  FilePayload,
  ScanResponse,
} from "@/lib/file-directory";
import { mockScanResponse, mockNotesFiles, mockSortedTerms } from "@/lib/data";

interface WorkspaceContextProps {
  apiHost: string;
  setApiHost: (host: string) => void;
  projectPath: string;
  setProjectPath: (path: string) => void;
  notesPath: string;
  setNotesPath: (path: string) => void;
  projectHandle: FileSystemDirectoryHandle | null;
  setProjectHandle: (handle: FileSystemDirectoryHandle | null) => void;
  notesHandle: FileSystemDirectoryHandle | null;
  setNotesHandle: (handle: FileSystemDirectoryHandle | null) => void;
  scanResult: ScanResponse | null;
  setScanResult: (result: ScanResponse | null) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  statusMessage: string;
  setStatusMessage: (msg: string) => void;
  sortedTerms: string[];
  setSortedTerms: (terms: string[]) => void;
  notesFiles: FilePayload[];
  setNotesFiles: (files: FilePayload[]) => void;
  executeScan: () => Promise<void>;
  resetWorkspace: () => void;
  loadMockData: () => void;
  saveNote: (filename: string, content: string) => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextProps | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [apiHost, setApiHost] = useState(HOST);
  const [projectPath, setProjectPath] = useState("");
  const [notesPath, setNotesPath] = useState("");
  const [projectHandle, setProjectHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [notesHandle, setNotesHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [scanResult, setScanResult] = useState<ScanResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [sortedTerms, setSortedTerms] = useState<string[]>([]);
  const [notesFiles, setNotesFiles] = useState<FilePayload[]>([]);

  const resetWorkspace = useCallback(() => {
    setScanResult(null);
    setStatusMessage("");
    setSortedTerms([]);
    setNotesFiles([]);
    setProjectHandle(null);
    setNotesHandle(null);
    setProjectPath("");
    setNotesPath("");
    
    if (typeof window !== "undefined") {
      localStorage.removeItem("workspace_projectPath");
      localStorage.removeItem("workspace_notesPath");
      localStorage.removeItem("workspace_scanResult");
      localStorage.removeItem("workspace_sortedTerms");
      localStorage.removeItem("workspace_notesFiles");
    }
  }, []);

  const loadMockData = useCallback(() => {
    setScanResult(mockScanResponse);
    setNotesFiles(mockNotesFiles);
    setSortedTerms(mockSortedTerms);
    setProjectPath("mock-project");
    setNotesPath("mock-notes");
    setStatusMessage("Loaded UI testing mock data.");
  }, []);

  // Hydrate state from localStorage on mount
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const savedProjPath = localStorage.getItem("workspace_projectPath");
      const savedNotesPath = localStorage.getItem("workspace_notesPath");
      const savedScanResult = localStorage.getItem("workspace_scanResult");
      const savedSortedTerms = localStorage.getItem("workspace_sortedTerms");
      const savedNotesFiles = localStorage.getItem("workspace_notesFiles");

      if (savedProjPath) setProjectPath(savedProjPath);
      if (savedNotesPath) setNotesPath(savedNotesPath);
      if (savedScanResult) {
        try { setScanResult(JSON.parse(savedScanResult)); } catch (e) {}
      }
      if (savedSortedTerms) {
        try { setSortedTerms(JSON.parse(savedSortedTerms)); } catch (e) {}
      }
      if (savedNotesFiles) {
        try { setNotesFiles(JSON.parse(savedNotesFiles)); } catch (e) {}
      }
    }
  }, []);

  // Save changes to localStorage on state updates
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      if (projectPath) localStorage.setItem("workspace_projectPath", projectPath);
    }
  }, [projectPath]);

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      if (notesPath) localStorage.setItem("workspace_notesPath", notesPath);
    }
  }, [notesPath]);

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      if (scanResult) localStorage.setItem("workspace_scanResult", JSON.stringify(scanResult));
    }
  }, [scanResult]);

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      if (sortedTerms && sortedTerms.length > 0) {
        localStorage.setItem("workspace_sortedTerms", JSON.stringify(sortedTerms));
      }
    }
  }, [sortedTerms]);

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      if (notesFiles && notesFiles.length > 0) {
        localStorage.setItem("workspace_notesFiles", JSON.stringify(notesFiles));
      }
    }
  }, [notesFiles]);

  const saveNote = useCallback(async (filename: string, content: string) => {
    // 1. Update state locally
    setNotesFiles((prev) =>
      prev.map((file) => {
        const fileBase = file.path.split("/").pop() || "";
        const cleanTarget = filename.replace(/\.md$/i, "").toLowerCase();
        const cleanFile = fileBase.replace(/\.md$/i, "").toLowerCase();
        if (cleanFile === cleanTarget) {
          return { ...file, content };
        }
        return file;
      })
    );

    // 2. If handle is available, write to disk
    if (notesHandle) {
      try {
        const parts = filename.split("/");
        let currentDir = notesHandle;
        for (let i = 0; i < parts.length - 1; i++) {
          currentDir = await currentDir.getDirectoryHandle(parts[i], { create: true });
        }
        const fileHandle = await currentDir.getFileHandle(parts[parts.length - 1], { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(content);
        await writable.close();
        setStatusMessage(`Successfully saved ${filename} to local system.`);
      } catch (err: any) {
        console.error("Failed to write note using directory handle:", err);
        setStatusMessage(`Failed to save note locally: ${err.message}`);
      }
    } else {
      // 3. Fallback to API save
      try {
        const saveUrl = `${apiHost}${API_PATHS.SAVE || "/v1/synthesize/save"}`;
        const response = await fetch(saveUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            notes_path: notesPath || "in-memory",
            filename: filename.endsWith(".md") ? filename : `${filename}.md`,
            content,
          }),
        });
        if (response.ok) {
          setStatusMessage(`Successfully saved ${filename} using local API.`);
        } else {
          const errText = await response.text();
          throw new Error(errText);
        }
      } catch (err: any) {
        console.error("Failed to save note via API:", err);
        setStatusMessage(`Failed to save note via API: ${err.message}`);
      }
    }
  }, [notesHandle, apiHost, notesPath]);

  const executeScan = useCallback(async () => {
    setIsLoading(true);
    setScanResult(null);
    setStatusMessage("Starting scan...");
    
    try {
      let payload: any = {};

      if (projectHandle && notesHandle) {
        setStatusMessage("Reading project files recursively...");
        const projFiles = await readFilesRecursively(projectHandle);
        
        setStatusMessage("Reading notes files recursively...");
        const notes = await readFilesRecursively(notesHandle);
        setNotesFiles(notes);
 
        setStatusMessage("Extracting dependencies and source code imports...");
        const depTerms = parseDependencies(projFiles);
        const importTerms = parseSourceImports(projFiles);
        
        const combinedTerms = new Set([...depTerms, ...importTerms]);
        const sorted = Array.from(combinedTerms).sort();
        setSortedTerms(sorted);
  
        setStatusMessage(`Found ${sorted.length} technical terms. Indexing & scanning...`);

        const virtualReqsFile: FilePayload = {
          path: "requirements.txt",
          content: sorted.join("\n"),
        };

        payload = {
          project_files: [virtualReqsFile, ...projFiles],
          notes_files: notes,
        };
      } else {
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
  }, [apiHost, projectHandle, notesHandle, projectPath, notesPath]);

  return (
    <WorkspaceContext.Provider
      value={{
        apiHost,
        setApiHost,
        projectPath,
        setProjectPath,
        notesPath,
        setNotesPath,
        projectHandle,
        setProjectHandle,
        notesHandle,
        setNotesHandle,
        scanResult,
        setScanResult,
        isLoading,
        setIsLoading,
        statusMessage,
        setStatusMessage,
        sortedTerms,
        setSortedTerms,
        notesFiles,
        setNotesFiles,
        executeScan,
        resetWorkspace,
        loadMockData,
        saveNote,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (context === undefined) {
    throw new Error("useWorkspace must be used within a WorkspaceProvider");
  }
  return context;
}
