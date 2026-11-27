"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FaGraduationCap, FaHouse, FaUsers } from "react-icons/fa6";

const APPLICATIONS = [
  { label: "Finder", href: "/finder", icon: FaUsers },
  { label: "Social", href: "/", icon: FaHouse },
  { label: "Academic", href: "/academic", icon: FaGraduationCap },
] as const;

const BottomNavigation = () => {
  const pathname = usePathname();
  if (pathname === "/login") return null;

  const activeApplication = pathname.startsWith("/finder") ? "/finder" : pathname.startsWith("/academic") ? "/academic" : "/";

  return <nav aria-label="Applications" className="setim-bottom-nav fixed inset-x-0 bottom-0 z-[60] border-t border-[#302A25]/10 bg-[#F5F1EA]/95 px-3 pb-[env(safe-area-inset-bottom)] pt-2 backdrop-blur-xl">
    <div className="mx-auto grid max-w-md grid-cols-3 rounded-2xl border border-[#302A25]/10 bg-[#F5F1EA]/80 p-1 shadow-[0_-8px_28px_rgba(48,42,37,0.08)]">
      {APPLICATIONS.map(({ label, href, icon: Icon }) => {
        const active = activeApplication === href;
        return <Link key={href} href={href} aria-current={active ? "page" : undefined} className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl px-3 py-1.5 text-[10px] font-semibold transition ${active ? "bg-[#E8DFD3] text-[#A8795D]" : "text-[#A09384] hover:bg-[#E8DFD3]/55 hover:text-[#776B60]"}`}><Icon className="text-base" aria-hidden="true" /><span>{label}</span></Link>;
      })}
    </div>
  </nav>;
};

export default BottomNavigation;
