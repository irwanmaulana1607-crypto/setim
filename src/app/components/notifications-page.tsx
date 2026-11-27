"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { FaBell, FaCodeBranch, FaHeart, FaMessage, FaRepeat, FaUserPlus } from "react-icons/fa6";

type NotificationType = "like" | "reply" | "repost" | "follow" | "mention" | "repository";

type Notification = {
  id: string;
  actor_id: string;
  type: NotificationType;
  thread_id: string | null;
  repository_id: string | null;
  is_read: boolean;
  created_at: string;
  threads?: { content: string } | null;
};

type NotificationsTab = "All" | "Mentions";

const notificationCopy: Record<NotificationType, string> = {
  like: "liked your thread.",
  reply: "replied to your discussion.",
  repost: "reposted your thread.",
  follow: "started following you.",
  mention: "mentioned you in a thread.",
  repository: "interacted with your project.",
};

const notificationIcon: Record<NotificationType, typeof FaBell> = {
  like: FaHeart,
  reply: FaMessage,
  repost: FaRepeat,
  follow: FaUserPlus,
  mention: FaMessage,
  repository: FaCodeBranch,
};

const formatTime = (value: string) => {
  const elapsed = Date.now() - new Date(value).getTime();
  const minutes = Math.max(1, Math.floor(elapsed / 60000));
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
};

const NotificationsPage = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [activeTab, setActiveTab] = useState<NotificationsTab>("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/notifications", { cache: "no-store" });
      const result = await response.json() as { notifications?: Notification[]; error?: string };
      if (!response.ok) throw new Error(result.error ?? "Notifications could not be loaded.");
      setNotifications(result.notifications ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Notifications could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadNotifications(); }, [loadNotifications]);

  const visibleNotifications = useMemo(
    () => activeTab === "Mentions" ? notifications.filter((notification) => notification.type === "mention") : notifications,
    [activeTab, notifications]
  );
  const unreadCount = notifications.filter((notification) => !notification.is_read).length;

  const markRead = async (id: string) => {
    setNotifications((current) => current.map((notification) => notification.id === id ? { ...notification, is_read: true } : notification));
    await fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
  };

  const markAllRead = async () => {
    setNotifications((current) => current.map((notification) => ({ ...notification, is_read: true })));
    await fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ all: true }) });
  };

  return (
    <section className="min-w-0 flex-1">
      <header className="setim-page-header sticky top-0 z-20 bg-[#F5F1EA]/95 px-5 py-4 sm:px-8">
        <div className="mx-auto max-w-2xl">
        <div className="flex items-center justify-between gap-4">
          <div><p className="text-xs font-bold uppercase tracking-widest text-[#A8795D]">Setim</p><h1 className="mt-1 text-xl font-bold text-[#302A25]">Notifications</h1></div>
          <button type="button" onClick={() => void markAllRead()} disabled={!unreadCount} className="text-xs font-semibold text-[#A8795D] disabled:cursor-default disabled:text-[#A09384]">Mark all as read</button>
        </div>
        <nav className="-mx-2 mt-4 flex overflow-x-auto" aria-label="Notification filters">
          {(["All", "Mentions"] as NotificationsTab[]).map((tab) => <button key={tab} type="button" onClick={() => setActiveTab(tab)} className={`relative shrink-0 px-4 py-3 text-sm font-semibold ${activeTab === tab ? "text-[#302A25]" : "text-[#A09384]"}`}>{tab}{activeTab === tab && <span className="absolute inset-x-4 bottom-0 h-[3px] rounded-full bg-[#A8795D]" />}</button>)}
        </nav>
        </div>
      </header>

      <div className="mx-auto w-full max-w-2xl">
      {loading && <div className="space-y-3 p-5 sm:p-8">{[1, 2, 3].map((item) => <div key={item} className="setim-skeleton h-20 rounded-xl bg-[#E8DFD3]/60" />)}</div>}
      {error && !loading && <div className="p-8 text-center"><p role="alert" className="text-sm text-[#776B60]">{error}</p><button type="button" onClick={() => void loadNotifications()} className="mt-4 rounded-full bg-[#302A25] px-4 py-2 text-xs font-semibold text-[#F5F1EA]">Retry</button></div>}
      {!loading && !error && visibleNotifications.length === 0 && <div className="flex flex-col items-center px-6 py-20 text-center"><FaBell className="text-2xl text-[#A8795D]" /><h2 className="mt-4 text-lg font-bold text-[#302A25]">No notifications yet</h2><p className="mt-2 max-w-sm text-sm leading-6 text-[#776B60]">When people interact with your threads, you’ll see it here.</p></div>}
      {!loading && !error && visibleNotifications.map((notification) => { const Icon = notificationIcon[notification.type]; const destination = notification.thread_id ? `/?thread=${notification.thread_id}` : "/profile"; return <Link key={notification.id} href={destination} onClick={() => { if (!notification.is_read) void markRead(notification.id); }} className={`flex gap-3 border-b border-[#302A25]/10 px-5 py-4 transition hover:bg-[#E8DFD3]/35 sm:px-8 ${notification.is_read ? "" : "bg-[#E8DFD3]/25"}`}><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#E8DFD3] text-[#A8795D]"><Icon /></div><div className="min-w-0 flex-1"><p className="text-sm leading-6 text-[#302A25]"><span className="font-semibold">Setim member</span> <span className="text-[#776B60]">{notificationCopy[notification.type]}</span></p><p className="text-xs text-[#A09384]">@{notification.actor_id.slice(0, 8)} · {formatTime(notification.created_at)}</p>{notification.threads?.content && <p className="mt-2 truncate rounded-lg bg-[#E8DFD3]/45 px-3 py-2 text-xs text-[#776B60]">{notification.threads.content}</p>}</div>{!notification.is_read && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#A8795D]" aria-label="Unread" />}</Link>; })}
      </div>
    </section>
  );
};

export default NotificationsPage;
