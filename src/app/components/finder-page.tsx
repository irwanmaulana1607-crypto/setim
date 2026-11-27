"use client";

import { useState } from "react";
import { FaArrowRight, FaBookOpen, FaClock, FaPeopleGroup, FaUserGroup } from "react-icons/fa6";

type FinderSection = "Overview" | "Study Partner" | "Competition Teams" | "Invitations" | "History";

const sections: Array<{ label: FinderSection; description: string; icon: typeof FaUserGroup }> = [
  { label: "Overview", description: "Your matching workspace", icon: FaUserGroup },
  { label: "Study Partner", description: "Find a compatible study partner", icon: FaBookOpen },
  { label: "Competition Teams", description: "Build a team around required skills", icon: FaPeopleGroup },
  { label: "Invitations", description: "Manage collaboration invitations", icon: FaArrowRight },
  { label: "History", description: "Review previous matching activity", icon: FaClock },
];

const FinderPage = () => {
  const [section, setSection] = useState<FinderSection>("Overview");
  const [courses, setCourses] = useState("");
  const [skills, setSkills] = useState("");
  const [objectives, setObjectives] = useState("");
  const [submitted, setSubmitted] = useState(false);

  return <main className="min-h-dvh bg-[#F5F1EA] px-5 pb-32 pt-8 text-[#302A25] sm:px-8">
    <div className="mx-auto max-w-6xl">
      <header className="max-w-2xl"><p className="text-xs font-bold uppercase tracking-[0.2em] text-[#A8795D]">Setim Finder</p><h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Find people to learn and build with.</h1><p className="mt-4 text-sm leading-6 text-[#776B60]">Finder helps you discover study partners and competition teammates using the academic information you choose to share.</p></header>

      <div className="mt-8 grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        <nav aria-label="Finder sections" className="flex gap-2 overflow-x-auto lg:block lg:space-y-2">
          {sections.map(({ label, description, icon: Icon }) => <button key={label} type="button" onClick={() => setSection(label)} className={`flex min-w-max items-center gap-3 rounded-xl px-3 py-3 text-left transition lg:w-full ${section === label ? "bg-[#E8DFD3] text-[#302A25]" : "text-[#776B60] hover:bg-[#E8DFD3]/55"}`}><Icon className="shrink-0 text-sm text-[#A8795D]" /><span><span className="block text-sm font-semibold">{label}</span><span className="hidden text-[11px] text-[#A09384] lg:block">{description}</span></span></button>)}
        </nav>

        <section className="min-w-0">
          {section === "Overview" && <div className="grid gap-4 sm:grid-cols-2"><button type="button" onClick={() => setSection("Study Partner")} className="setim-surface rounded-2xl p-5 text-left transition hover:-translate-y-0.5"><FaBookOpen className="text-xl text-[#A8795D]" /><h2 className="mt-5 text-lg font-bold">Study Partner Matching</h2><p className="mt-2 text-sm leading-6 text-[#776B60]">Compare courses, skills, learning objectives, interests, and availability.</p><span className="mt-5 inline-flex items-center gap-2 text-xs font-semibold text-[#A8795D]">Start matching <FaArrowRight /></span></button><button type="button" onClick={() => setSection("Competition Teams")} className="setim-surface rounded-2xl p-5 text-left transition hover:-translate-y-0.5"><FaPeopleGroup className="text-xl text-[#A8795D]" /><h2 className="mt-5 text-lg font-bold">Competition Teams</h2><p className="mt-2 text-sm leading-6 text-[#776B60]">Describe the roles and skills your team needs before inviting collaborators.</p><span className="mt-5 inline-flex items-center gap-2 text-xs font-semibold text-[#A8795D]">Plan a team <FaArrowRight /></span></button><div className="setim-surface rounded-2xl p-5 sm:col-span-2"><h2 className="text-lg font-bold">Your matching activity</h2><p className="mt-2 text-sm text-[#776B60]">Matching history and recommendations will appear here after your academic profile is connected.</p></div></div>}

          {section === "Study Partner" && <div className="setim-surface rounded-2xl p-5 sm:p-7"><div className="flex items-start justify-between gap-4"><div><h2 className="text-xl font-bold">Study Partner</h2><p className="mt-2 text-sm leading-6 text-[#776B60]">Tell us what you want to learn. Finder will compare compatible academic profiles when that data is available.</p></div><FaBookOpen className="mt-1 shrink-0 text-xl text-[#A8795D]" /></div><form onSubmit={(event) => { event.preventDefault(); setSubmitted(true); }} className="mt-6 space-y-4"><label className="block"><span className="text-xs font-semibold text-[#302A25]">Target courses</span><textarea value={courses} onChange={(event) => setCourses(event.target.value)} placeholder="e.g. Algorithms, Database Systems" className="mt-2 min-h-24 w-full resize-y rounded-xl border border-[#302A25]/10 bg-[#F5F1EA] px-3 py-3 text-sm outline-none placeholder:text-[#A09384] focus:border-[#A8795D]/60" /></label><label className="block"><span className="text-xs font-semibold text-[#302A25]">Preferred skills</span><input value={skills} onChange={(event) => setSkills(event.target.value)} placeholder="e.g. Python, React, data analysis" className="mt-2 w-full rounded-xl border border-[#302A25]/10 bg-[#F5F1EA] px-3 py-3 text-sm outline-none placeholder:text-[#A09384] focus:border-[#A8795D]/60" /></label><label className="block"><span className="text-xs font-semibold text-[#302A25]">Learning objectives</span><textarea value={objectives} onChange={(event) => setObjectives(event.target.value)} placeholder="What would you like to achieve?" className="mt-2 min-h-24 w-full resize-y rounded-xl border border-[#302A25]/10 bg-[#F5F1EA] px-3 py-3 text-sm outline-none placeholder:text-[#A09384] focus:border-[#A8795D]/60" /></label><button type="submit" className="rounded-full bg-[#302A25] px-5 py-3 text-xs font-semibold text-[#F5F1EA]">Find study partners</button></form>{submitted && <div className="mt-5 rounded-xl bg-[#E8DFD3]/60 p-4 text-sm leading-6 text-[#776B60]">No recommendations yet. Complete your academic profile with courses, skills, interests, objectives, and availability to receive evidence-based matches.</div>}</div>}

          {section === "Competition Teams" && <div className="setim-surface rounded-2xl p-5 sm:p-7"><FaPeopleGroup className="text-xl text-[#A8795D]" /><h2 className="mt-4 text-xl font-bold">Competition Teams</h2><p className="mt-2 text-sm leading-6 text-[#776B60]">Team optimization will use required roles, skills, team size, and availability. The competition profile fields are not connected to Supabase yet.</p><div className="mt-6 rounded-xl bg-[#E8DFD3]/55 p-4 text-sm text-[#776B60]">Team recommendations are unavailable until academic profile and competition data are configured.</div></div>}
          {(section === "Invitations" || section === "History") && <div className="setim-surface rounded-2xl p-6 text-center"><FaClock className="mx-auto text-xl text-[#A8795D]" /><h2 className="mt-4 text-lg font-bold">{section}</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#776B60]">There is no existing Finder invitation or matching-history data source yet. This area will use the shared Social invitation and Messages infrastructure when connected.</p></div>}
        </section>
      </div>
    </div>
  </main>;
};

export default FinderPage;
