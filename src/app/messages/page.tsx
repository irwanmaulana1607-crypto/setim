"use client";

import { useState } from "react";
import LeftSidebar from "../components/leftsidebar";
import MessagesPage from "../components/messages-page";
import Timeline from "../components/timeline";

const MessagesRoute = () => {
  const [composerOpen, setComposerOpen] = useState(false);
  return (
  <div className="min-h-screen w-full bg-[#F5F1EA] text-[#302A25]">
    <div className="mx-auto flex min-h-screen max-w-screen-2xl">
      <LeftSidebar onCreatePost={() => setComposerOpen(true)} />
      <main className="flex h-dvh min-w-0 w-full flex-1 overflow-hidden">
        <MessagesPage />
        <Timeline composerOnly composerOpen={composerOpen} onCloseComposer={() => setComposerOpen(false)} onReviewSourceCode={() => undefined} />
      </main>
    </div>
  </div>
  );
};

export default MessagesRoute;
