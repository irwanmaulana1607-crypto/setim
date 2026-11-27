
"use client";

import { useState } from "react";
import LeftSidebar from "./components/leftsidebar";
import Timeline from "./components/timeline";
import Workspace from "./components/workspace/workspace";
import type { FeedPost } from "./components/data";

const Home = () => {
  const [activeWorkspace, setActiveWorkspace] = useState(false);
  const [selectedThread, setSelectedThread] = useState<FeedPost | null>(null);
  const [reviewCode, setReviewCode] = useState(true);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);

  const openWorkspace = (post: FeedPost, reviewCode = true) => {
    if (!post.project?.id || !post.project.name) {
      setWorkspaceError("This post does not have a valid repository to review.");
      return;
    }

    setWorkspaceError(null);
    setSelectedThread(post);
    setReviewCode(reviewCode);
    setActiveWorkspace(true);
  };

  const closeWorkspace = () => {
    setActiveWorkspace(false);
    setSelectedThread(null);
    setReviewCode(true);
  };

  return (
    <div className="min-h-screen w-full bg-[#F5F1EA] text-[#302A25]">
      <div className="mx-auto flex min-h-screen max-w-screen-2xl">
        <LeftSidebar onCreatePost={() => setComposerOpen(true)} />

        <main className="flex h-dvh min-w-0 flex-1 overflow-hidden">
          {workspaceError && (
            <p role="alert" className="absolute left-20 top-4 z-30 rounded-lg bg-[#E8DFD3] px-3 py-2 text-xs text-[#776B60]">
              {workspaceError}
            </p>
          )}
          <div
            className={`min-w-0 ${
              activeWorkspace
                ? "h-full w-full overflow-y-scroll md:w-[42%] md:flex-none lg:w-[52%]"
                : "h-full w-full flex-1 overflow-y-scroll"
            }`}
          >
            <Timeline onReviewSourceCode={openWorkspace} composerOpen={composerOpen} onCloseComposer={() => setComposerOpen(false)} />
          </div>

          {activeWorkspace && selectedThread?.project && (
            <aside className="fixed inset-0 z-40 flex min-h-0 flex-col border-l border-[#302A25]/10 bg-[#F5F1EA] md:static md:h-full md:w-[58%] md:shrink-0 lg:w-[48%]">
              <Workspace
                key={selectedThread.project.id}
                project={selectedThread.project}
                onClose={closeWorkspace}
                reviewCode={reviewCode}
              />
            </aside>
          )}
        </main>
      </div>
    </div>
  );
};

export default Home;
