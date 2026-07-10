import { ScanResponse, FilePayload } from "./file-directory";

export const mockScanResponse: ScanResponse = {
  status: "success",
  total_terms_scanned: 9,
  gaps_found: 4,
  report: [
    {
      term: "json",
      classification: "critical_gap",
      reason: "This module is executed dynamically within your repository code, but has no semantic documentation trace.",
      detected_from: ["main.py"]
    },
    {
      term: "utils",
      classification: "critical_gap",
      reason: "This module is executed dynamically within your repository code, but has no semantic documentation trace.",
      detected_from: ["main.py"]
    },
    {
      term: "matplotlib",
      classification: "critical_gap",
      reason: "Plotting and data visualization library imported inside the codebase but undocumented.",
      detected_from: ["data_analyzer.py", "requirements.txt"]
    },
    {
      term: "numpy",
      classification: "critical_gap",
      reason: "This module is executed dynamically within your repository code, but has no semantic documentation trace.",
      detected_from: ["utils.py", "requirements.txt", "main.py"]
    }
  ]
};

export const mockNotesFiles: FilePayload[] = [
  {
    path: "react.md",
    content: "# React\nCore UI library."
  },
  {
    path: "typescript.md",
    content: "# TypeScript\nType safety layer."
  },
  {
    path: "dockview.md",
    content: "# Dockview\nLayout rendering framework."
  },
  {
    path: "tailwind.md",
    content: "# Tailwind CSS\nUtility first CSS styling."
  },
  {
    path: "fastapi.md",
    content: "# FastAPI\nHigh performance python api framework."
  }
];

export const mockSortedTerms: string[] = [
  "json",
  "utils",
  "matplotlib",
  "numpy",
  "react",
  "typescript",
  "dockview",
  "tailwind",
  "fastapi"
];
