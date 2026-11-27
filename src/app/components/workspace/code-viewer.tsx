"use client";

import hljs from "highlight.js/lib/common";
import { useEffect, useState } from "react";
import type { ProjectFile } from "../data";

type CodeViewerProps = {
  file: ProjectFile | null;
};

const languageAliases: Record<string, string> = {
  cpp: "cpp", "c++": "cpp", c: "c", css: "css", html: "xml", javascript: "javascript",
  js: "javascript", json: "json", markdown: "markdown", md: "markdown",
  python: "python", py: "python", shell: "bash", sh: "bash",
  typescript: "typescript", ts: "typescript", tsx: "typescript", jsx: "javascript",
};

const escapeHtml = (value: string) =>
  value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

const CodeViewer = ({ file }: CodeViewerProps) => {
  const [content, setContent] = useState(file?.content ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setContent(file?.content ?? "");
    setError(null);

    if (!file?.repositoryId) return;

    setLoading(true);
    fetch(`/api/repositories/${file.repositoryId}?file=${encodeURIComponent(file.path)}`)
      .then(async (response) => {
        if (!response.ok) throw new Error("File could not be loaded.");
        return response.text();
      })
      .then((nextContent) => {
        if (!cancelled) setContent(nextContent);
      })
      .catch((loadError: unknown) => {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : "File could not be loaded.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [file]);

  if (!file) {
    return (
      <div className="flex min-w-0 flex-1 items-center justify-center px-4 text-center text-sm text-[#A09384]">
        Select a file to view its contents.
      </div>
    );
  }

  const language = languageAliases[file.language.toLowerCase()];
  const lines = content.split("\n");
  const highlightedLines = language
      ? hljs.highlight(content, { language }).value.split("\n")
    : lines.map(escapeHtml);

  return (
    <section className="flex min-w-0 flex-1 flex-col bg-[#F5F1EA]">
      <div className="flex h-10 shrink-0 items-center justify-between gap-3 border-b border-[#302A25]/10 px-4">
        <p className="truncate text-xs font-semibold text-[#302A25]" title={file.path}>
          {file.path}
        </p>
        <span className="ml-3 shrink-0 text-[10px] uppercase text-[#A09384]">
          {file.language || "text"}
        </span>
      </div>

      <div className="min-h-0 flex-1 overflow-auto py-4 font-mono text-xs leading-6">
        {loading && <p className="px-4 pb-2 text-[10px] text-[#A09384]">Loading file…</p>}
        {error && <p className="px-4 pb-2 text-[10px] text-[#B65F57]">{error}</p>}
        <div className="flex min-w-max">
          <div className="sticky left-0 select-none border-r border-[#302A25]/10 bg-[#F5F1EA] px-3 text-right text-[#A09384]">
            {lines.map((_, index) => <div key={index}>{index + 1}</div>)}
          </div>
          <pre className="px-4 text-[#302A25]"><code className="block">
            {highlightedLines.map((line, index) => (
              <span key={index} className="block" dangerouslySetInnerHTML={{ __html: line || " " }} />
            ))}
          </code></pre>
        </div>
      </div>

      <div className="flex h-8 shrink-0 items-center justify-between border-t border-[#302A25]/10 px-4 text-[10px] text-[#A09384]">
        <span>Read-only</span>
        <span>{lines.length} lines</span>
      </div>
    </section>
  );
};

export default CodeViewer;
