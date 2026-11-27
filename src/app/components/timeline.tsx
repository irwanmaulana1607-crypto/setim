
"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { FaCode, FaFileCode, FaHashtag, FaImage, FaLink, FaPaperPlane, FaSquarePollVertical, FaTerminal, FaXmark } from "react-icons/fa6";
import ComposerFeatures, { type ComposerFeatureValues } from "./composer-features";
import NetworkTab from "./network-tab";
import Thread from "./thread";
import type { FeedPost, PostType, ProjectData, ProjectFile, ProjectFolder } from "./data";
import { POSTS } from "./data";

type UploadPreview = {
  name: string;
  description: string;
  primaryLanguage: string;
  files: Array<{ relativePath: string; fileName: string; extension: string; language: string; size: number }>;
  fileCount: number;
  folderCount: number;
  totalSize: number;
};

const buildRemoteProject = (preview: UploadPreview, repositoryId: string): ProjectData => {
  const folders: ProjectFolder[] = [];
  const rootFiles: ProjectFile[] = [];

  for (const previewFile of preview.files) {
    const parts = previewFile.relativePath.split("/");
    const file: ProjectFile = {
      name: previewFile.fileName,
      path: previewFile.relativePath,
      language: previewFile.language,
      content: "",
      repositoryId,
    };

    if (parts.length === 1) {
      rootFiles.push(file);
      continue;
    }

    parts.pop();
    let currentFolders = folders;
    let currentPath = "";
    for (const folderName of parts) {
      currentPath = currentPath ? `${currentPath}/${folderName}` : folderName;
      let folder = currentFolders.find((candidate) => candidate.path === currentPath);
      if (!folder) {
        folder = { name: folderName, path: currentPath, files: [], folders: [] };
        currentFolders.push(folder);
      }
      currentFolders = folder.folders ?? (folder.folders = []);
    }
    currentFolders.length;
    const parent = [...folders].flatMap(function find(folder): ProjectFolder[] {
      if (folder.path === parts.join("/")) return [folder];
      return folder.folders?.flatMap(find) ?? [];
    })[0];
    parent?.files.push(file);
  }

  return {
    id: repositoryId,
    remoteId: repositoryId,
    name: preview.name,
    owner: "you",
    description: preview.description,
    language: preview.primaryLanguage,
    folders,
    rootFiles,
  };
};

const hasComposerFeature = (values: ComposerFeatureValues, postType: PostType | "") =>
  Boolean(values.linkPreview || values.snippet || values.poll || values.topics.length || postType);

type TimelineProps = {
  onReviewSourceCode: (post: FeedPost, reviewCode?: boolean) => void;
  composerOpen: boolean;
  onCloseComposer: () => void;
  composerOnly?: boolean;
};

const ComposerPortal = ({ enabled, children }: { enabled: boolean; children: ReactNode }) => {
  if (!enabled || typeof document === "undefined") return <>{children}</>;
  return createPortal(children, document.body);
};

