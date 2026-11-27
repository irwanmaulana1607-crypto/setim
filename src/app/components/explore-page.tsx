"use client";

import { useEffect, useMemo, useState } from "react";
import { FaMagnifyingGlass, FaXmark } from "react-icons/fa6";
import Thread from "./thread";
import { POSTS, type FeedPost, type PostType, type ProjectData, type ProjectFile, type ProjectFolder, type Topic } from "./data";

type ExploreTab = "For You" | "Trending" | "Latest" | "People" | "Topics";

type ExploreProps = {
  onReviewSourceCode: (post: FeedPost, reviewCode?: boolean) => void;
};

type RemoteThread = {
  id: string;
  author_id: string;
  content: string;
  project_id: string | null;
  post_type?: PostType | null;
  created_at: string;
  repositories?: {
    id: string;
    owner_id: string;
    name: string;
    description: string;
    primary_language: string;
    repository_files: Array<{ relative_path: string; file_name: string; language: string }>;
  } | null;
  thread_topics?: Array<{ topics: Topic | null }>;
};

const buildProject = (repository: NonNullable<RemoteThread["repositories"]>): ProjectData => {
  const folders: ProjectFolder[] = [];
  const rootFiles: ProjectFile[] = [];

  repository.repository_files.forEach((repositoryFile) => {
    const parts = repositoryFile.relative_path.split("/").filter(Boolean);
    const file: ProjectFile = {
      name: repositoryFile.file_name,
      path: repositoryFile.relative_path,
      language: repositoryFile.language,
      content: "",
      repositoryId: repository.id,
    };

    if (parts.length === 1) {
      rootFiles.push(file);
      return;
    }

    let current = folders;
    let currentPath = "";
    parts.slice(0, -1).forEach((folderName) => {
      currentPath = currentPath ? `${currentPath}/${folderName}` : folderName;
      let folder = current.find((candidate) => candidate.path === currentPath);
      if (!folder) {
        folder = { name: folderName, path: currentPath, files: [], folders: [] };
        current.push(folder);
      }
      current = folder.folders ?? (folder.folders = []);
    });

    const parentPath = parts.slice(0, -1).join("/");
    const findFolder = (items: ProjectFolder[]): ProjectFolder | undefined => {
      for (const folder of items) {
        if (folder.path === parentPath) return folder;
        const nested = findFolder(folder.folders ?? []);
        if (nested) return nested;
      }
      return undefined;
    };
    findFolder(folders)?.files.push(file);
  });

  return {
    id: repository.id,
    remoteId: repository.id,
    name: repository.name,
    owner: repository.owner_id,
    description: repository.description,
    language: repository.primary_language,
    folders,
    rootFiles,
  };
};

const mapRemoteThread = (thread: RemoteThread): FeedPost => ({
  id: thread.id,
  name: "Setim member",
  username: thread.author_id.slice(0, 8),
  time: "recently",
  content: thread.content,
  scope: "Network",
  likes: 0,
  replies: 0,
  reposts: 0,
  createdAt: new Date(thread.created_at).getTime(),
  project: thread.repositories ? buildProject(thread.repositories) : undefined,
  projectId: thread.project_id ?? undefined,
  postType: thread.post_type ?? undefined,
  topics: thread.thread_topics?.flatMap((item) => item.topics ? [item.topics] : []),
});

