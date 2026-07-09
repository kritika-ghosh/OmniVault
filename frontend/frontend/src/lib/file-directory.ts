export interface FilePayload {
  path: string;
  content: string;
}

export interface ScanResponse {
  status: string;
  total_terms_scanned: number;
  gaps_found: number;
  report: Array<{
    term: string;
    classification: string;
    reason: string;
    detected_from: string[];
  }>;
}

// Recursively reads files from a DirectoryHandle
export async function readFilesRecursively(
  dirHandle: FileSystemDirectoryHandle,
  relativePath: string = ""
): Promise<FilePayload[]> {
  const files: FilePayload[] = [];
  for await (const entry of dirHandle.values()) {
    const entryPath = relativePath ? `${relativePath}/${entry.name}` : entry.name;
    if (entry.kind === "file") {
      try {
        const file = await entry.getFile();
        const content = await file.text();
        files.push({ path: entryPath, content });
      } catch (err) {
        console.error(`Failed to read file ${entryPath}:`, err);
      }
    } else if (entry.kind === "directory") {
      // Exclude standard build/env folders to speed up processing
      if (!["node_modules", ".git", "venv", ".next", "dist", "build", "__pycache__"].includes(entry.name)) {
        files.push(...(await readFilesRecursively(entry, entryPath)));
      }
    }
  }
  return files;
}

// Parses different package managers and extracts library / module names
export function parseDependencies(files: FilePayload[]): Set<string> {
  const terms = new Set<string>();

  for (const file of files) {
    const filename = file.path.split("/").pop() || "";
    const content = file.content;

    // 1. package.json (JavaScript/TypeScript)
    if (filename === "package.json") {
      try {
        const parsed = JSON.parse(content);
        const deps = {
          ...parsed.dependencies,
          ...parsed.devDependencies,
        };
        Object.keys(deps).forEach((dep) => {
          // Normalize (strip @types/, scoped package names if desired, but keep name clean)
          const cleanDep = dep.startsWith("@types/") ? dep.replace("@types/", "") : dep;
          terms.add(cleanDep.toLowerCase().trim());
        });

        // Extract potential tool names/libraries from scripts
        if (parsed.scripts) {
          Object.values(parsed.scripts).forEach((scriptVal) => {
            if (typeof scriptVal === "string") {
              const words = scriptVal.split(/\s+/);
              words.forEach((w) => {
                const cleanWord = w.replace(/[^a-zA-Z0-9-_]/g, "").toLowerCase().trim();
                if (cleanWord && cleanWord.length > 2 && !["run", "node", "npm", "yarn", "pnpm", "npx", "deno"].includes(cleanWord)) {
                  terms.add(cleanWord);
                }
              });
            }
          });
        }
      } catch (e) {
        console.error("Failed to parse package.json:", e);
      }
    }

    // 2. requirements.txt (Python)
    if (filename === "requirements.txt") {
      const lines = content.split(/\r?\n/);
      lines.forEach((line) => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith("#")) {
          // Split on operators (==, >=, <=, >, <, ~=)
          const parts = trimmed.split(/==|>=|<=|>|<|~=/);
          if (parts[0]) {
            const pkg = parts[0].trim().toLowerCase();
            if (pkg) terms.add(pkg);
          }
        }
      });
    }

    // 3. Cargo.toml (Rust)
    if (filename === "Cargo.toml") {
      // Simple parser targeting [dependencies] and [dev-dependencies] blocks
      const lines = content.split(/\r?\n/);
      let inDepsSection = false;
      lines.forEach((line) => {
        const trimmed = line.trim();
        if (trimmed.startsWith("[dependencies]") || trimmed.startsWith("[dev-dependencies]")) {
          inDepsSection = true;
        } else if (trimmed.startsWith("[")) {
          inDepsSection = false;
        } else if (inDepsSection && trimmed && !trimmed.startsWith("#")) {
          const match = trimmed.match(/^([a-zA-Z0-9-_]+)\s*=/);
          if (match && match[1]) {
            terms.add(match[1].toLowerCase().trim());
          }
        }
      });
    }

    // 4. go.mod (Go)
    if (filename === "go.mod") {
      const lines = content.split(/\r?\n/);
      let inRequireBlock = false;
      lines.forEach((line) => {
        const trimmed = line.trim();
        if (trimmed.startsWith("require (")) {
          inRequireBlock = true;
        } else if (trimmed.startsWith(")")) {
          inRequireBlock = false;
        } else if (trimmed.startsWith("require ") && !trimmed.includes("(")) {
          const parts = trimmed.split(/\s+/);
          if (parts[1]) {
            // e.g. require github.com/gin-gonic/gin v1.7.0 -> extract gin-gonic/gin or gin
            const lastPart = parts[1].split("/").pop() || parts[1];
            terms.add(lastPart.toLowerCase().trim());
          }
        } else if (inRequireBlock && trimmed && !trimmed.startsWith("//")) {
          const parts = trimmed.split(/\s+/);
          if (parts[0]) {
            const lastPart = parts[0].split("/").pop() || parts[0];
            terms.add(lastPart.toLowerCase().trim());
          }
        }
      });
    }

    // 5. Gemfile (Ruby)
    if (filename === "Gemfile") {
      const lines = content.split(/\r?\n/);
      lines.forEach((line) => {
        const trimmed = line.trim();
        // gem 'rails', '~> 5.0' or gem "sqlite3"
        const gemMatch = trimmed.match(/^gem\s+['"]([^'"]+)['"]/);
        if (gemMatch && gemMatch[1]) {
          terms.add(gemMatch[1].toLowerCase().trim());
        }
      });
    }
  }

  return terms;
}

// Extracts technical terms directly from code file import/require statements
export function parseSourceImports(files: FilePayload[]): Set<string> {
  const terms = new Set<string>();

  // Patterns
  const importFromRegex = /import\s+(?:[\w*\s{},]*\s+from\s+)?['"]([^'"]+)['"]/g;
  const requireRegex = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  const pythonFromRegex = /from\s+([\w-]+)(?:\.[\w-]+)*\s+import/g;
  const pythonImportRegex = /^import\s+([\w-]+)/gm;

  for (const file of files) {
    const ext = file.path.split(".").pop() || "";
    const content = file.content;

    if (["js", "jsx", "ts", "tsx"].includes(ext)) {
      let match;
      importFromRegex.lastIndex = 0;
      while ((match = importFromRegex.exec(content)) !== null) {
        if (match[1] && !match[1].startsWith(".")) {
          const basePkg = match[1].split("/")[0];
          if (basePkg) terms.add(basePkg.toLowerCase().trim());
        }
      }

      requireRegex.lastIndex = 0;
      while ((match = requireRegex.exec(content)) !== null) {
        if (match[1] && !match[1].startsWith(".")) {
          const basePkg = match[1].split("/")[0];
          if (basePkg) terms.add(basePkg.toLowerCase().trim());
        }
      }
    } else if (ext === "py") {
      let match;
      pythonFromRegex.lastIndex = 0;
      while ((match = pythonFromRegex.exec(content)) !== null) {
        if (match[1]) {
          terms.add(match[1].toLowerCase().trim());
        }
      }

      pythonImportRegex.lastIndex = 0;
      while ((match = pythonImportRegex.exec(content)) !== null) {
        if (match[1]) {
          terms.add(match[1].toLowerCase().trim());
        }
      }
    }
  }

  return terms;
}