const Timeline = ({ onReviewSourceCode, composerOpen, onCloseComposer, composerOnly = false }: TimelineProps) => {
  const [activeTab, setActiveTab] = useState("Following");
  const [posts, setPosts] = useState(POSTS);
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [showSourceModal, setShowSourceModal] = useState(false);
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [sourceFiles, setSourceFiles] = useState<File[]>([]);
  const [repositoryName, setRepositoryName] = useState("");
  const [repositoryDescription, setRepositoryDescription] = useState("");
  const [uploadPreview, setUploadPreview] = useState<UploadPreview | null>(null);
  const [pendingRepositoryId, setPendingRepositoryId] = useState<string | null>(null);
  const [pendingProject, setPendingProject] = useState<ProjectData | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [featureMode, setFeatureMode] = useState<"link" | "snippet" | "poll" | "topics" | null>(null);
  const [featureValues, setFeatureValues] = useState<ComposerFeatureValues>({ topics: [] });
  const [postType, setPostType] = useState<PostType | "">("");
  const [composerError, setComposerError] = useState<string | null>(null);

  useEffect(() => {
    if (!composerOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [composerOpen]);

  useEffect(() => {
    if (composerOpen && activeTab === "Network") setActiveTab("Discover");
  }, [activeTab, composerOpen]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/threads")
      .then(async (response) => {
        if (!response.ok) return null;
        return response.json() as Promise<{ threads?: Array<{
          id: string; author_id: string; content: string; project_id: string | null; created_at: string;
          repositories?: { id: string; owner_id: string; name: string; description: string; primary_language: string; repository_files: Array<{ relative_path: string; file_name: string; extension: string; language: string; size: number }> } | null;
          post_type?: PostType | null;
          thread_links?: Array<{ url: string; title: string; description: string; thumbnail_url: string; domain: string }>;
          thread_snippets?: Array<{ language: string; code: string }>;
          polls?: Array<{ id: string; question: string; expires_at: string | null; poll_options: Array<{ id: string; option_text: string; poll_votes: Array<{ user_id: string }> }> }>;
          thread_topics?: Array<{ topics: { id: string; name: string; slug: string } | null }>;
        }> }>;
      })
      .then((result) => {
        if (cancelled || !result?.threads?.length) return;
        const remotePosts: FeedPost[] = result.threads.map((thread) => {
          const repository = thread.repositories;
          const project = repository
            ? buildRemoteProject({
                name: repository.name,
                description: repository.description,
                primaryLanguage: repository.primary_language,
                files: repository.repository_files.map((file) => ({ ...file, relativePath: file.relative_path, fileName: file.file_name })),
                fileCount: repository.repository_files.length,
                folderCount: 0,
                totalSize: repository.repository_files.reduce((total, file) => total + file.size, 0),
              }, repository.id)
            : undefined;
          const link = thread.thread_links?.[0];
          const snippet = thread.thread_snippets?.[0];
          const poll = thread.polls?.[0];
          return {
            id: thread.id, name: "Setim member", username: thread.author_id.slice(0, 8), time: "now",
            content: thread.content, scope: "Following", likes: 0, replies: 0, reposts: 0,
            createdAt: new Date(thread.created_at).getTime(), project, projectId: thread.project_id ?? undefined,
            postType: thread.post_type ?? undefined,
            linkPreview: link ? { url: link.url, title: link.title, description: link.description, thumbnail: link.thumbnail_url, domain: link.domain } : undefined,
            snippet: snippet ? { language: snippet.language, code: snippet.code } : undefined,
            poll: poll ? { id: poll.id, question: poll.question, expiresAt: poll.expires_at ?? undefined, options: poll.poll_options.map((option) => ({ id: option.id, text: option.option_text, votes: option.poll_votes.length })) } : undefined,
            topics: thread.thread_topics?.flatMap((item) => item.topics ? [item.topics] : []),
          };
        });
        setPosts((currentPosts) => [...remotePosts, ...currentPosts.filter((post) => !remotePosts.some((remote) => remote.id === post.id))]);
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, []);

  const tabs = ["Discover", "Network", "Following"];

  const filteredPosts = posts.filter((post) => {
    if (activeTab === "Following") return true;
    if (activeTab === "Discover") return post.scope === "Following";
    return post.scope === activeTab;
  });

  const visiblePosts =
    activeTab === "Following"
      ? [...filteredPosts].sort((first, second) => second.createdAt - first.createdAt)
      : filteredPosts;

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => setImageUrl(typeof reader.result === "string" ? reader.result : null);
    reader.readAsDataURL(file);
    event.target.value = "";
  };

  const handleSourceUpload = async () => {
    if ((!zipFile && sourceFiles.length === 0) || !repositoryName.trim()) {
      setUploadError("Repository name and at least one ZIP or source file are required.");
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setUploadError(null);
    const formData = new FormData();
    formData.append("name", repositoryName.trim());
    formData.append("description", repositoryDescription.trim());
    if (zipFile) formData.append("zip", zipFile);
    sourceFiles.forEach((file) => formData.append("files", file, file.name));

    try {
      const result = await new Promise<{ error?: string; preview?: UploadPreview; repositoryId?: string }>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", "/api/repositories/upload");
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) setUploadProgress(Math.round((event.loaded / event.total) * 100));
        };
        xhr.onload = () => {
          try { resolve(JSON.parse(xhr.responseText) as { error?: string; preview?: UploadPreview; repositoryId?: string }); }
          catch { reject(new Error("Invalid upload response.")); }
        };
        xhr.onerror = () => reject(new Error("Source code upload failed."));
        xhr.send(formData);
      });
      if (!result.preview || !result.repositoryId) throw new Error(result.error ?? "Source code upload failed.");
      setUploadProgress(100);
      setUploadPreview(result.preview);
      setPendingRepositoryId(result.repositoryId);
      setPendingProject(buildRemoteProject(result.preview, result.repositoryId));
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Source code upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const publishSourcePost = async () => {
    if (!pendingRepositoryId || !pendingProject) return;
    setUploading(true);
    setUploadError(null);
    try {
      const response = await fetch("/api/threads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: content.trim(), projectId: pendingRepositoryId }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Thread could not be published.");
      setPosts((currentPosts) => [{
        id: Date.now().toString(), name: "You", username: "you", time: "now",
        content: content.trim(), scope: "Following", likes: 0, replies: 0,
        reposts: 0, createdAt: Date.now(), imageUrl: imageUrl ?? undefined,
        project: pendingProject, projectId: pendingRepositoryId,
      }, ...currentPosts]);
      setContent(""); setImageUrl(null); setShowSourceModal(false); setUploadPreview(null);
      setPendingRepositoryId(null); setPendingProject(null); setRepositoryName(""); setRepositoryDescription("");
      setZipFile(null); setSourceFiles([]); setActiveTab("Following");
      onCloseComposer();
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Thread could not be published.");
    } finally {
      setUploading(false);
    }
  };

  const handleFeatureSave = (values: ComposerFeatureValues) => {
    setFeatureValues((current) => ({ ...current, ...values }));
    setFeatureMode(null);
  };

  const handlePost = async () => {
    if (!content.trim() && !imageUrl && !hasComposerFeature(featureValues, postType)) return;

    const hasFeatures = Boolean(featureValues.linkPreview || featureValues.snippet || featureValues.poll || featureValues.topics.length || postType);
    if (hasFeatures) {
      setComposerError(null);
      try {
        const response = await fetch("/api/threads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: content.trim(),
            postType: postType || undefined,
            link: featureValues.linkPreview,
            snippet: featureValues.snippet,
            poll: featureValues.poll,
            topics: featureValues.topics,
          }),
        });
        const result = await response.json() as { error?: string };
        if (!response.ok) throw new Error(result.error ?? "Post could not be published.");
      } catch (error) {
        setComposerError(error instanceof Error ? error.message : "Post could not be published.");
        return;
      }
    }

    const newPost: FeedPost = {
      id: Date.now().toString(),
      name: "You",
      username: "you",
      time: "now",
      content: content.trim(),
      scope: "Following",
      likes: 0,
      replies: 0,
      reposts: 0,
      createdAt: Date.now(),
      imageUrl: imageUrl ?? undefined,
      linkPreview: featureValues.linkPreview,
      snippet: featureValues.snippet,
      poll: featureValues.poll,
      topics: featureValues.topics,
      postType: postType || undefined,
    };

    setPosts((currentPosts) => [newPost, ...currentPosts]);
    setContent("");
    setImageUrl(null);
    setFeatureValues({ topics: [] });
    setPostType("");
    setComposerError(null);
    setActiveTab("Following");
    onCloseComposer();
  };

  return (
    <section className="min-w-0 flex-1">
      {!composerOnly && <header className="setim-page-header sticky top-0 z-20 bg-[#F5F1EA]/95">
        <div className="grid grid-cols-3">
          {tabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`relative py-4 text-sm font-semibold transition ${
                activeTab === tab
                  ? "text-[#302A25]"
                  : "text-[#A09384] hover:bg-[#E8DFD3]/40"
              }`}
            >
              {tab}

              {activeTab === tab && (
                <span className="absolute bottom-0 left-1/2 h-[3px] w-12 -translate-x-1/2 rounded-full bg-[#A8795D]" />
              )}
            </button>
          ))}
        </div>
      </header>}

      {composerOpen && !composerOnly && activeTab !== "Network" && (
        <div className="scroll-mt-20 border-b border-[#302A25]/10 bg-[#E8DFD3]/10 px-5 py-6">
          <div className="flex gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#302A25]/10 bg-[#E8DFD3] text-sm font-bold text-[#776B60]">Y</div>
            <div className="min-w-0 flex-1">
            <textarea
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder="What are you working on?"
              className="min-h-20 w-full resize-none rounded-xl border border-transparent bg-[#F5F1EA]/45 px-3 py-3 text-sm leading-6 text-[#302A25] outline-none placeholder:text-[#A09384] focus:border-[#A8795D]/45 focus:bg-[#F5F1EA]"
              aria-label="Post content"
            />
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-[#302A25]/10 pt-3">
            <div className="flex flex-wrap items-center gap-1 text-[#A8795D]">
              <label htmlFor="post-image-inline" title="Add image" className="flex min-h-10 min-w-10 cursor-pointer items-center justify-center rounded-lg text-base transition hover:bg-[#E8DFD3] hover:text-[#93694F]"><FaImage aria-hidden="true" /><span className="sr-only">Add image</span></label>
              <input id="post-image-inline" type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
              <button type="button" onClick={() => { setShowSourceModal(true); setUploadError(null); }} title="Attach source code" aria-label="Attach source code" className="flex min-h-10 min-w-10 items-center justify-center rounded-lg text-base transition hover:bg-[#E8DFD3] hover:text-[#93694F]"><FaCode aria-hidden="true" /></button>
              <button type="button" onClick={() => setFeatureMode("link")} title="Attach link" aria-label="Attach link" className="flex min-h-10 min-w-10 items-center justify-center rounded-lg text-base transition hover:bg-[#E8DFD3] hover:text-[#93694F]"><FaLink /></button>
              <button type="button" onClick={() => setFeatureMode("snippet")} title="Code snippet" aria-label="Code snippet" className="flex min-h-10 min-w-10 items-center justify-center rounded-lg text-base transition hover:bg-[#E8DFD3] hover:text-[#93694F]"><FaTerminal /></button>
              <button type="button" onClick={() => setFeatureMode("poll")} title="Create poll" aria-label="Create poll" className="flex min-h-10 min-w-10 items-center justify-center rounded-lg text-base transition hover:bg-[#E8DFD3] hover:text-[#93694F]"><FaSquarePollVertical /></button>
              <button type="button" onClick={() => setFeatureMode("topics")} title="Add topics" aria-label="Add topics" className="flex min-h-10 min-w-10 items-center justify-center rounded-lg text-base transition hover:bg-[#E8DFD3] hover:text-[#93694F]"><FaHashtag /></button>
            </div>
            <div className="flex items-center gap-3">
              <select value={postType} onChange={(event) => setPostType(event.target.value as PostType | "")} aria-label="Post type" className="max-w-32 rounded-lg border border-[#302A25]/10 bg-[#F5F1EA] px-2 py-2 text-[10px] text-[#776B60] outline-none focus:border-[#A8795D]/60"><option value="">Type</option><option value="discussion">Discussion</option><option value="question">Question</option><option value="project_showcase">Project Showcase</option><option value="tutorial">Tutorial</option><option value="announcement">Announcement</option></select>
              <button type="button" onClick={handlePost} disabled={!content.trim() && !imageUrl && !hasComposerFeature(featureValues, postType)} className="inline-flex min-h-10 items-center gap-2 rounded-full bg-[#A8795D] px-5 py-2 text-xs font-semibold text-white transition hover:bg-[#93694F] active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"><FaPaperPlane aria-hidden="true" />Post</button>
            </div>
          </div>
          </div>
        </div>
        </div>
      )}

      <ComposerPortal enabled={composerOpen}>
        <section
          id="composer"
          className={composerOpen ? "fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[#302A25]/40 px-4 py-6 backdrop-blur-[2px] sm:py-12" : composerOnly || activeTab === "Network" ? "hidden" : "scroll-mt-20 border-b border-[#302A25]/10 bg-[#E8DFD3]/10 px-5 py-6"}
        >
        <div className={composerOpen ? "setim-popover setim-surface relative mt-4 flex w-full max-w-xl gap-3 rounded-2xl bg-[#F5F1EA] p-5 shadow-xl sm:mt-0" : "flex gap-3"}>
          {composerOpen && <button type="button" onClick={onCloseComposer} aria-label="Close Create Post" className="absolute right-4 top-4 rounded-lg p-2 text-lg text-[#776B60] hover:bg-[#E8DFD3] hover:text-[#A8795D]"><FaXmark /></button>}
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#302A25]/10 bg-[#E8DFD3] text-sm font-bold text-[#776B60] transition-transform duration-150 hover:scale-105">
            Y
          </div>

          <div className="min-w-0 flex-1">
            <textarea
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder="What are you working on?"
              onInput={(event) => { event.currentTarget.style.height = "auto"; event.currentTarget.style.height = `${event.currentTarget.scrollHeight}px`; }}
              className="min-h-20 w-full resize-none rounded-xl border border-transparent bg-[#F5F1EA]/45 px-3 py-3 text-sm leading-6 text-[#302A25] outline-none placeholder:text-[#A09384] focus:border-[#A8795D]/45 focus:bg-[#F5F1EA]"
            />

            {imageUrl && (
              <div className="relative mb-3 w-fit">
                <img src={imageUrl} alt="Image preview" className="max-h-28 rounded-xl border border-[#302A25]/10 object-cover transition-transform duration-200 hover:scale-[1.01]" />
                <button
                  type="button"
                  onClick={() => setImageUrl(null)}
                  aria-label="Remove image"
                  className="absolute -right-2 -top-2 rounded-full bg-[#302A25] p-1.5 text-white transition hover:bg-[#A8795D]"
                >
                  <FaXmark aria-hidden="true" />
                </button>
              </div>
            )}

            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-[#302A25]/10 pt-3">
              <div className="flex flex-wrap items-center gap-1 text-[#A8795D]">
                <label
                  htmlFor="post-image"
                  title="Add image"
                  className="flex min-h-10 min-w-10 cursor-pointer items-center justify-center rounded-lg text-base transition hover:bg-[#E8DFD3] hover:text-[#93694F]"
                >
                  <FaImage aria-hidden="true" />
                  <span className="sr-only">Add image</span>
                </label>
                <input id="post-image" type="file" accept="image/*" onChange={handleImageChange} className="hidden" />

                <button
                  type="button"
                  onClick={() => { setShowSourceModal(true); setUploadError(null); }}
                  title="Attach source code"
                  aria-label="Attach source code"
                  className="flex min-h-10 min-w-10 items-center justify-center rounded-lg text-base transition hover:bg-[#E8DFD3] hover:text-[#93694F]"
                >
                  <FaCode aria-hidden="true" />
                </button>
                <button type="button" onClick={() => setFeatureMode("link")} title="Attach link" aria-label="Attach link" className="flex min-h-10 min-w-10 items-center justify-center rounded-lg text-base transition hover:bg-[#E8DFD3] hover:text-[#93694F]"><FaLink /></button>
                <button type="button" onClick={() => setFeatureMode("snippet")} title="Code snippet" aria-label="Code snippet" className="flex min-h-10 min-w-10 items-center justify-center rounded-lg text-base transition hover:bg-[#E8DFD3] hover:text-[#93694F]"><FaTerminal /></button>
                <button type="button" onClick={() => setFeatureMode("poll")} title="Create poll" aria-label="Create poll" className="flex min-h-10 min-w-10 items-center justify-center rounded-lg text-base transition hover:bg-[#E8DFD3] hover:text-[#93694F]"><FaSquarePollVertical /></button>
                <button type="button" onClick={() => setFeatureMode("topics")} title="Add topics" aria-label="Add topics" className="flex min-h-10 min-w-10 items-center justify-center rounded-lg text-base transition hover:bg-[#E8DFD3] hover:text-[#93694F]"><FaHashtag /></button>
              </div>

              <div className="flex items-center gap-3">
                <select value={postType} onChange={(event) => setPostType(event.target.value as PostType | "")} aria-label="Post type" className="max-w-32 rounded-lg border border-[#302A25]/10 bg-[#F5F1EA] px-2 py-2 text-[10px] text-[#776B60] outline-none focus:border-[#A8795D]/60"><option value="">Type</option><option value="discussion">Discussion</option><option value="question">Question</option><option value="project_showcase">Project Showcase</option><option value="tutorial">Tutorial</option><option value="announcement">Announcement</option></select>
                <button type="button" onClick={handlePost} disabled={!content.trim() && !imageUrl && !hasComposerFeature(featureValues, postType)} className="inline-flex min-h-10 items-center gap-2 rounded-full bg-[#A8795D] px-5 py-2 text-xs font-semibold text-white transition hover:bg-[#93694F] active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"><FaPaperPlane aria-hidden="true" />Post</button>
              </div>
            </div>
            {composerError && <p role="alert" className="mt-2 text-xs text-[#B65F57]">{composerError}</p>}
          </div>
        </div>
        </section>
      </ComposerPortal>

      {featureMode && <ComposerFeatures mode={featureMode} onClose={() => setFeatureMode(null)} onSave={handleFeatureSave} />}

      {showSourceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#302A25]/35 p-4 backdrop-blur-[2px]">
          <div role="dialog" aria-modal="true" aria-labelledby="source-upload-title" className="setim-popover max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-[#302A25]/10 bg-[#F5F1EA] p-5 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="source-upload-title" className="text-lg font-bold text-[#302A25]">Attach Source Code</h2>
                <p className="mt-1 text-xs text-[#776B60]">Upload a ZIP or select individual source files. Maximum upload: 25 MB.</p>
              </div>
              <button type="button" onClick={() => setShowSourceModal(false)} aria-label="Close source code dialog" className="text-lg text-[#776B60] hover:text-[#A8795D]"><FaXmark /></button>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <label className="cursor-pointer rounded-xl border border-dashed border-[#A8795D]/50 bg-[#E8DFD3]/40 p-4 text-center text-xs text-[#776B60] transition hover:border-[#A8795D] hover:bg-[#E8DFD3]/75">
                <FaCode className="mx-auto mb-2 text-lg text-[#A8795D]" />
                <span>{zipFile?.name ?? "Choose project ZIP"}</span>
                <input type="file" accept=".zip,application/zip" onChange={(event) => setZipFile(event.target.files?.[0] ?? null)} className="hidden" />
              </label>
              <label className="cursor-pointer rounded-xl border border-dashed border-[#A8795D]/50 bg-[#E8DFD3]/40 p-4 text-center text-xs text-[#776B60] transition hover:border-[#A8795D] hover:bg-[#E8DFD3]/75">
                <FaFileCode className="mx-auto mb-2 text-lg text-[#A8795D]" />
                <span>{sourceFiles.length > 0 ? `${sourceFiles.length} files selected` : "Choose source files"}</span>
                <input type="file" multiple onChange={(event) => setSourceFiles(Array.from(event.target.files ?? []))} className="hidden" />
              </label>
            </div>

            <div className="mt-4 grid gap-3">
              <input value={repositoryName} onChange={(event) => setRepositoryName(event.target.value)} placeholder="Repository name" className="rounded-lg border border-[#302A25]/10 bg-transparent px-3 py-2 text-sm outline-none placeholder:text-[#A09384]" />
              <textarea value={repositoryDescription} onChange={(event) => setRepositoryDescription(event.target.value)} placeholder="Repository description (optional)" className="min-h-20 resize-none rounded-lg border border-[#302A25]/10 bg-transparent px-3 py-2 text-sm outline-none placeholder:text-[#A09384]" />
            </div>

            {uploadPreview && (
              <div className="mt-4 rounded-xl border border-[#302A25]/10 bg-[#E8DFD3]/40 p-4">
                <p className="font-semibold text-[#302A25]">{uploadPreview.name}</p>
                <p className="mt-1 text-xs text-[#776B60]">{uploadPreview.fileCount} files · {uploadPreview.folderCount} folders · {uploadPreview.primaryLanguage} · {(uploadPreview.totalSize / 1024).toFixed(1)} KB</p>
                <div className="mt-3 max-h-32 overflow-y-auto text-xs text-[#776B60]">{uploadPreview.files.map((file) => <p key={file.relativePath} className="truncate">{file.relativePath}</p>)}</div>
              </div>
            )}

            {uploadError && <p role="alert" className="mt-3 text-xs text-[#B65F57]">{uploadError}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setShowSourceModal(false)} className="rounded-lg border border-[#302A25]/10 px-4 py-2 text-xs font-semibold text-[#776B60]">Cancel</button>
              {!pendingRepositoryId ? (
                <button type="button" onClick={handleSourceUpload} disabled={uploading} className="rounded-lg bg-[#A8795D] px-4 py-2 text-xs font-semibold text-white disabled:opacity-50">{uploading ? `Uploading ${uploadProgress}%…` : "Preview Repository"}</button>
              ) : (
                <button type="button" onClick={publishSourcePost} disabled={uploading} className="rounded-lg bg-[#A8795D] px-4 py-2 text-xs font-semibold text-white disabled:opacity-50">{uploading ? "Publishing…" : "Attach & Publish"}</button>
              )}
            </div>
          </div>
        </div>
      )}

      {!composerOnly && activeTab === "Network" && <NetworkTab />}

      {!composerOnly && activeTab !== "Network" && (filteredPosts.length > 0 ? (
        visiblePosts.map((post) => (
          <Thread
            key={post.id}
            post={post}
            onReviewSourceCode={onReviewSourceCode}
          />
        ))
      ) : (
        <div className="px-5 py-16 text-center">
          <p className="font-semibold text-[#302A25]">No posts yet</p>
          <p className="mt-2 text-sm text-[#A09384]">
            There are no posts in this feed right now.
          </p>
        </div>
      ))}
    </section>
  );
};

export default Timeline;
