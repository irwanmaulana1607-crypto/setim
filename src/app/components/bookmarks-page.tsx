"use client";

import { useMemo, useState } from "react";
import { FaBookmark } from "react-icons/fa6";
import Thread from "./thread";
import type { FeedPost } from "./data";

type BookmarkRecord = { bookmarkId: string; bookmarkedAt: string; post: FeedPost };
type BookmarksTab = "All" | "Posts" | "Projects";

type BookmarksPageProps = {
  bookmarks: BookmarkRecord[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onReviewSourceCode: (post: FeedPost, reviewCode?: boolean) => void;
  onBookmarkChange: (threadId: string, bookmarked: boolean) => void;
};

const BookmarksPage = ({ bookmarks, loading, error, onRetry, onReviewSourceCode, onBookmarkChange }: BookmarksPageProps) => {
  const [tab, setTab] = useState<BookmarksTab>("All");
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => bookmarks.filter((bookmark) => {
    const post = bookmark.post;
    const matchesTab = tab === "All" || (tab === "Projects" ? Boolean(post.project) : !post.project);
    const value = `${post.content} ${post.name} ${post.username} ${post.project?.name ?? ""}`.toLowerCase();
    return matchesTab && value.includes(query.toLowerCase());
  }), [bookmarks, query, tab]);

  return (
    <section className="min-w-0 flex-1">
      <header className="setim-page-header sticky top-0 z-20 bg-[#F5F1EA]/95 px-5 py-4 sm:px-8">
        <p className="text-xs font-bold uppercase tracking-widest text-[#A8795D]">Setim</p>
        <h1 className="mt-1 text-xl font-bold text-[#302A25]">Bookmarks</h1>
        <p className="mt-1 text-sm text-[#776B60]">Your saved posts and projects.</p>
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search bookmarks" className="mt-4 w-full rounded-full border border-[#302A25]/10 bg-[#E8DFD3]/40 px-4 py-3 text-sm outline-none placeholder:text-[#A09384]" />
        <nav className="-mx-2 mt-3 flex overflow-x-auto" aria-label="Bookmark filters">
          {(["All", "Posts", "Projects"] as BookmarksTab[]).map((item) => <button key={item} type="button" onClick={() => setTab(item)} className={`relative shrink-0 px-4 py-3 text-sm font-semibold ${tab === item ? "text-[#302A25]" : "text-[#A09384]"}`}>{item}{tab === item && <span className="absolute inset-x-4 bottom-0 h-[3px] rounded-full bg-[#A8795D]" />}</button>)}
        </nav>
      </header>
      {loading && <div className="space-y-3 p-5 sm:p-8">{[1, 2, 3].map((item) => <div key={item} className="setim-skeleton h-28 rounded-xl bg-[#E8DFD3]/60" />)}</div>}
      {!loading && error && <div className="px-5 py-16 text-center sm:px-8"><p role="alert" className="text-sm text-[#776B60]">{error}</p><button type="button" onClick={onRetry} className="mt-4 rounded-full bg-[#302A25] px-4 py-2 text-xs font-semibold text-[#F5F1EA]">Retry</button></div>}
      {!loading && !error && bookmarks.length === 0 && <div className="flex flex-col items-center px-6 py-20 text-center"><FaBookmark className="text-2xl text-[#A8795D]" /><h2 className="mt-4 text-lg font-bold">Save posts for later</h2><p className="mt-2 max-w-sm text-sm leading-6 text-[#776B60]">Bookmark posts and projects to easily find them again.</p></div>}
      {!loading && !error && bookmarks.length > 0 && filtered.length === 0 && <p className="px-5 py-16 text-center text-sm text-[#776B60]">No bookmarks found.</p>}
      {!loading && !error && filtered.map((bookmark) => <Thread key={bookmark.bookmarkId} post={bookmark.post} onReviewSourceCode={onReviewSourceCode} onBookmarkChange={onBookmarkChange} />)}
    </section>
  );
};

export default BookmarksPage;
