"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { FaMagnifyingGlass, FaUserGroup, FaUserPlus } from "react-icons/fa6";

type Person = { id: string; username: string; display_name: string; bio: string; avatar_url: string | null; following: boolean; inMyNetwork: boolean; mutualCount: number; mutualNames: string[]; followersCount: number; followingCount: number };
type ResponseData = { people?: Person[]; followingCount?: number; followersCount?: number; error?: string };
type NetworkSection = "My Network" | "Discover People";

const NetworkTab = () => {
  const [people, setPeople] = useState<Person[]>([]);
  const [section, setSection] = useState<NetworkSection>("My Network");
  const [query, setQuery] = useState("");
  const [followingCount, setFollowingCount] = useState(0);
  const [followersCount, setFollowersCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async (search = query) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/network?q=${encodeURIComponent(search)}`, { cache: "no-store" });
      const result = await response.json() as ResponseData;
      if (!response.ok) throw new Error(result.error ?? "Network could not be loaded.");
      setPeople(result.people ?? []);
      setFollowingCount(result.followingCount ?? 0);
      setFollowersCount(result.followersCount ?? 0);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Network could not be loaded.");
    } finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, []);

  const visiblePeople = useMemo(() => section === "My Network" ? people.filter((person) => person.inMyNetwork) : people.filter((person) => !person.following), [people, section]);

  const toggleFollow = async (person: Person) => {
    const next = !person.following;
    setPeople((current) => current.map((item) => item.id === person.id ? { ...item, following: next, inMyNetwork: true } : item));
    const response = await fetch(`/api/profile/${encodeURIComponent(person.username)}/follow`, { method: next ? "POST" : "DELETE" });
    if (!response.ok) setPeople((current) => current.map((item) => item.id === person.id ? person : item));
    else void load();
  };

  return <div className="mt-5 border-t border-[#302A25]/10 px-5 py-6 sm:px-8">
    <div className="mx-auto max-w-3xl">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-bold text-[#302A25]">Network</h2><p className="mt-1 text-sm text-[#776B60]">Build meaningful connections with developers.</p></div><div className="flex gap-2 text-xs text-[#776B60]"><span className="rounded-full bg-[#E8DFD3] px-3 py-1.5">{followingCount} following</span><span className="rounded-full bg-[#E8DFD3] px-3 py-1.5">{followersCount} followers</span></div></div>
      <label className="mt-5 flex items-center gap-3 rounded-full border border-[#302A25]/10 bg-[#E8DFD3]/45 px-4 py-3"><FaMagnifyingGlass className="text-sm text-[#A8795D]" /><input value={query} onChange={(event) => { setQuery(event.target.value); void load(event.target.value); }} placeholder="Search people, usernames, or skills" className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[#A09384]" aria-label="Search Network" /></label>
      <nav className="mt-4 flex gap-2" aria-label="Network sections">{(["My Network", "Discover People"] as NetworkSection[]).map((item) => <button key={item} type="button" onClick={() => setSection(item)} className={`rounded-full px-4 py-2.5 text-xs font-semibold ${section === item ? "bg-[#302A25] text-[#F5F1EA]" : "bg-[#E8DFD3]/55 text-[#776B60]"}`}>{item}</button>)}</nav>
      {loading && <div className="setim-skeleton mt-5 h-28 rounded-2xl" />}
      {error && !loading && <div className="mt-5 rounded-2xl bg-[#E8DFD3]/60 p-6 text-center text-sm text-[#776B60]">{error}<button type="button" onClick={() => void load()} className="ml-3 font-semibold text-[#A8795D]">Retry</button></div>}
      {!loading && !error && visiblePeople.length === 0 && <div className="mt-5 rounded-2xl border border-[#302A25]/10 bg-[#E8DFD3]/25 px-6 py-14 text-center"><FaUserGroup className="mx-auto text-2xl text-[#A8795D]" /><h3 className="mt-4 font-bold text-[#302A25]">{section === "My Network" ? "Your network is empty" : "No people found"}</h3><p className="mt-2 text-sm text-[#776B60]">Try another search or discover someone new to follow.</p></div>}
      <div className="mt-5 grid gap-3 sm:grid-cols-2">{!loading && !error && visiblePeople.map((person) => <article key={person.id} className="setim-surface rounded-2xl p-4 transition hover:-translate-y-0.5"><div className="flex items-start gap-3"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#E8DFD3] font-bold text-[#776B60]">{person.display_name.charAt(0)}</div><div className="min-w-0 flex-1"><Link href={`/profile/${person.username}`} className="block truncate font-semibold text-[#302A25] hover:text-[#A8795D]">{person.display_name}</Link><p className="truncate text-xs text-[#A09384]">@{person.username}</p></div><button type="button" onClick={() => void toggleFollow(person)} className={`rounded-full px-3 py-2 text-xs font-semibold ${person.following ? "bg-[#E8DFD3] text-[#776B60]" : "bg-[#302A25] text-[#F5F1EA]"}`}>{person.following ? "Following" : <><FaUserPlus className="mr-1 inline" />Follow</>}</button></div><p className="mt-3 line-clamp-2 text-sm leading-5 text-[#776B60]">{person.bio || "Developer in the Setim community."}</p><div className="mt-4 flex flex-wrap gap-2 text-[11px] text-[#A09384]"><span>{person.followersCount} followers</span><span>·</span><span>{person.followingCount} following</span>{person.mutualCount > 0 && <><span>·</span><span className="text-[#A8795D]">{person.mutualCount} mutual</span></>}</div>{person.mutualNames.length > 0 && <p className="mt-2 truncate text-[11px] text-[#A09384]">Also followed by {person.mutualNames.join(", ")}</p>}<Link href="/messages" className="mt-4 inline-block text-xs font-semibold text-[#A8795D] hover:underline">Message</Link></article>)}</div>
    </div>
  </div>;
};

export default NetworkTab;
