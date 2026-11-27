"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FaArrowLeft, FaLock, FaPeopleGroup, FaPlus, FaUsers } from "react-icons/fa6";

type Community = { id: string; name: string; slug: string; description: string; category: string; topics: string[]; privacy: "public" | "private"; created_by: string; created_at: string; member_count: number; membership?: { role: string } | null; join_request?: { status: string } | null; members?: Array<{ user_id: string; role: string; joined_at: string }> };
type Tab = "Discover" | "Joined" | "Your Communities";

const categories = ["All", "Web Development", "Mobile Development", "Artificial Intelligence", "Data Science", "Cybersecurity", "UI/UX Design", "Open Source", "Programming"];

const CommunitiesPage = () => {
  const [communities, setCommunities] = useState<Community[]>([]);
  const [selected, setSelected] = useState<Community | null>(null);
  const [tab, setTab] = useState<Tab>("Discover");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ name: "", slug: "", description: "", category: "Programming", privacy: "public" });

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const params = new URLSearchParams({ q: query });
      if (category !== "All") params.set("category", category);
      if (tab === "Joined") params.set("joined", "true");
      const response = await fetch(`/api/communities?${params.toString()}`, { cache: "no-store" });
      const result = await response.json() as { communities?: Community[]; error?: string };
      if (!response.ok) throw new Error(result.error ?? "Communities could not be loaded.");
      let next = result.communities ?? [];
      if (tab === "Your Communities") next = next.filter((community) => community.membership?.role === "owner");
      setCommunities(next);
    } catch (loadError) { setError(loadError instanceof Error ? loadError.message : "Communities could not be loaded."); }
    finally { setLoading(false); }
  }, [category, query, tab]);

  useEffect(() => { void load(); }, [load]);

  const createCommunity = async (event: React.FormEvent) => {
    event.preventDefault(); setError(null);
    const response = await fetch("/api/communities", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const result = await response.json() as { error?: string };
    if (!response.ok) { setError(result.error ?? "Community could not be created."); return; }
    setCreateOpen(false); setForm({ name: "", slug: "", description: "", category: "Programming", privacy: "public" }); void load();
  };

  const openCommunity = async (community: Community) => {
    const response = await fetch(`/api/communities/${community.id}`);
    const result = await response.json() as { community?: Community; error?: string };
    if (response.ok && result.community) setSelected(result.community); else setError(result.error ?? "Community could not be loaded.");
  };

  const changeMembership = async (action: "join" | "leave" | "request" | "cancel") => {
    if (!selected) return;
    const response = await fetch(`/api/communities/${selected.id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
    const result = await response.json() as { error?: string };
    if (!response.ok) { setError(result.error ?? "Membership update failed."); return; }
    await openCommunity(selected); void load();
  };

  const filtered = useMemo(() => communities, [communities]);

  if (selected) return <CommunityDetail community={selected} onBack={() => setSelected(null)} onMembership={changeMembership} />;

  return <section className="min-w-0 flex-1"><header className="border-b border-[#302A25]/10 px-5 py-6 sm:px-8"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-widest text-[#A8795D]">Setim</p><h1 className="mt-1 text-2xl font-bold">Communities</h1><p className="mt-2 text-sm text-[#776B60]">Find your people, share ideas, and build together.</p></div><button type="button" onClick={() => setCreateOpen(true)} className="inline-flex shrink-0 items-center gap-2 rounded-full bg-[#302A25] px-4 py-2.5 text-xs font-semibold text-[#F5F1EA]"><FaPlus /> Create</button></div><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search communities" className="mt-6 w-full rounded-full border border-[#302A25]/10 bg-[#E8DFD3]/40 px-4 py-3 text-sm outline-none placeholder:text-[#A09384]" /><nav className="-mx-2 mt-4 flex overflow-x-auto">{(["Discover", "Joined", "Your Communities"] as Tab[]).map((item) => <button key={item} type="button" onClick={() => setTab(item)} className={`relative shrink-0 px-4 py-3 text-sm font-semibold ${tab === item ? "text-[#302A25]" : "text-[#A09384]"}`}>{item}{tab === item && <span className="absolute inset-x-4 bottom-0 h-[3px] rounded-full bg-[#A8795D]" />}</button>)}</nav></header><div className="border-b border-[#302A25]/10 px-5 py-3 sm:px-8"><div className="flex gap-2 overflow-x-auto">{categories.map((item) => <button key={item} type="button" onClick={() => setCategory(item)} className={`shrink-0 rounded-full px-3 py-1.5 text-xs ${category === item ? "bg-[#A8795D] text-white" : "bg-[#E8DFD3]/60 text-[#776B60]"}`}>{item}</button>)}</div></div>{createOpen && <form onSubmit={createCommunity} className="mx-5 mt-5 rounded-2xl border border-[#302A25]/10 bg-[#E8DFD3]/30 p-5 sm:mx-8"><h2 className="text-lg font-bold">Create Community</h2><div className="mt-4 grid gap-3 sm:grid-cols-2"><input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Community name" className="rounded-lg border border-[#302A25]/10 bg-[#F5F1EA] px-3 py-2 text-sm outline-none" /><input required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" value={form.slug} onChange={(event) => setForm({ ...form, slug: event.target.value })} placeholder="slug" className="rounded-lg border border-[#302A25]/10 bg-[#F5F1EA] px-3 py-2 text-sm outline-none" /><textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Description" className="min-h-24 rounded-lg border border-[#302A25]/10 bg-[#F5F1EA] px-3 py-2 text-sm outline-none sm:col-span-2" /><select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} className="rounded-lg border border-[#302A25]/10 bg-[#F5F1EA] px-3 py-2 text-sm"><option>Programming</option><option>Web Development</option><option>Artificial Intelligence</option><option>Data Science</option><option>Cybersecurity</option><option>Open Source</option></select><select value={form.privacy} onChange={(event) => setForm({ ...form, privacy: event.target.value })} className="rounded-lg border border-[#302A25]/10 bg-[#F5F1EA] px-3 py-2 text-sm"><option value="public">Public</option><option value="private">Private</option></select></div><div className="mt-4 flex gap-2"><button type="submit" className="rounded-full bg-[#302A25] px-4 py-2 text-xs font-semibold text-[#F5F1EA]">Create community</button><button type="button" onClick={() => setCreateOpen(false)} className="rounded-full bg-[#E8DFD3] px-4 py-2 text-xs font-semibold text-[#776B60]">Cancel</button></div></form>}{error && <div className="mx-5 mt-5 rounded-lg bg-[#E8DFD3] px-4 py-3 text-sm text-[#776B60] sm:mx-8">{error}<button type="button" onClick={() => void load()} className="ml-3 font-semibold text-[#A8795D]">Retry</button></div>}{loading && <div className="space-y-3 p-5 sm:p-8">{[1, 2, 3].map((item) => <div key={item} className="h-32 animate-pulse rounded-2xl bg-[#E8DFD3]/60" />)}</div>}{!loading && !error && filtered.length === 0 && <p className="px-5 py-16 text-center text-sm text-[#776B60]">No communities found.</p>}<div className="grid gap-4 p-5 sm:p-8 md:grid-cols-2">{filtered.map((community) => <button key={community.id} type="button" onClick={() => void openCommunity(community)} className="rounded-2xl border border-[#302A25]/10 bg-[#E8DFD3]/25 p-5 text-left hover:bg-[#E8DFD3]/50"><div className="flex items-start justify-between gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#E8DFD3] text-[#A8795D]"><FaPeopleGroup /></span>{community.privacy === "private" && <FaLock className="text-sm text-[#A09384]" />}</div><h2 className="mt-4 text-lg font-bold">{community.name}</h2><p className="text-xs text-[#A8795D]">@{community.slug}</p><p className="mt-3 line-clamp-2 text-sm leading-5 text-[#776B60]">{community.description || "No description provided."}</p><p className="mt-4 text-xs text-[#A09384]">{community.member_count} members · {community.category}</p><span className="mt-4 inline-block rounded-full bg-[#302A25] px-3 py-1.5 text-[10px] font-semibold text-[#F5F1EA]">{community.membership ? "Joined" : community.privacy === "private" ? "Request to join" : "Join"}</span></button>)}</div></section>;
};

const CommunityDetail = ({ community, onBack, onMembership }: { community: Community; onBack: () => void; onMembership: (action: "join" | "leave" | "request" | "cancel") => void }) => {
  const [detailTab, setDetailTab] = useState<"About" | "Posts" | "Members">("About");
  const membership = community.membership;
  const requested = community.join_request?.status === "pending";
  return <section className="min-w-0 flex-1"><header className="border-b border-[#302A25]/10 px-5 py-6 sm:px-8"><button type="button" onClick={onBack} className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-[#776B60]"><FaArrowLeft /> Back to communities</button><div className="flex items-start gap-4"><span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#E8DFD3] text-xl text-[#A8795D]"><FaPeopleGroup /></span><div className="min-w-0 flex-1"><p className="text-xs text-[#A8795D]">@{community.slug}</p><h1 className="text-2xl font-bold">{community.name}</h1><p className="mt-2 text-sm leading-6 text-[#776B60]">{community.description || "No description provided."}</p><p className="mt-3 text-xs text-[#A09384]">{community.member_count} members · {community.category} · {community.privacy}</p></div><button type="button" onClick={() => void onMembership(membership ? "leave" : community.privacy === "private" ? (requested ? "cancel" : "request") : "join")} className="shrink-0 rounded-full bg-[#302A25] px-4 py-2 text-xs font-semibold text-[#F5F1EA]">{membership ? "Leave" : requested ? "Cancel request" : community.privacy === "private" ? "Request to join" : "Join"}</button></div></header><nav className="flex overflow-x-auto border-b border-[#302A25]/10 px-5 sm:px-8">{(["About", "Posts", "Members"] as const).map((item) => <button key={item} type="button" onClick={() => setDetailTab(item)} className={`shrink-0 px-4 py-4 text-sm font-semibold ${detailTab === item ? "border-b-2 border-[#A8795D] text-[#302A25]" : "text-[#A09384]"}`}>{item}</button>)}</nav><div className="p-5 sm:p-8">{detailTab === "About" && <><h2 className="text-lg font-bold">About this community</h2><p className="mt-3 text-sm leading-6 text-[#776B60]">Created {new Date(community.created_at).toLocaleDateString()} · {community.member_count} members</p>{community.topics.length > 0 && <div className="mt-4 flex flex-wrap gap-2">{community.topics.map((topic) => <span key={topic} className="rounded-full bg-[#E8DFD3] px-3 py-1 text-xs text-[#776B60]">#{topic}</span>)}</div>}</>}{detailTab === "Posts" && <p className="py-12 text-center text-sm text-[#776B60]">No community posts yet.</p>}{detailTab === "Members" && <div className="space-y-3">{(community.members ?? []).map((member) => <div key={member.user_id} className="flex items-center gap-3 rounded-xl border border-[#302A25]/10 p-3"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#E8DFD3] text-sm font-semibold text-[#776B60]">S</span><div><p className="text-sm font-semibold">Setim member</p><p className="text-xs text-[#A09384]">@{member.user_id.slice(0, 8)} · {member.role}</p></div></div>)}</div>}</div></section>;
};

export default CommunitiesPage;
