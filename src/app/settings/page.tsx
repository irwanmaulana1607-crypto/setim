"use client";

import { useState } from "react";
import LeftSidebar from "../components/leftsidebar";
import SettingsPage from "../components/settings-page";
import Timeline from "../components/timeline";

const SettingsRoute = () => { const [composerOpen, setComposerOpen] = useState(false); return <div className="min-h-screen w-full bg-[#F5F1EA] text-[#302A25]"><div className="mx-auto flex min-h-screen max-w-screen-2xl"><LeftSidebar onCreatePost={() => setComposerOpen(true)} /><main className="flex h-dvh min-w-0 w-full flex-1 overflow-y-auto"><SettingsPage /><Timeline composerOnly composerOpen={composerOpen} onCloseComposer={() => setComposerOpen(false)} onReviewSourceCode={() => undefined} /></main></div></div>; };

export default SettingsRoute;
