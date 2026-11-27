
"use client";

import { useEffect, useState } from "react";
import { getProjectFileCount, type ProjectData, type ProjectFile } from "../data";
import FileExplorer from "./file-explorer";
import CodeViewer from "./code-viewer";

type WorkspaceProps = {
  project: ProjectData;
  onClose: () => void;
  reviewCode: boolean;
};

const getProjectFiles = (project: ProjectData): ProjectFile[] => {
  const collectFolderFiles = (folder: ProjectData["folders"][number]): ProjectFile[] => [
    ...folder.files,
    ...(folder.folders?.flatMap(collectFolderFiles) ?? []),
  ];

  return [
    ...project.folders.flatMap(collectFolderFiles),
    ...project.rootFiles,
  ];
};

const Workspace = ({ project, onClose, reviewCode }: WorkspaceProps) => {
  const files = getProjectFiles(project);

  const [selectedFile, setSelectedFile] = useState<ProjectFile | null>(
    reviewCode ? files[0] ?? null : null
  );

  useEffect(() => {
    setSelectedFile(reviewCode ? files[0] ?? null : null);
  }, [project.id, reviewCode]);

  return (
    <section className="flex h-dvh min-h-0 flex-col bg-[#F5F1EA]">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-[#302A25]/10 px-4 py-4">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#A09384]">
            Repository
          </p>

          <h2 className="mt-1 truncate text-sm font-bold text-[#302A25]">
            {project.owner}/{project.name}
          </h2>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-lg border border-[#302A25]/15 px-3 py-2 text-xs font-semibold text-[#776B60] transition hover:bg-[#E8DFD3]"
        >
          Close
        </button>
      </header>

      <div className="shrink-0 border-b border-[#302A25]/10 px-4 py-3">
        {project.description && (
          <p className="text-xs leading-5 text-[#776B60]">
            {project.description}
          </p>
        )}

        <div className="mt-3 flex items-center gap-2">
          {project.language && (
            <span className="rounded-md bg-[#E8DFD3] px-2 py-1 text-[10px] font-semibold text-[#776B60]">
              {project.language}
            </span>
          )}

          <span className="text-[10px] text-[#A09384]">
            {getProjectFileCount(project)} files
          </span>
        </div>
      </div>

      <div className={`flex min-h-0 flex-1 overflow-hidden ${reviewCode ? "" : "w-full"}`}>
        <FileExplorer
          project={project}
          selectedFile={selectedFile}
          onSelectFile={setSelectedFile}
          fullWidth={!reviewCode}
        />

        {reviewCode && <CodeViewer file={selectedFile} />}
      </div>
    </section>
  );
};

export default Workspace;
