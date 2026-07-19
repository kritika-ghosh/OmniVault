"use client";

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { HOST, API_PATHS } from "@/lib/api-paths";
import { normalizeTerm } from "@/lib/utils";
import {
  readFilesRecursively,
  parseDependencies,
  parseSourceImports,
  FilePayload,
  ScanResponse,
} from "@/lib/file-directory";
import { mockScanResponse, mockNotesFiles, mockSortedTerms } from "@/lib/data";

export interface VaultSession {
  notesPath: string;
  projectPath: string;
  scanResult: ScanResponse | null;
  notesFiles: FilePayload[];
  sortedTerms: string[];
}

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
  executeScan: (
    projectPath?: string,
    notesPath?: string,
    projectHandle?: FileSystemDirectoryHandle | null,
    notesHandle?: FileSystemDirectoryHandle | null
  ) => Promise<void>;
  resetWorkspace: () => void;
  loadMockData: () => void;
  saveNote: (filename: string, content: string) => Promise<void>;
  quizSelectedNotePath: string;
  setQuizSelectedNotePath: (path: string) => void;
  currentQuiz: any | null;
  setCurrentQuiz: (quiz: any | null) => void;
  isGeneratingQuiz: boolean;
  setIsGeneratingQuiz: (g: boolean) => void;
  isEvaluatingQuiz: boolean;
  setIsEvaluatingQuiz: (e: boolean) => void;
  quizUserCode: string;
  setQuizUserCode: (code: string) => void;
  quizEvaluation: any | null;
  setQuizEvaluation: (evalObj: any | null) => void;
  deleteNote: (filename: string) => Promise<void>;
  vaults: string[];
  setVaults: (vaults: string[]) => void;
  vaultSessions: Record<string, VaultSession>;
  setVaultSessions: React.Dispatch<React.SetStateAction<Record<string, VaultSession>>>;
  activeVaultPath: string;
  setActiveVaultPath: (path: string) => void;
  deleteVaultSession: (path: string) => void;
}

