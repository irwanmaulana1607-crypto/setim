import { unzipSync } from "fflate";

export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
const MAX_EXTRACTED_BYTES = 100 * 1024 * 1024;
const MAX_FILES = 2_000;
const MAX_FILE_BYTES = 10 * 1024 * 1024;

const excludedDirectories = new Set([
  ".git",
  "node_modules",
  ".next",
  "dist",
  "build",
  "coverage",
  ".cache",
  "__pycache__",
]);

const dangerousExtensions = new Set([
  ".exe", ".dll", ".so", ".dylib", ".bat", ".cmd", ".com", ".msi", ".scr",
]);

const sensitiveNamePattern = /(^|\/)(\.env(?:\..*)?|id_rsa|credentials|secrets?)(\/|$)/i;
const sensitiveExtensionPattern = /\.(pem|key|p12|pfx|crt)$/i;

export type UploadFile = {
  relativePath: string;
  fileName: string;
  extension: string;
  language: string;
  bytes: Uint8Array;
  sensitive: boolean;
};

export type RepositoryPreview = {
  name: string;
  description: string;
  primaryLanguage: string;
  files: Array<Pick<UploadFile, "relativePath" | "fileName" | "extension" | "language" | "sensitive"> & { size: number }>;
  fileCount: number;
  folderCount: number;
  totalSize: number;
  warnings: string[];
};

const languageByExtension: Record<string, string> = {
  ".c": "C", ".h": "C", ".cc": "C++", ".cpp": "C++", ".cxx": "C++", ".hpp": "C++",
  ".css": "CSS", ".go": "Go", ".html": "HTML", ".java": "Java", ".js": "JavaScript",
  ".jsx": "JavaScript", ".json": "JSON", ".md": "Markdown", ".php": "PHP", ".py": "Python",
  ".rb": "Ruby", ".rs": "Rust", ".sh": "Shell", ".sql": "SQL", ".swift": "Swift",
  ".ts": "TypeScript", ".tsx": "TypeScript", ".vue": "Vue", ".xml": "XML",
};

const normalizePath = (input: string): string => {
  const normalized = input.replaceAll("\\", "/").replace(/^\/+/, "");
  const parts = normalized.split("/").filter(Boolean);

  if (!normalized || parts.some((part) => part === ".." || part.includes("\0"))) {
    throw new Error("A file path contains an unsafe traversal segment.");
  }

  if (parts.some((part) => excludedDirectories.has(part.toLowerCase()))) {
    throw new Error("Archives may not include dependency, build, cache, or .git directories.");
  }

  return parts.join("/");
};

const toFileRecord = (relativePath: string, bytes: Uint8Array): UploadFile => {
  const fileName = relativePath.split("/").at(-1) ?? relativePath;
  const dotIndex = fileName.lastIndexOf(".");
  const extension = dotIndex > 0 ? fileName.slice(dotIndex).toLowerCase() : "";
  const sensitive = sensitiveNamePattern.test(relativePath) || sensitiveExtensionPattern.test(extension);

  if (dangerousExtensions.has(extension)) {
    throw new Error(`Executable file rejected: ${fileName}`);
  }

  if (sensitive) {
    throw new Error(`Sensitive file rejected: ${fileName}`);
  }

  if (bytes.byteLength > MAX_FILE_BYTES) {
    throw new Error(`File exceeds the ${MAX_FILE_BYTES / 1024 / 1024} MB per-file limit: ${fileName}`);
  }

  return {
    relativePath,
    fileName,
    extension,
    language: languageByExtension[extension] ?? "text",
    bytes,
    sensitive,
  };
};

const addFile = (files: UploadFile[], path: string, bytes: Uint8Array) => {
  const normalized = normalizePath(path);
  files.push(toFileRecord(normalized, bytes));

  if (files.length > MAX_FILES) {
    throw new Error(`A repository may contain at most ${MAX_FILES} files.`);
  }
};

export const parseRepositoryUpload = async (formData: FormData) => {
  const zip = formData.get("zip");
  const individualFiles = formData.getAll("files").filter((value): value is File => value instanceof File);
  const files: UploadFile[] = [];
  let totalSize = 0;

  if (zip instanceof File) {
    if (!zip.name.toLowerCase().endsWith(".zip")) {
      throw new Error("Project upload must be a ZIP file.");
    }

    if (zip.size > MAX_UPLOAD_BYTES) {
      throw new Error("The ZIP file exceeds the 25 MB upload limit.");
    }

    let archive: Record<string, Uint8Array>;
    try {
      archive = unzipSync(new Uint8Array(await zip.arrayBuffer()));
    } catch {
      throw new Error("The ZIP archive could not be safely extracted.");
    }

    for (const [path, bytes] of Object.entries(archive)) {
      if (path.endsWith("/")) continue;
      addFile(files, path, bytes);
      totalSize += bytes.byteLength;
      if (totalSize > MAX_EXTRACTED_BYTES) {
        throw new Error("The extracted repository exceeds the 100 MB safety limit.");
      }
    }

    if (totalSize > zip.size * 50 && totalSize > 10 * 1024 * 1024) {
      throw new Error("The ZIP compression ratio is too high for a safe upload.");
    }
  }

  for (const file of individualFiles) {
    const relativePath = (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name;
    const bytes = new Uint8Array(await file.arrayBuffer());
    addFile(files, relativePath, bytes);
    totalSize += bytes.byteLength;
    if (totalSize > MAX_UPLOAD_BYTES) {
      throw new Error("The combined upload exceeds the 25 MB limit.");
    }
  }

  if (files.length === 0) {
    throw new Error("Select a ZIP file or at least one source file.");
  }

  const folderPaths = new Set<string>();
  for (const file of files) {
    const parts = file.relativePath.split("/");
    parts.pop();
    for (let index = 1; index <= parts.length; index += 1) {
      folderPaths.add(parts.slice(0, index).join("/"));
    }
  }

  const languageCounts = new Map<string, number>();
  for (const file of files) {
    languageCounts.set(file.language, (languageCounts.get(file.language) ?? 0) + 1);
  }
  const primaryLanguage = [...languageCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "text";

  const name = String(formData.get("name") ?? "").trim();
  if (!name || name.length > 100) {
    throw new Error("Repository name is required and must be at most 100 characters.");
  }

  const description = String(formData.get("description") ?? "").trim().slice(0, 500);
  const preview: RepositoryPreview = {
    name,
    description,
    primaryLanguage,
    files: files.map(({ bytes, ...file }) => ({ ...file, size: bytes.byteLength })),
    fileCount: files.length,
    folderCount: folderPaths.size,
    totalSize,
    warnings: [],
  };

  return { files, preview };
};
