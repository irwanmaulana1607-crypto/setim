"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

import { RiNotification2Fill } from "react-icons/ri";
import { GoHomeFill } from "react-icons/go";
import { HiEnvelope } from "react-icons/hi2";
import { MdOutlineBookmark } from "react-icons/md";
import { FaUserGroup, FaUser } from "react-icons/fa6";
import { IoSearchOutline } from "react-icons/io5";
import { IoMdSettings } from "react-icons/io";
import { FaXmark } from "react-icons/fa6";

const NAVIGATION_ITEMS = [
  {
    title: "Home",
    icon: GoHomeFill,
    href: "/",
  },
  {
    title: "Explore",
    icon: IoSearchOutline,
    href: "/explore",
  },
  {
    title: "Notifications",
    icon: RiNotification2Fill,
    href: "/notifications",
  },
  {
    title: "Messages",
    icon: HiEnvelope,
    href: "/messages",
  },
  {
    title: "Bookmarks",
    icon: MdOutlineBookmark,
    href: "/bookmarks",
  },
  {
    title: "Communities",
    icon: FaUserGroup,
    href: "/communities",
  },
  {
    title: "Profile",
    icon: FaUser,
    href: "/profile",
  },
  {
    title: "Settings",
    icon: IoMdSettings,
    href: "/settings",
  },
];

type LeftSidebarProps = {
  onCreatePost?: () => void;
};

const LeftSidebar = ({ onCreatePost }: LeftSidebarProps) => {
  const pathname = usePathname();
  const router = useRouter();
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);

  const handleLogout = async () => {
    if (!window.confirm("Log out of Setim?")) return;
    setLoggingOut(true);
    setLogoutError(null);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      window.sessionStorage.clear();
      router.replace("/login");
      router.refresh();
    } catch (error) {
      setLogoutError(error instanceof Error ? error.message : "Log out failed. Please try again.");
      setLoggingOut(false);
    }
  };

  return (
    <aside className="sticky top-0 flex h-dvh w-16 shrink-0 flex-col border-r border-[#302A25]/10 bg-[#F5F1EA]/85 ml-0 px-2 py-8 backdrop-blur-xl md:ml-10 md:w-[240px] md:px-5 lg:ml-16">

      {/* NAVIGATION */}
      <nav className="min-h-0 flex flex-col gap-2 overflow-y-auto">

        {NAVIGATION_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

          return (
            <Link
              href={item.href}
              key={item.title}
              title={item.title}
              aria-label={item.title}
              aria-current={isActive ? "page" : undefined}
              className={`flex items-center justify-center gap-4 rounded-xl px-3 py-3 text-[14px] tracking-wide hover:bg-[#E8DFD3]/55 md:justify-start ${isActive ? "bg-[#E8DFD3]/65 font-semibold text-[#A8795D] shadow-sm" : "font-medium text-[#776B60]"}`}
            >
              <Icon className="text-[20px]" />

              <span className="hidden md:inline">{item.title}</span>

            </Link>
          );
        })}

      </nav>

      {/* CREATE POST */}
      <Link href={onCreatePost ? "#composer" : pathname === "/" ? "#composer" : "/#composer"} onClick={(event) => {
        if (onCreatePost) {
          event.preventDefault();
          onCreatePost();
          return;
        }
        if (pathname !== "/") return;
        event.preventDefault();
        const composer = document.getElementById("composer");
        composer?.scrollIntoView({ behavior: "smooth", block: "start" });
        composer?.querySelector("textarea")?.focus();
      }} aria-label="Create Post" title="Create Post" className="mt-9 flex w-full items-center justify-center gap-2 rounded-full bg-[#302A25] px-4 py-3 text-[13px] font-semibold tracking-wide text-[#F5F1EA] shadow-[0_8px_18px_rgba(48,42,37,0.12)] hover:bg-[#4a4038]">
        <span className="text-lg font-normal">+</span>
        <span className="hidden md:inline">Create Post</span>
      </Link>

      {/* PROFILE */}
      <div className="relative mt-auto flex translate-y-1 items-center justify-center gap-1 rounded-xl border-t border-[#302A25]/10 -mx-2 px-2 pt-5 hover:bg-[#E8DFD3]/25 md:-mx-5 md:px-5 md:justify-start">

        {/* AVATAR */}
        <button type="button" onClick={() => setProfileMenuOpen((open) => !open)} aria-expanded={profileMenuOpen} aria-label="Open profile menu" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#E8DFD3] text-[#8B6953]">
          <FaUser className="text-sm" />
        </button>

        {/* USER INFORMATION */}
        <button type="button" onClick={() => setProfileMenuOpen((open) => !open)} aria-expanded={profileMenuOpen} className="hidden min-w-0 flex-1 text-left md:block">

          <p className="truncate text-[13px] font-semibold text-[#302A25]">
            Your Name
          </p>

          <p className="truncate text-[11px] text-[#A09384]">
            @username
          </p>

        </button>

        <span className="hidden text-lg tracking-widest text-[#A09384] md:inline">
          ···
        </span>

        {profileMenuOpen && (
          <div className="setim-popover absolute bottom-full left-0 z-50 mb-3 w-52 rounded-xl border border-[#302A25]/10 bg-[#F5F1EA] p-2 shadow-lg">
            <button type="button" onClick={() => void handleLogout()} disabled={loggingOut} className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-[#302A25] hover:bg-[#E8DFD3] disabled:opacity-60">
              {loggingOut ? "Logging out…" : "Log Out"}
              {loggingOut && <FaXmark className="text-xs text-[#A09384]" />}
            </button>
            {logoutError && <p role="alert" className="px-3 pb-1 pt-2 text-[11px] leading-4 text-[#B65F57]">{logoutError}</p>}
          </div>
        )}
      </div>

    </aside>
  );
};

export default LeftSidebar;