const WorkspaceContext = createContext<WorkspaceContextProps | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [apiHost, setApiHost] = useState(HOST);
  const [projectHandle, setProjectHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [notesHandle, setNotesHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  
  // Local picker inputs (for welcome screen when no active vault exists yet)
  const [localProjectPath, setLocalProjectPath] = useState("");
  const [localNotesPath, setLocalNotesPath] = useState("");

  // Shared Quiz states
  const [quizSelectedNotePath, setQuizSelectedNotePath] = useState("");
  const [currentQuiz, setCurrentQuiz] = useState<any | null>(null);
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
  const [isEvaluatingQuiz, setIsEvaluatingQuiz] = useState(false);
  const [quizUserCode, setQuizUserCode] = useState("");
  const [quizEvaluation, setQuizEvaluation] = useState<any | null>(null);

  // Vaults history list
  const [vaults, setVaults] = useState<string[]>([]);
  // Map of notesPath -> VaultSession
  const [vaultSessions, setVaultSessions] = useState<Record<string, VaultSession>>({});
  const [activeVaultPath, setActiveVaultPath] = useState<string>("");

  const isHydrated = useRef(false);

  // Hydrate state from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedVaults = localStorage.getItem("workspace_vaults");
      const savedSessions = localStorage.getItem("workspace_vault_sessions");
      const savedActive = localStorage.getItem("workspace_active_vault_path");

      if (savedVaults) {
        try { setVaults(JSON.parse(savedVaults)); } catch (e) {}
      }
      if (savedSessions) {
        try { setVaultSessions(JSON.parse(savedSessions)); } catch (e) {}
      }
      if (savedActive) {
        setActiveVaultPath(savedActive);
      }
      isHydrated.current = true;
    }
  }, []);

  // Save vaultSessions on changes
  useEffect(() => {
    if (typeof window !== "undefined" && isHydrated.current) {
      localStorage.setItem("workspace_vault_sessions", JSON.stringify(vaultSessions));
    }
  }, [vaultSessions]);

  // Save activeVaultPath on changes
  useEffect(() => {
    if (typeof window !== "undefined" && isHydrated.current) {
      localStorage.setItem("workspace_active_vault_path", activeVaultPath);
    }
  }, [activeVaultPath]);

  // Save vaults list on changes
  useEffect(() => {
    if (typeof window !== "undefined" && isHydrated.current) {
      localStorage.setItem("workspace_vaults", JSON.stringify(vaults));
    }
  }, [vaults]);

  // Keep vaults history synchronized
  useEffect(() => {
    if (activeVaultPath && !vaults.includes(activeVaultPath) && activeVaultPath !== "mock-notes") {
      setVaults((prev) => [...prev, activeVaultPath]);
    }
  }, [activeVaultPath, vaults]);

  // Resolve values dynamically based on the active vault session
  const activeSession = vaultSessions[activeVaultPath] || null;

  const projectPath = activeSession ? activeSession.projectPath : localProjectPath;
  const notesPath = activeSession ? activeSession.notesPath : localNotesPath;
  const scanResult = activeSession ? activeSession.scanResult : null;
  const notesFiles = activeSession ? activeSession.notesFiles : [];
  const sortedTerms = activeSession ? activeSession.sortedTerms : [];

  // Proxy state setters to update the active vault session
  const setProjectPath = useCallback((path: string) => {
    setLocalProjectPath(path);
    if (activeVaultPath) {
      setVaultSessions((prev) => ({
        ...prev,
        [activeVaultPath]: {
          ...prev[activeVaultPath],
          projectPath: path,
        },
      }));
    }
  }, [activeVaultPath]);

  const setNotesPath = useCallback((path: string) => {
    setLocalNotesPath(path);
    if (vaultSessions[path]) {
      setActiveVaultPath(path);
    }
  }, [vaultSessions]);

  const setNotesFiles = useCallback((update: FilePayload[] | ((prev: FilePayload[]) => FilePayload[])) => {
    setVaultSessions((prev) => {
      if (!activeVaultPath) return prev;
      const current = prev[activeVaultPath] || {
        notesPath: activeVaultPath,
        projectPath: "",
        scanResult: null,
        notesFiles: [],
        sortedTerms: [],
      };
      const updatedFiles = typeof update === "function" ? update(current.notesFiles) : update;
      return {
        ...prev,
        [activeVaultPath]: {
          ...current,
          notesFiles: updatedFiles,
        },
      };
    });
  }, [activeVaultPath]);

  const setScanResult = useCallback((update: ScanResponse | null | ((prev: ScanResponse | null) => ScanResponse | null)) => {
    setVaultSessions((prev) => {
      if (!activeVaultPath) return prev;
      const current = prev[activeVaultPath] || {
        notesPath: activeVaultPath,
        projectPath: "",
        scanResult: null,
        notesFiles: [],
        sortedTerms: [],
      };
      const updatedResult = typeof update === "function" ? update(current.scanResult) : update;
      return {
        ...prev,
        [activeVaultPath]: {
          ...current,
          scanResult: updatedResult,
        },
      };
    });
  }, [activeVaultPath]);

  const setSortedTerms = useCallback((update: string[] | ((prev: string[]) => string[])) => {
    setVaultSessions((prev) => {
      if (!activeVaultPath) return prev;
      const current = prev[activeVaultPath] || {
        notesPath: activeVaultPath,
        projectPath: "",
        scanResult: null,
        notesFiles: [],
        sortedTerms: [],
      };
      const updatedTerms = typeof update === "function" ? update(current.sortedTerms) : update;
      return {
        ...prev,
        [activeVaultPath]: {
          ...current,
          sortedTerms: updatedTerms,
        },
      };
    });
  }, [activeVaultPath]);

  const resetWorkspace = useCallback(() => {
    if (activeVaultPath) {
      setVaultSessions((prev) => {
        const updated = { ...prev };
        delete updated[activeVaultPath];
        return updated;
      });
      setVaults((prev) => prev.filter((v) => v !== activeVaultPath));
      setActiveVaultPath("");
    }
    setLocalProjectPath("");
    setLocalNotesPath("");
    setProjectHandle(null);
    setNotesHandle(null);
    setStatusMessage("");
  }, [activeVaultPath]);

  const deleteVaultSession = useCallback((path: string) => {
    setVaultSessions((prev) => {
      const updated = { ...prev };
      delete updated[path];
      return updated;
    });
    setVaults((prev) => prev.filter((v) => v !== path));
    if (activeVaultPath === path) {
      setActiveVaultPath("");
    }
  }, [activeVaultPath]);

  const loadMockData = useCallback(() => {
    const mockSession: VaultSession = {
      notesPath: "mock-notes",
      projectPath: "mock-project",
      scanResult: mockScanResponse,
      notesFiles: mockNotesFiles,
      sortedTerms: mockSortedTerms,
    };
    setVaultSessions((prev) => ({
      ...prev,
      "mock-notes": mockSession,
    }));
    setActiveVaultPath("mock-notes");
    setStatusMessage("Loaded UI testing mock data.");
  }, []);

  const saveNote = useCallback(async (filename: string, content: string) => {
    const cleanTarget = normalizeTerm(filename.replace(/\.md$/i, ""));
    const cleanTerm = normalizeTerm(filename.split("/").pop()?.replace(/\.md$/i, "") || "");

    setNotesFiles((prev) => {
      const fileExists = prev.some((file) => {
        const fileBase = file.path.split("/").pop() || "";
        return normalizeTerm(fileBase.replace(/\.md$/i, "")) === cleanTarget;
      });

      if (fileExists) {
        return prev.map((file) => {
          const fileBase = file.path.split("/").pop() || "";
          if (normalizeTerm(fileBase.replace(/\.md$/i, "")) === cleanTarget) {
            return { ...file, content };
          }
          return file;
        });
      } else {
        return [...prev, { path: filename, content }];
      }
    });

    setScanResult((prev) => {
      if (!prev) return null;
      const updatedReport = prev.report.filter(
        (gap) => normalizeTerm(gap.term) !== cleanTerm
      );
      return {
        ...prev,
        gaps_found: updatedReport.length,
        report: updatedReport,
      };
    });

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
      try {
        const saveUrl = `${apiHost}${API_PATHS.SAVE || "/v1/synthesize/save"}`;
        let response = await fetch(saveUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            notes_path: (notesPath === "mock-notes" || !notesPath) ? "in-memory" : notesPath,
            filename: filename.endsWith(".md") ? filename : `${filename}.md`,
            content,
          }),
        });

        let didFallback = (notesPath === "mock-notes" || !notesPath);
        if (response.status === 400) {
          didFallback = true;
          response = await fetch(saveUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              notes_path: "in-memory",
              filename: filename.endsWith(".md") ? filename : `${filename}.md`,
              content,
            }),
          });
        }

        if (response.ok) {
          setStatusMessage(`[API CALL SUCCESS] Saved ${filename} to ${didFallback ? "In-Memory fallback" : "Disk path: " + notesPath}`);
        } else {
          const errText = await response.text();
          throw new Error(errText);
        }
      } catch (err: any) {
        console.error("Failed to save note via API:", err);
        setStatusMessage(`Failed to save note via API: ${err.message}`);
      }
    }
  }, [notesHandle, apiHost, notesPath, setNotesFiles, setScanResult]);

  const deleteNote = useCallback(async (filename: string) => {
    setNotesFiles((prev) => prev.filter((f) => f.path !== filename));
    if (notesHandle) {
      try {
        const parts = filename.split("/");
        let currentDir = notesHandle;
        for (let i = 0; i < parts.length - 1; i++) {
          currentDir = await currentDir.getDirectoryHandle(parts[i]);
        }
        await currentDir.removeEntry(parts[parts.length - 1]);
        setStatusMessage(`Successfully deleted old note entry: ${filename}`);
      } catch (err: any) {
        console.error("Failed to delete note using directory handle:", err);
      }
    }
  }, [notesHandle, setNotesFiles]);

  const executeScan = useCallback(async (
    customProjectPath?: string,
    customNotesPath?: string,
    customProjectHandle?: FileSystemDirectoryHandle | null,
    customNotesHandle?: FileSystemDirectoryHandle | null
  ) => {
    setIsLoading(true);
    
    const activeProjHandle = customProjectHandle !== undefined ? customProjectHandle : projectHandle;
    const activeNotesHandle = customNotesHandle !== undefined ? customNotesHandle : notesHandle;
    
    const activeProjPath = customProjectPath !== undefined ? customProjectPath : (localProjectPath || projectPath);
    const activeNotesPath = customNotesPath !== undefined ? customNotesPath : (localNotesPath || notesPath);

    const targetNotesPath = activeNotesHandle ? activeNotesHandle.name : activeNotesPath;
    const targetProjectPath = activeProjHandle ? activeProjHandle.name : activeProjPath;

    setStatusMessage("Starting scan...");
    
    try {
      let payload: any = {};
      let notes: FilePayload[] = [];
      let projFiles: FilePayload[] = [];
      let sorted: string[] = [];

      if (activeProjHandle && activeNotesHandle) {
        setStatusMessage("Reading project files recursively...");
        projFiles = await readFilesRecursively(activeProjHandle);
        
        setStatusMessage("Reading notes files recursively...");
        notes = await readFilesRecursively(activeNotesHandle);
  
        setStatusMessage("Extracting dependencies and source code imports...");
        const depTerms = parseDependencies(projFiles);
        const importTerms = parseSourceImports(projFiles);
        
        const combinedTerms = new Set([...depTerms, ...importTerms]);
        sorted = Array.from(combinedTerms).sort();

        const virtualReqsFile: FilePayload = {
          path: "requirements.txt",
          content: sorted.join("\n"),
        };

        payload = {
          project_files: [virtualReqsFile, ...projFiles],
          notes_files: notes,
        };
      } else {
        if (!targetProjectPath || !targetNotesPath) {
          throw new Error("Please select directories or input manual absolute paths.");
        }
        
        payload = {
          project_path: targetProjectPath,
          notes_path: targetNotesPath,
        };
        setStatusMessage(`Sending absolute paths to local backend: ${targetProjectPath} and ${targetNotesPath}`);
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
      
      const newSession: VaultSession = {
        notesPath: targetNotesPath,
        projectPath: targetProjectPath,
        scanResult: data,
        notesFiles: data.notes_files && data.notes_files.length > 0 ? data.notes_files : notes,
        sortedTerms: sorted.length > 0 ? sorted : (data.report || []).map((r: any) => r.term).sort(),
      };

      setVaultSessions((prev) => ({
        ...prev,
        [targetNotesPath]: newSession,
      }));
      setActiveVaultPath(targetNotesPath);
      setStatusMessage("Scan completed successfully.");
    } catch (err: any) {
      console.error(err);
      setStatusMessage(`Scan failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [apiHost, projectHandle, notesHandle, localProjectPath, localNotesPath, projectPath, notesPath]);

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
        quizSelectedNotePath,
        setQuizSelectedNotePath,
        currentQuiz,
        setCurrentQuiz,
        isGeneratingQuiz,
        setIsGeneratingQuiz,
        isEvaluatingQuiz,
        setIsEvaluatingQuiz,
        quizUserCode,
        setQuizUserCode,
        quizEvaluation,
        setQuizEvaluation,
        deleteNote,
        vaults,
        setVaults,
        vaultSessions,
        setVaultSessions,
        activeVaultPath,
        setActiveVaultPath,
        deleteVaultSession,
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
