"use client";

import { useCallback, useEffect, useState } from "react";
import LeftSidebar from "../components/leftsidebar";
import BookmarksPage from "../components/bookmarks-page";
import Timeline from "../components/timeline";
import Workspace from "../components/workspace/workspace";
import type { FeedPost } from "../components/data";

type BookmarkRecord = { bookmarkId: string; bookmarkedAt: string; post: FeedPost };

const BookmarksRoute = () => {
  const [bookmarks, setBookmarks] = useState<BookmarkRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPost, setSelectedPost] = useState<FeedPost | null>(null);
  const [reviewCode, setReviewCode] = useState(true);
  const [composerOpen, setComposerOpen] = useState(false);

  const loadBookmarks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/bookmarks", { cache: "no-store" });
      const result = await response.json() as { bookmarks?: BookmarkRecord[]; error?: string };
      if (!response.ok) throw new Error(result.error ?? "Bookmarks could not be loaded.");
      setBookmarks(result.bookmarks ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Bookmarks could not be loaded.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void loadBookmarks(); }, [loadBookmarks]);

  const openWorkspace = (post: FeedPost, shouldReviewCode = true) => {
    if (!post.project) return;
    setSelectedPost(post);
    setReviewCode(shouldReviewCode);
  };

  const onBookmarkChange = (threadId: string, bookmarked: boolean) => {
    if (!bookmarked) setBookmarks((current) => current.filter((bookmark) => bookmark.post.id !== threadId));
  };

  return (
    <div className="min-h-screen w-full bg-[#F5F1EA] text-[#302A25]">
      <div className="mx-auto flex min-h-screen max-w-screen-2xl">
        <LeftSidebar onCreatePost={() => setComposerOpen(true)} />
        <main className="flex h-dvh min-w-0 w-full flex-1 overflow-hidden">
          <div className={`${selectedPost ? "h-full w-full overflow-y-auto md:w-[52%] md:flex-none" : "w-full flex-1 overflow-y-auto"}`}>
            <BookmarksPage bookmarks={bookmarks} loading={loading} error={error} onRetry={() => void loadBookmarks()} onReviewSourceCode={openWorkspace} onBookmarkChange={onBookmarkChange} />
            <Timeline composerOnly composerOpen={composerOpen} onCloseComposer={() => setComposerOpen(false)} onReviewSourceCode={() => undefined} />
          </div>
          {selectedPost?.project && <aside className="fixed inset-0 z-40 flex min-h-0 flex-col border-l border-[#302A25]/10 bg-[#F5F1EA] md:static md:h-full md:w-[48%] md:shrink-0"><Workspace key={selectedPost.project.id} project={selectedPost.project} onClose={() => setSelectedPost(null)} reviewCode={reviewCode} /></aside>}
        </main>
      </div>
    </div>
  );
};

export default BookmarksRoute;
