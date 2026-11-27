"use client";

import { useEffect, useState } from "react";
import type { ProjectData, ProjectFile, ProjectFolder } from "../data";

type FileExplorerProps = {
  project: ProjectData;
  selectedFile: ProjectFile | null;
  onSelectFile: (file: ProjectFile) => void;
  fullWidth?: boolean;
};

const FileExplorer = ({
  project,
  selectedFile,
  onSelectFile,
  fullWidth = false,
}: FileExplorerProps) => {
  const initialFolder = project.folders[0]?.path;
  const [openFolders, setOpenFolders] = useState<string[]>(
    initialFolder ? [initialFolder] : []
  );

  useEffect(() => {
    setOpenFolders(initialFolder ? [initialFolder] : []);
  }, [project.id, initialFolder]);
  const toggleFolder = (path: string) => {
    setOpenFolders((current) =>
      current.includes(path)
        ? current.filter((folder) => folder !== path)
        : [...current, path]
    );
  };

  const isSelected = (file: ProjectFile) =>
    selectedFile?.path === file.path;

  const renderFolder = (folder: ProjectFolder, depth = 0) => {
    const isOpen = openFolders.includes(folder.path);

    return (
      <div key={folder.path}>
        <button
          type="button"
          onClick={() => toggleFolder(folder.path)}
          className="flex w-full items-center gap-2 py-2 pr-2 text-left text-xs text-[#776B60] hover:bg-[#E8DFD3]/60"
          style={{ paddingLeft: `${16 + depth * 16}px` }}
        >
          <span>{isOpen ? "⌄" : "›"}</span>
          <span className="text-[#A8795D]">▰</span>
          <span className="truncate">{folder.name}</span>
        </button>

        {isOpen && (
          <>
            {folder.folders?.map((childFolder) =>
              renderFolder(childFolder, depth + 1)
            )}

            {folder.files.map((file) => (
              <button
                key={file.path}
                type="button"
                onClick={() => onSelectFile(file)}
                className={`flex w-full items-center gap-2 py-2 pr-2 text-left text-xs ${
                  isSelected(file)
                    ? "bg-[#E8DFD3] font-semibold text-[#302A25]"
                    : "text-[#776B60] hover:bg-[#E8DFD3]/50"
                }`}
                style={{ paddingLeft: `${36 + depth * 16}px` }}
              >
                <span className="text-[#A8795D]">◇</span>
                <span className="truncate">{file.name}</span>
              </button>
            ))}
          </>
        )}
      </div>
    );
  };

  return (
    <aside className={`flex shrink-0 flex-col border-r border-[#302A25]/10 bg-[#F5F1EA] ${fullWidth ? "w-full max-w-none" : "w-[42%] max-w-[190px] sm:w-[190px]"}`}>
      <div className="border-b border-[#302A25]/10 px-3 py-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-[#776B60]">
          Explorer
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto py-2">
        <div className="px-3 py-2 text-xs font-semibold text-[#302A25]">
          <span className="mr-2 text-[#A8795D]">◆</span>
          {project.name}
        </div>

        {project.folders.map((folder) => renderFolder(folder))}

        {project.rootFiles.map((file) => (
          <button
            key={file.path}
            type="button"
            onClick={() => onSelectFile(file)}
            className={`flex w-full items-center gap-2 px-4 py-2 text-left text-xs ${
              isSelected(file)
                ? "bg-[#E8DFD3] font-semibold text-[#302A25]"
                : "text-[#776B60] hover:bg-[#E8DFD3]/50"
            }`}
          >
            <span className="text-[#A8795D]">◇</span>
            <span className="truncate">{file.name}</span>
          </button>
        ))}

        {project.folders.length === 0 && project.rootFiles.length === 0 && (
          <p className="px-4 py-6 text-xs leading-5 text-[#A09384]">
            This repository is empty.
          </p>
        )}
      </div>
    </aside>
  );
};

export default FileExplorer;
