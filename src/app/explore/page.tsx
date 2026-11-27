"use client";

import { useState } from "react";
import LeftSidebar from "../components/leftsidebar";
import ExplorePage from "../components/explore-page";
import Timeline from "../components/timeline";
import Workspace from "../components/workspace/workspace";
import type { FeedPost } from "../components/data";

const ExploreRoute = () => {
  const [selectedPost, setSelectedPost] = useState<FeedPost | null>(null);
  const [reviewCode, setReviewCode] = useState(true);
  const [composerOpen, setComposerOpen] = useState(false);

  const openWorkspace = (post: FeedPost, shouldReviewCode = true) => {
    if (!post.project) return;
    setSelectedPost(post);
    setReviewCode(shouldReviewCode);
  };

  const closeWorkspace = () => setSelectedPost(null);

  return (
    <div className="min-h-screen w-full bg-[#F5F1EA] text-[#302A25]">
      <div className="mx-auto flex min-h-screen max-w-screen-2xl">
        <LeftSidebar onCreatePost={() => setComposerOpen(true)} />
        <main className="flex h-dvh min-w-0 flex-1 overflow-hidden">
          <div className={`min-w-0 ${selectedPost ? "h-full w-full overflow-y-auto md:w-[52%] md:flex-none" : "w-full flex-1 overflow-y-auto"}`}>
            <ExplorePage onReviewSourceCode={openWorkspace} />
            <Timeline composerOnly composerOpen={composerOpen} onCloseComposer={() => setComposerOpen(false)} onReviewSourceCode={() => undefined} />
          </div>
          {selectedPost?.project && <aside className="fixed inset-0 z-40 flex min-h-0 flex-col border-l border-[#302A25]/10 bg-[#F5F1EA] md:static md:h-full md:w-[48%] md:shrink-0"><Workspace key={selectedPost.project.id} project={selectedPost.project} onClose={closeWorkspace} reviewCode={reviewCode} /></aside>}
        </main>
      </div>
    </div>
  );
};

export default ExploreRoute;
