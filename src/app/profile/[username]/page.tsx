"use client";

import { use, useState } from "react";
import LeftSidebar from "../../components/leftsidebar";
import ProfilePage from "../../components/profile-page";
import Timeline from "../../components/timeline";
import Workspace from "../../components/workspace/workspace";
import type { FeedPost } from "../../components/data";

const ProfileRoute = ({ params }: { params: Promise<{ username: string }> }) => {
  const { username } = use(params);
  const [selectedPost, setSelectedPost] = useState<FeedPost | null>(null);
  const [reviewCode, setReviewCode] = useState(true);
  const [composerOpen, setComposerOpen] = useState(false);
  return <div className="min-h-screen w-full bg-[#F5F1EA] text-[#302A25]"><div className="mx-auto flex min-h-screen max-w-screen-2xl"><LeftSidebar onCreatePost={() => setComposerOpen(true)} /><main className="flex h-dvh min-w-0 w-full flex-1 overflow-hidden"><div className={`${selectedPost ? "h-full w-full overflow-y-auto md:w-[52%] md:flex-none" : "w-full flex-1 overflow-y-auto"}`}><ProfilePage username={username} onReviewSourceCode={(post, code = true) => { setSelectedPost(post); setReviewCode(code); }} /></div><Timeline composerOnly composerOpen={composerOpen} onCloseComposer={() => setComposerOpen(false)} onReviewSourceCode={() => undefined} />{selectedPost?.project && <aside className="fixed inset-0 z-40 flex min-h-0 flex-col border-l border-[#302A25]/10 bg-[#F5F1EA] md:static md:h-full md:w-[48%] md:shrink-0"><Workspace project={selectedPost.project} onClose={() => setSelectedPost(null)} reviewCode={reviewCode} /></aside>}</main></div></div>;
};

export default ProfileRoute;
