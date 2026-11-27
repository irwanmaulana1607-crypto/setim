import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type BookmarkProjectFile = {
  relative_path: string;
  file_name: string;
  language: string;
};

type BookmarkThread = {
  id: string;
  author_id: string;
  content: string;
  project_id: string | null;
  post_type: "discussion" | "question" | "project_showcase" | "tutorial" | "announcement" | null;
  created_at: string;
  repositories: { id: string; owner_id: string; name: string; description: string; primary_language: string; repository_files: BookmarkProjectFile[] } | null;
  thread_links: Array<{ url: string; title: string; description: string; thumbnail_url: string | null; domain: string }>;
  thread_snippets: Array<{ language: string; code: string }>;
  thread_topics: Array<{ topics: { id: string; name: string; slug: string } | null }>;
};

const getClientUser = async () => {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  return { supabase, user };
};

const buildProject = (repository: NonNullable<BookmarkThread["repositories"]>) => {
  const folders: Array<{ name: string; path: string; files: Array<{ name: string; path: string; language: string; content: string; repositoryId: string }>; folders: Array<unknown> }> = [];
  const rootFiles: Array<{ name: string; path: string; language: string; content: string; repositoryId: string }> = [];
  repository.repository_files.forEach((repositoryFile) => {
    const parts = repositoryFile.relative_path.split("/").filter(Boolean);
    const file = { name: repositoryFile.file_name, path: repositoryFile.relative_path, language: repositoryFile.language, content: "", repositoryId: repository.id };
    if (parts.length === 1) { rootFiles.push(file); return; }
    let current = folders;
    let currentPath = "";
    parts.slice(0, -1).forEach((folderName) => {
      currentPath = currentPath ? `${currentPath}/${folderName}` : folderName;
      let folder = current.find((candidate) => candidate.path === currentPath);
      if (!folder) { folder = { name: folderName, path: currentPath, files: [], folders: [] }; current.push(folder); }
      current = folder.folders as typeof folders;
    });
    const parentPath = parts.slice(0, -1).join("/");
    const findFolder = (items: typeof folders): (typeof folders)[number] | undefined => {
      for (const folder of items) { if (folder.path === parentPath) return folder; const nested = findFolder(folder.folders as typeof folders); if (nested) return nested; }
      return undefined;
    };
    findFolder(folders)?.files.push(file);
  });
  return { id: repository.id, remoteId: repository.id, name: repository.name, owner: repository.owner_id, description: repository.description, language: repository.primary_language, folders, rootFiles };
};

const mapBookmark = (row: { id: string; created_at: string; threads: BookmarkThread | BookmarkThread[] | null }) => {
  const thread = Array.isArray(row.threads) ? row.threads[0] : row.threads;
  if (!thread) return null;
  const link = thread.thread_links?.[0];
  const snippet = thread.thread_snippets?.[0];
  return {
    bookmarkId: row.id,
    bookmarkedAt: row.created_at,
    post: {
      id: thread.id, name: "Setim member", username: thread.author_id.slice(0, 8), time: "saved", content: thread.content,
      scope: "Following" as const, likes: 0, replies: 0, reposts: 0, createdAt: new Date(thread.created_at).getTime(),
      project: thread.repositories ? buildProject(thread.repositories) : undefined, projectId: thread.project_id ?? undefined,
      postType: thread.post_type ?? undefined,
      linkPreview: link ? { url: link.url, title: link.title, description: link.description, thumbnail: link.thumbnail_url ?? "", domain: link.domain } : undefined,
      snippet: snippet ? { language: snippet.language, code: snippet.code } : undefined,
      topics: thread.thread_topics?.flatMap((item) => item.topics ? [item.topics] : []),
    },
  };
};

export async function GET(request: Request) {
  try {
    const { supabase, user } = await getClientUser();
    if (!user) return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
    const threadId = new URL(request.url).searchParams.get("threadId");
    if (threadId) {
      const { data } = await supabase.from("bookmarks").select("id").eq("user_id", user.id).eq("thread_id", threadId).maybeSingle();
      return NextResponse.json({ bookmarked: Boolean(data) });
    }
    const { data, error } = await supabase.from("bookmarks").select("id, created_at, threads(id, author_id, content, project_id, post_type, created_at, repositories(id, owner_id, name, description, primary_language, repository_files(relative_path, file_name, language)), thread_links(url, title, description, thumbnail_url, domain), thread_snippets(language, code), thread_topics(topics(id, name, slug)))").eq("user_id", user.id).order("created_at", { ascending: false });
    if (error) return NextResponse.json({ error: "Bookmarks could not be loaded." }, { status: 500 });
    return NextResponse.json({ bookmarks: (data ?? []).map(mapBookmark).filter(Boolean) });
  } catch { return NextResponse.json({ error: "Bookmark service is unavailable." }, { status: 500 }); }
}

export async function POST(request: Request) {
  try {
    const { supabase, user } = await getClientUser();
    if (!user) return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
    const body = await request.json() as { threadId?: string };
    if (!body.threadId) return NextResponse.json({ error: "A thread id is required." }, { status: 400 });
    const { error } = await supabase.from("bookmarks").insert({ user_id: user.id, thread_id: body.threadId });
    if (error && error.code !== "23505") return NextResponse.json({ error: "Bookmark could not be saved." }, { status: 400 });
    return NextResponse.json({ bookmarked: true });
  } catch { return NextResponse.json({ error: "Bookmark could not be saved." }, { status: 500 }); }
}

export async function DELETE(request: Request) {
  try {
    const { supabase, user } = await getClientUser();
    if (!user) return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
    const threadId = new URL(request.url).searchParams.get("threadId");
    if (!threadId) return NextResponse.json({ error: "A thread id is required." }, { status: 400 });
    const { error } = await supabase.from("bookmarks").delete().eq("user_id", user.id).eq("thread_id", threadId);
    if (error) return NextResponse.json({ error: "Bookmark could not be removed." }, { status: 400 });
    return NextResponse.json({ bookmarked: false });
  } catch { return NextResponse.json({ error: "Bookmark could not be removed." }, { status: 500 }); }
}