const ExplorePage = ({ onReviewSourceCode }: ExploreProps) => {
  const [posts, setPosts] = useState<FeedPost[]>(POSTS);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<ExploreTab>("For You");
  const [topicFilter, setTopicFilter] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [followedUsers, setFollowedUsers] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch("/api/threads").then(async (response) => response.ok ? (await response.json() as { threads?: RemoteThread[] }).threads ?? [] : []),
      fetch("/api/topics").then(async (response) => response.ok ? (await response.json() as { topics?: Topic[] }).topics ?? [] : []),
    ])
      .then(([remoteThreads, remoteTopics]) => {
        if (cancelled) return;
        const remotePosts = remoteThreads.map(mapRemoteThread);
        setPosts([...remotePosts, ...POSTS.filter((post) => !remotePosts.some((remote) => remote.id === post.id))]);
        setTopics(remoteTopics);
      })
      .catch(() => {
        if (!cancelled) setError("Some Explore data could not be loaded. Showing available local content.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const topicCounts = useMemo(() => {
    const counts = new Map<string, { topic: Topic; count: number }>();
    posts.forEach((post) => post.topics?.forEach((topic) => {
      const current = counts.get(topic.id);
      counts.set(topic.id, { topic, count: (current?.count ?? 0) + 1 });
    }));
    topics.forEach((topic) => {
      if (!counts.has(topic.id)) counts.set(topic.id, { topic, count: 0 });
    });
    return [...counts.values()].sort((first, second) => second.count - first.count || first.topic.name.localeCompare(second.topic.name));
  }, [posts, topics]);

  const searchValue = query.trim().toLowerCase();
  const searchedPosts = posts.filter((post) => {
    const searchable = [post.content, post.name, post.username, post.project?.name, post.project?.language, ...(post.topics?.map((topic) => topic.name) ?? [])].filter(Boolean).join(" ").toLowerCase();
    const matchesQuery = !searchValue || searchable.includes(searchValue);
    const matchesTopic = !topicFilter || post.topics?.some((topic) => topic.slug === topicFilter);
    return matchesQuery && matchesTopic;
  });

  const visiblePosts = activeTab === "Trending"
    ? [...searchedPosts].sort((first, second) => (second.likes + second.reposts) - (first.likes + first.reposts))
    : activeTab === "Latest"
      ? [...searchedPosts].sort((first, second) => second.createdAt - first.createdAt)
      : searchedPosts;

  const people = [...new Map(posts.map((post) => [post.username, post])).values()].filter((post) => {
    if (!searchValue) return true;
    return `${post.name} ${post.username}`.toLowerCase().includes(searchValue);
  });
  const visibleTopics = topicCounts.filter(({ topic }) => !searchValue || `${topic.name} ${topic.slug}`.toLowerCase().includes(searchValue));

  const selectTopic = (topic: Topic) => {
    setTopicFilter(topic.slug);
    setQuery(topic.name);
    setActiveTab("For You");
  };

  return (
    <section className="min-w-0 flex-1">
      <header className="setim-page-header sticky top-0 z-20 bg-[#F5F1EA]/95 px-5 py-4 sm:px-8">
        <div className="flex items-center gap-3 rounded-full border border-[#302A25]/10 bg-[#E8DFD3]/45 px-4 py-3">
          <FaMagnifyingGlass className="shrink-0 text-[#A8795D]" aria-hidden="true" />
          <input value={query} onChange={(event) => { setQuery(event.target.value); setTopicFilter(null); }} placeholder="Search posts, people, topics, repositories, or languages" className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[#A09384]" aria-label="Search Explore" />
          {query && <button type="button" onClick={() => { setQuery(""); setTopicFilter(null); }} aria-label="Clear search" className="text-[#776B60] hover:text-[#A8795D]"><FaXmark /></button>}
        </div>
        <nav className="-mx-2 mt-4 flex overflow-x-auto" aria-label="Explore sections">
          {(["For You", "Trending", "Latest", "People", "Topics"] as ExploreTab[]).map((tab) => <button key={tab} type="button" onClick={() => setActiveTab(tab)} className={`relative shrink-0 px-4 py-3 text-sm font-semibold ${activeTab === tab ? "text-[#302A25]" : "text-[#A09384] hover:text-[#776B60]"}`}>{tab}{activeTab === tab && <span className="absolute inset-x-4 bottom-0 h-[3px] rounded-full bg-[#A8795D]" />}</button>)}
        </nav>
      </header>

      {error && <p role="status" className="mx-5 mt-4 rounded-lg bg-[#E8DFD3] px-4 py-3 text-xs text-[#776B60] sm:mx-8">{error}</p>}
      <div className="grid min-w-0 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="min-w-0">
          {loading && <p className="px-5 py-8 text-sm text-[#776B60] sm:px-8">Loading Explore…</p>}
          {!loading && activeTab === "People" && <div className="space-y-3 p-5 sm:p-8">{people.map((person) => { const isFollowed = followedUsers.has(person.username); return <div key={person.username} className="flex items-center gap-3 rounded-xl border border-[#302A25]/10 p-4"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#E8DFD3] font-semibold text-[#776B60]">{person.name.charAt(0)}</div><div className="min-w-0 flex-1"><a href="/profile" className="block truncate text-sm font-semibold text-[#302A25] hover:text-[#A8795D]">{person.name}</a><p className="truncate text-xs text-[#A09384]">@{person.username}</p></div><button type="button" onClick={() => setFollowedUsers((current) => { const next = new Set(current); if (next.has(person.username)) next.delete(person.username); else next.add(person.username); return next; })} className={`rounded-full px-3 py-2 text-xs font-semibold ${isFollowed ? "bg-[#E8DFD3] text-[#776B60]" : "bg-[#302A25] text-[#F5F1EA]"}`}>{isFollowed ? "Following" : "Follow"}</button></div>; })}</div>}
          {!loading && activeTab === "Topics" && <div className="space-y-3 p-5 sm:p-8">{visibleTopics.map(({ topic, count }) => <button key={topic.id} type="button" onClick={() => selectTopic(topic)} className="block w-full rounded-xl border border-[#302A25]/10 p-4 text-left hover:bg-[#E8DFD3]/45"><p className="font-semibold text-[#302A25]">#{topic.name}</p><p className="mt-1 text-xs text-[#A09384]">{count} {count === 1 ? "discussion" : "discussions"}</p></button>)}</div>}
          {!loading && activeTab !== "People" && activeTab !== "Topics" && visiblePosts.map((post) => <Thread key={post.id} post={post} onReviewSourceCode={onReviewSourceCode} />)}
          {!loading && ((activeTab === "People" && people.length === 0) || (activeTab === "Topics" && visibleTopics.length === 0) || (activeTab !== "People" && activeTab !== "Topics" && visiblePosts.length === 0)) && <p className="px-5 py-16 text-center text-sm text-[#776B60] sm:px-8">No Explore results found.</p>}
        </div>
        <aside className="hidden border-l border-[#302A25]/10 p-5 lg:block"><h2 className="text-base font-bold text-[#302A25]">Trending topics</h2><div className="mt-4 space-y-1">{topicCounts.slice(0, 6).map(({ topic, count }) => <button key={topic.id} type="button" onClick={() => selectTopic(topic)} className="block w-full rounded-lg px-3 py-3 text-left hover:bg-[#E8DFD3]/50"><p className="text-sm font-semibold text-[#302A25]">#{topic.name}</p><p className="mt-1 text-xs text-[#A09384]">{count} discussions</p></button>)}</div></aside>
      </div>
    </section>
  );
};

export default ExplorePage;
