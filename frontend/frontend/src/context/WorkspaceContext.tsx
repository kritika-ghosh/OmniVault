"use client";

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { HOST, API_PATHS } from "@/lib/api-paths";
import { normalizeTerm } from "@/lib/utils";
import {
  readFilesRecursively,
  parseDependencies,
  parseSourceImports,
  parseImplicitInbetweenConcepts,
  isHighValueConcept,
  chunkFiles,
  FilePayload,
  ScanResponse,
} from "@/lib/file-directory";
import { mockScanResponse, mockNotesFiles, mockSortedTerms } from "@/lib/data";

const safeFetch = async (url: string, options?: RequestInit): Promise<Response> => {
  try {
    return await fetch(url, options);
  } catch (err) {
    return {
      ok: false,
      status: 503,
      statusText: "Service Unavailable",
      text: async () => "Connection failed. Backend server is offline.",
      json: async () => ({ error: "Connection failed" }),
    } as Response;
  }
};

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
  assignedNoteTask: { topic: string; missingConcepts: string[]; reason: string } | null;
  setAssignedNoteTask: (task: { topic: string; missingConcepts: string[]; reason: string } | null) => void;
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

  // State for assigned note tasks from quiz failures
  const [assignedNoteTask, setAssignedNoteTask] = useState<{ topic: string; missingConcepts: string[]; reason: string } | null>(null);

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

  // Hydrate state from sessionStorage (Session-only: closing tab/browser forgets connected vaults)
  useEffect(() => {
    if (typeof window !== "undefined") {
      // Clear any old persistent localStorage cache as per user requirement
      localStorage.removeItem("workspace_vaults");
      localStorage.removeItem("workspace_vault_sessions");
      localStorage.removeItem("workspace_active_vault_path");

      const savedVaults = sessionStorage.getItem("workspace_vaults");
      const savedSessions = sessionStorage.getItem("workspace_vault_sessions");
      const savedActive = sessionStorage.getItem("workspace_active_vault_path");

      if (savedVaults) {
        try { setVaults(JSON.parse(savedVaults)); } catch (e) {}
      }
      
      if (savedSessions) {
        try {
          const parsed = JSON.parse(savedSessions);
          setVaultSessions(parsed);
        } catch (e) {
          setVaultSessions({});
        }
      } else {
        setVaultSessions({});
      }

      if (savedActive) {
        setActiveVaultPath(savedActive);
      }
      isHydrated.current = true;
    }
  }, []);

  // Save vaultSessions on changes in sessionStorage
  useEffect(() => {
    if (typeof window !== "undefined" && isHydrated.current) {
      sessionStorage.setItem("workspace_vault_sessions", JSON.stringify(vaultSessions));
    }
  }, [vaultSessions]);

  // Save activeVaultPath on changes in sessionStorage
  useEffect(() => {
    if (typeof window !== "undefined" && isHydrated.current) {
      sessionStorage.setItem("workspace_active_vault_path", activeVaultPath);
    }
  }, [activeVaultPath]);

  // Save vaults list on changes in sessionStorage
  useEffect(() => {
    if (typeof window !== "undefined" && isHydrated.current) {
      sessionStorage.setItem("workspace_vaults", JSON.stringify(vaults));
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

    if (activeVaultPath === "mock-notes" || notesPath === "mock-notes") {
      setStatusMessage(`Successfully saved ${filename} in memory (Demo Mode).`);
      return;
    }

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
        console.warn("Failed to write note using directory handle:", err);
        setStatusMessage(`Failed to save note locally: ${err.message}`);
      }
    } else {
      try {
        const saveUrl = `${apiHost}${API_PATHS.SAVE || "/v1/synthesize/save"}`;
        let response = await safeFetch(saveUrl, {
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
          response = await safeFetch(saveUrl, {
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
        console.warn("Failed to save note via API:", err);
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
        console.warn("Failed to delete note using directory handle:", err);
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

    const targetNotesPath = activeNotesHandle ? activeNotesHandle.name : (activeNotesPath || "Local Vault");
    const targetProjectPath = activeProjHandle ? activeProjHandle.name : (activeProjPath || "Local Codebase");

    if (customProjectHandle) setProjectHandle(customProjectHandle);
    if (customNotesHandle) setNotesHandle(customNotesHandle);

    // Only run mock scan if explicit mock request with NO real handles
    const isMock = (activeProjPath === "mock-project" || activeNotesPath === "mock-notes") && !activeProjHandle && !activeNotesHandle;

    if (isMock) {
      setStatusMessage("Scanning mock demo vault...");
      setTimeout(() => {
        const mockSession: VaultSession = {
          notesPath: "mock-notes",
          projectPath: "mock-project",
          scanResult: mockScanResponse,
          notesFiles: mockNotesFiles,
          sortedTerms: mockSortedTerms,
        };
        setVaultSessions((prev) => ({ ...prev, "mock-notes": mockSession }));
        setActiveVaultPath("mock-notes");
        setIsLoading(false);
        setStatusMessage("Mock scan analysis completed!");
      }, 600);
      return;
    }

    setStatusMessage("Starting scan of user local files...");
    
    try {
      let notes: FilePayload[] = [];
      let projFiles: FilePayload[] = [];
      let sorted: string[] = [];

      if (activeProjHandle && activeNotesHandle) {
        setStatusMessage("Reading project files recursively from local disk...");
        projFiles = await readFilesRecursively(activeProjHandle);
        
        setStatusMessage("Reading notes files recursively from local vault...");
        notes = await readFilesRecursively(activeNotesHandle);
  
        setStatusMessage("Extracting dependencies, source imports, and implicit in-between concepts...");
        const depTerms = parseDependencies(projFiles);
        const importTerms = parseSourceImports(projFiles);
        const implicitTerms = parseImplicitInbetweenConcepts(projFiles);
        
        const combinedTerms = new Set([...depTerms, ...importTerms, ...implicitTerms]);
        sorted = Array.from(combinedTerms).sort();

        const virtualReqsFile: FilePayload = {
          path: "requirements.txt",
          content: sorted.join("\n"),
        };

        const allProjFiles = [virtualReqsFile, ...projFiles];
        const notesChunks = chunkFiles(notes, 20);
        const projChunks = chunkFiles(allProjFiles, 20);
        const totalChunks = (notesChunks.length || 1) + (projChunks.length || 1);
        const sessionId = `scan-session-${Date.now()}`;

        setStatusMessage(`Initiating chunked payload transmission (${totalChunks} total batches)...`);
        let currentChunkIndex = 0;
        let finalData: any = null;

        // Try Chunked Send
        try {
          if (notesChunks.length === 0) notesChunks.push([]);
          for (let i = 0; i < notesChunks.length; i++) {
            currentChunkIndex++;
            const isFinal = (currentChunkIndex === totalChunks);
            setStatusMessage(`Uploading notes chunk ${i + 1}/${notesChunks.length}...`);
            
            const chunkUrl = `${apiHost}${API_PATHS.SCAN}/chunk`;
            const chunkRes = await safeFetch(chunkUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                session_id: sessionId,
                chunk_type: "notes",
                chunk_index: currentChunkIndex,
                total_chunks: totalChunks,
                files: notesChunks[i],
                is_final: isFinal,
              }),
            });

            if (chunkRes.ok) {
              const resJson = await chunkRes.json();
              if (isFinal) finalData = resJson;
            }
          }

          if (projChunks.length === 0) projChunks.push([]);
          for (let i = 0; i < projChunks.length; i++) {
            currentChunkIndex++;
            const isFinal = (currentChunkIndex === totalChunks);
            setStatusMessage(`Scanning project code chunk ${i + 1}/${projChunks.length}...`);
            
            const chunkUrl = `${apiHost}${API_PATHS.SCAN}/chunk`;
            const chunkRes = await safeFetch(chunkUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                session_id: sessionId,
                chunk_type: "project",
                chunk_index: currentChunkIndex,
                total_chunks: totalChunks,
                files: projChunks[i],
                is_final: isFinal,
              }),
            });

            if (chunkRes.ok) {
              const resJson = await chunkRes.json();
              if (isFinal) finalData = resJson;
            }
          }
        } catch (chunkErr) {
          console.warn("Chunked transmission warning:", chunkErr);
        }

        // If backend returned no success data or is offline, generate client-side gaps from real files
        if (!finalData || finalData.status !== "success") {
          const noteNames = new Set(notes.map((n) => (n.path.split("/").pop() || "").replace(/\.md$/i, "").toLowerCase()));
          const gapReport = sorted
            .filter((t) => !noteNames.has(t.toLowerCase()))
            .map((t) => ({
              term: t,
              classification: "Unmapped Dependency",
              reason: `No Markdown note found in local vault for project dependency "${t}".`,
              detected_from: ["Local Codebase Import Analysis"],
            }));

          finalData = {
            status: "success",
            total_terms_scanned: sorted.length,
            gaps_found: gapReport.length,
            report: gapReport,
          };
        }

        // Filter finalData report to keep only high-value core concepts
        if (finalData && finalData.report) {
          finalData.report = finalData.report.filter((r: any) => isHighValueConcept(r.term));
          finalData.gaps_found = finalData.report.length;
        }

        const highValueSorted = (sorted.length > 0 ? sorted : (finalData?.report || []).map((r: any) => r.term))
          .filter(isHighValueConcept)
          .sort();

        const newSession: VaultSession = {
          notesPath: targetNotesPath,
          projectPath: targetProjectPath,
          scanResult: finalData,
          notesFiles: notes,
          sortedTerms: highValueSorted,
        };

        setVaultSessions((prev) => ({
          ...prev,
          [targetNotesPath]: newSession,
        }));
        setActiveVaultPath(targetNotesPath);
        setStatusMessage(`Successfully scanned ${projFiles.length} codebase files & ${notes.length} vault notes!`);
      } else {
        if (!targetProjectPath || !targetNotesPath) {
          throw new Error("Please select directories or input manual absolute paths.");
        }
        
        const payload = {
          project_path: targetProjectPath,
          notes_path: targetNotesPath,
        };
        setStatusMessage(`Sending absolute paths to local backend: ${targetProjectPath} and ${targetNotesPath}`);
        const scanUrl = `${apiHost}${API_PATHS.SCAN}`;
        const response = await safeFetch(scanUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
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
          sortedTerms: (data.report || []).map((r: any) => r.term).sort(),
        };
        setVaultSessions((prev) => ({ ...prev, [targetNotesPath]: newSession }));
        setActiveVaultPath(targetNotesPath);
        setStatusMessage("Scan completed successfully.");
      }
    } catch (err: any) {
      console.warn("Failed to execute scan:", err);
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
        assignedNoteTask,
        setAssignedNoteTask,
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
