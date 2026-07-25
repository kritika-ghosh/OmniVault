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

// Utility to chunk large file arrays into smaller batches (e.g. 20 files per chunk)
export function chunkFiles(files: FilePayload[], chunkSize: number = 20): FilePayload[][] {
  const chunks: FilePayload[][] = [];
  for (let i = 0; i < files.length; i += chunkSize) {
    chunks.push(files.slice(i, i + chunkSize));
  }
  return chunks;
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
        const ext = entry.name.split(".").pop()?.toLowerCase() || "";
        const allowedExtensions = [
          "py", "js", "jsx", "ts", "tsx", "json", "txt", "toml", "mod", 
          "gemfile", "gem", "md", "html", "css", "yaml", "yml", "ini", "conf"
        ];
        const isSpecialConfig = ["gemfile", "gemfile.lock", "go.mod", "cargo.toml"].includes(entry.name.toLowerCase());

        if (allowedExtensions.includes(ext) || isSpecialConfig) {
          const file = await entry.getFile();
          if (file.size > 150000) {
            console.warn(`Skipping large file ${entryPath} (${file.size} bytes) to prevent payload bloat.`);
            continue;
          }
          const content = await file.text();
          files.push({ path: entryPath, content });
        }
      } catch (err) {
        console.error(`Failed to read file ${entryPath}:`, err);
      }
    } else if (entry.kind === "directory") {
      // Exclude standard build/env folders & Obsidian metadata to speed up processing
      const excludedDirs = [".obsidian", "node_modules", ".git", "venv", ".venv", "env", ".env", ".next", "dist", "build", "__pycache__", "chroma_db", ".vercel", "testing", ".agents", "out", "target"];
      if (!excludedDirs.includes(entry.name)) {
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

  const filtered = new Set<string>();
  terms.forEach((t) => {
    if (isHighValueConcept(t)) filtered.add(t);
  });
  return filtered;
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

  // Filter out low-level noise terms before returning
  const filtered = new Set<string>();
  terms.forEach((t) => {
    if (isHighValueConcept(t)) filtered.add(t);
  });
  return filtered;
}

const LOW_VALUE_NOISE_TERMS = new Set([
  // Python Stdlib
  "os", "sys", "re", "json", "ast", "typing", "uuid", "math", "time", "datetime", "pathlib", "hashlib",
  "subprocess", "unittest", "logging", "shutil", "tempfile", "copy", "collections", "functools", "itertools",
  "io", "base64", "struct", "socket", "select", "threading", "multiprocessing", "contextlib", "inspect",
  "random", "string", "glob", "csv", "xml", "html", "http", "urllib", "ftplib", "email", "mimetypes",
  "platform", "sysconfig", "builtins", "codecs", "errno", "gc", "signal", "traceback", "warnings", "weakref",
  "zipfile", "tarfile", "gzip", "bz2", "lzma", "ctypes", "dataclasses", "enum", "typing_extensions",
  "annotated_types", "types", "importlib", "pkg_resources", "site", "abc", "numbers", "decimal", "fractions",
  // JS/Node Stdlib & Trivial Globals
  "fs", "path", "url", "events", "util", "stream", "buffer", "crypto", "child_process", "cluster", "net",
  "tls", "dns", "assert", "v8", "vm", "zlib", "console", "process", "window", "document", "global",
  // Low-level Micro Transitive Dependencies
  "six", "certifi", "idna", "urllib3", "charset_normalizer", "charset-normalizer", "zipp", "importlib_metadata",
  "importlib-metadata", "importlib_resources", "importlib-resources", "attrs", "rpds_py", "rpds-py", "colorama",
  "tqdm", "filelock", "h11", "sniffio", "fsspec", "pyasn1", "pycparser", "soupsieve", "backoff", "annotated-types",
  "typing-extensions", "packaging", "platformdirs", "pyproject_hooks", "pyproject-hooks", "et_xmlfile",
  "et-xmlfile", "httpcore", "httpx_sse", "httpx-sse", "aiosignal", "frozenlist", "yarl", "multidict", "proglog",
  "distro", "pywin32", "wincertstore", "cffi", "pytz", "python_dateutil", "python-dateutil", "tenacity",
  "watchfiles", "mdit_py_plugins", "mdit-py-plugins", "markdown_it_py", "markdown-it-py", "pygments", "jsonref",
  "referencing", "jsonschema", "jsonschema_specifications", "jsonschema-specifications", "opentelemetry_proto",
  "opentelemetry-proto", "opentelemetry_api", "opentelemetry-api", "opentelemetry_exporter_otlp_proto_http",
  "opentelemetry-exporter-otlp-proto-http", "opentelemetry-exporter-otlp-proto-grpc", "grpcio_status",
  "grpcio-status", "google_api_python_client", "google_api_core", "googleapis_common_protos", "google_auth_httplib2",
  "google_auth", "google-auth", "google-auth-httplib2", "google-ai-generativelanguage", "openpyxl", "pdfminer_six",
  "pdfminer.six", "pdfplumber", "pypdf", "tiktoken", "tokenizers", "huggingface_hub", "huggingface-hub", "safetensors",
  "flatbuffers", "lance_namespace", "lance-namespace", "lance-namespace-urllib3-client", "appdirs", "alohappyeyeballs",
  "aiofiles", "aiosqlite", "propcache", "pypika", "sniffio", "click", "build", "trash", "estimation", "preview",
  "docstring_parser", "httplib2", "grpcio", "pyaes", "pyarrow", "async_timeout", "overrides", "wrapt", "annotated-doc"
]);

export function isHighValueConcept(term: string): boolean {
  if (!term || term.trim().length < 3) return false;
  const clean = term.toLowerCase().trim();
  if (LOW_VALUE_NOISE_TERMS.has(clean)) return false;
  if (clean.length <= 3 && !["css", "sql", "api", "git", "jwt", "orm", "aws", "gcp"].includes(clean)) {
    return false;
  }
  return true;
}

// Extracts implicit in-between architectural & networking concepts from code patterns
export function parseImplicitInbetweenConcepts(files: FilePayload[]): Set<string> {
  const concepts = new Set<string>();

  for (const file of files) {
    const content = file.content.toLowerCase();

    // 1. CORS / Cross-Origin Resource Sharing
    if (content.includes("cors") || content.includes("corsmiddleware") || content.includes("access-control-allow-origin")) {
      concepts.add("CORS / Cross-Origin Sharing");
    }

    // 2. JWT / Bearer Authentication
    if (content.includes("jwt") || content.includes("bearer") || content.includes("oauth2") || content.includes("passlib") || content.includes("bcrypt")) {
      concepts.add("JWT Bearer Authentication");
    }

    // 3. Database Connection Pooling & ORM Session Lifecycle
    if (content.includes("create_engine") || content.includes("sessionmaker") || content.includes("sessionlocal") || content.includes("pool_size") || content.includes("declarative_base")) {
      concepts.add("Database Connection Pooling");
    }

    // 4. Asynchronous Event Loop & Non-Blocking I/O
    if (content.includes("async def") || content.includes("asyncio") || content.includes("taskgroup") || content.includes("promise.all")) {
      concepts.add("Asynchronous Non-Blocking Event Loop");
    }

    // 5. Pydantic Data Validation & Schema Serialization
    if (content.includes("basemodel") || content.includes("field(") || content.includes("validator") || content.includes("model_validator")) {
      concepts.add("Pydantic Data Serialization");
    }

    // 6. Vector Embedding Retrieval & Cosine Similarity
    if (content.includes("chromadb") || content.includes("vector_store") || content.includes("embedding") || content.includes("cosine")) {
      concepts.add("Vector Search & Embedding Retrieval");
    }

    // 7. REST Middleware & Exception Interception
    if (content.includes("middleware") || content.includes("httpexception") || content.includes("exception_handler")) {
      concepts.add("REST API Middleware Interception");
    }

    // 8. State Hydration & Session Storage
    if (content.includes("sessionstorage") || content.includes("localstorage") || content.includes("usecontext") || content.includes("useworkspace")) {
      concepts.add("State Hydration & Session Management");
    }

    // 9. Active Recall Memory Decay
    if (content.includes("ebbinghaus") || content.includes("decay_score") || content.includes("confidence_level")) {
      concepts.add("Spaced Repetition & Memory Decay");
    }
  }

  return concepts;
}
