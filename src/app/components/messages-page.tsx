"use client";

import { useEffect, useRef, useState } from "react";
import { FaArrowLeft, FaMagnifyingGlass, FaMessage, FaPaperPlane, FaPlus, FaXmark } from "react-icons/fa6";

type UserResult = { id: string; name: string; username: string };
type Message = { id: string; sender_id: string; content: string; created_at: string };
type Conversation = { id: string; other_user_id: string | null; updated_at: string | null; latest_message: Message | null; unread: boolean; name?: string; username?: string };

const shortId = (value: string | null) => value ? value.slice(0, 8) : "member";
const formatTime = (value: string | null) => value ? new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";

const MessagesPage = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [query, setQuery] = useState("");
  const [recipientQuery, setRecipientQuery] = useState("");
  const [users, setUsers] = useState<UserResult[]>([]);
  const [composer, setComposer] = useState("");
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newMessageOpen, setNewMessageOpen] = useState(false);
  const [mobileChat, setMobileChat] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadConversations = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/messages/conversations", { cache: "no-store" });
      const result = await response.json() as { conversations?: Conversation[]; error?: string };
      if (!response.ok) throw new Error(result.error ?? "Conversations could not be loaded.");
      setConversations(result.conversations ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Conversations could not be loaded.");
    } finally { setLoading(false); }
  };

  useEffect(() => { void loadConversations(); }, []);

  useEffect(() => {
    if (!selectedId) return;
    let active = true;
    setMessagesLoading(true);
    fetch(`/api/messages/conversations/${selectedId}`)
      .then(async (response) => {
        const result = await response.json() as { messages?: Message[]; error?: string };
        if (!response.ok) throw new Error(result.error ?? "Messages could not be loaded.");
        if (active) setMessages(result.messages ?? []);
      })
      .catch((loadError) => { if (active) setError(loadError instanceof Error ? loadError.message : "Messages could not be loaded."); })
      .finally(() => { if (active) setMessagesLoading(false); });
    void fetch(`/api/messages/conversations/${selectedId}`, { method: "PATCH" });
    return () => { active = false; };
  }, [selectedId]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  useEffect(() => {
    if (recipientQuery.trim().length < 2) { setUsers([]); return; }
    const timer = window.setTimeout(() => {
      fetch(`/api/messages/users?q=${encodeURIComponent(recipientQuery.trim())}`)
        .then(async (response) => (await response.json() as { users?: UserResult[] }).users ?? [])
        .then(setUsers)
        .catch(() => setUsers([]));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [recipientQuery]);

  const selected = conversations.find((conversation) => conversation.id === selectedId) ?? null;
  const filteredConversations = conversations.filter((conversation) => `${conversation.name ?? ""} ${conversation.username ?? ""} ${conversation.latest_message?.content ?? ""} ${conversation.other_user_id ?? ""}`.toLowerCase().includes(query.toLowerCase()));

  const selectConversation = (conversation: Conversation) => {
    setSelectedId(conversation.id);
    setMobileChat(true);
    setConversations((current) => current.map((item) => item.id === conversation.id ? { ...item, unread: false } : item));
  };

  const startConversation = async (recipient: UserResult) => {
    const response = await fetch("/api/messages/conversations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ recipientId: recipient.id }) });
    const result = await response.json() as { conversation?: Conversation; error?: string };
    if (!response.ok || !result.conversation) { setError(result.error ?? "Conversation could not be created."); return; }
    const conversation = { ...result.conversation, name: recipient.name, username: recipient.username, latest_message: null, unread: false, updated_at: new Date().toISOString() };
    setConversations((current) => [conversation, ...current.filter((item) => item.id !== conversation.id)]);
    setSelectedId(conversation.id);
    setMobileChat(true);
    setNewMessageOpen(false);
    setRecipientQuery("");
  };

  const sendMessage = async () => {
    if (!selectedId || !composer.trim() || sending) return;
    const content = composer.trim();
    setSending(true);
    setError(null);
    try {
      const response = await fetch(`/api/messages/conversations/${selectedId}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content }) });
      const result = await response.json() as { message?: Message; error?: string };
      if (!response.ok || !result.message) throw new Error(result.error ?? "Message could not be sent.");
      setMessages((current) => [...current, result.message as Message]);
      setComposer("");
      await loadConversations();
    } catch (sendError) { setError(sendError instanceof Error ? sendError.message : "Message could not be sent."); }
    finally { setSending(false); }
  };

  return (
    <section className="flex min-h-0 w-full flex-1 overflow-hidden">
      <aside className={`${mobileChat ? "hidden md:flex" : "flex"} w-full shrink-0 flex-col border-r border-[#302A25]/10 md:w-[300px] lg:w-[350px]`}>
        <header className="border-b border-[#302A25]/10 px-5 py-4"><div className="flex items-center justify-between"><h1 className="text-xl font-bold">Messages</h1><button type="button" onClick={() => setNewMessageOpen(true)} aria-label="New message" title="New message" className="rounded-full bg-[#302A25] p-2 text-[#F5F1EA]"><FaPlus /></button></div><label className="mt-4 flex items-center gap-2 rounded-full border border-[#302A25]/10 bg-[#E8DFD3]/40 px-3 py-2"><FaMagnifyingGlass className="text-xs text-[#A8795D]" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search conversations" className="min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-[#A09384]" /></label></header>
        {newMessageOpen && <div className="border-b border-[#302A25]/10 bg-[#E8DFD3]/25 p-4"><div className="flex items-center justify-between"><p className="text-sm font-semibold">New message</p><button type="button" onClick={() => setNewMessageOpen(false)} aria-label="Close new message"><FaXmark /></button></div><input autoFocus value={recipientQuery} onChange={(event) => setRecipientQuery(event.target.value)} placeholder="Search people" className="mt-3 w-full rounded-lg border border-[#302A25]/10 bg-[#F5F1EA] px-3 py-2 text-xs outline-none" />{users.map((user) => <button key={user.id} type="button" onClick={() => void startConversation(user)} className="mt-2 flex w-full items-center gap-2 rounded-lg p-2 text-left hover:bg-[#F5F1EA]"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#E8DFD3] text-xs font-semibold">{user.name.charAt(0)}</span><span><span className="block text-xs font-semibold">{user.name}</span><span className="block text-[10px] text-[#A09384]">@{user.username}</span></span></button>)}</div>}
        <div className="min-h-0 flex-1 overflow-y-auto">
          {loading && (
            <div className="space-y-3 p-4">
              {[1, 2, 3].map((item) => (
                <div key={item} className="setim-skeleton h-16 rounded-xl bg-[#E8DFD3]/60" />
              ))}
            </div>
          )}
          {!loading && filteredConversations.length === 0 && !error && (
            <p className="px-5 py-12 text-center text-xs leading-5 text-[#776B60]">
              No conversations yet. Start a new message to connect with someone.
            </p>
          )}
          {filteredConversations.map((conversation) => {
            const isSelected = selectedId === conversation.id;
            return (
              <button
                key={conversation.id}
                type="button"
                onClick={() => selectConversation(conversation)}
                className={`flex w-full gap-3 border-b border-[#302A25]/10 px-5 py-4 text-left hover:bg-[#E8DFD3]/35 ${isSelected ? "bg-[#E8DFD3]/45" : ""}`}
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#E8DFD3] text-sm font-semibold text-[#776B60]">
                  {(conversation.name ?? "S").charAt(0)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-semibold">{conversation.name ?? "Setim member"}</span>
                    <span className="text-[10px] text-[#A09384]">{formatTime(conversation.updated_at)}</span>
                  </span>
                  <span className="block truncate text-xs text-[#A09384]">
                    {conversation.latest_message?.content ?? "Start a conversation"}
                  </span>
                </span>
                {conversation.unread && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#A8795D]" />}
              </button>
            );
          })}
        </div>
      </aside>
      <section className={`${mobileChat ? "flex" : "hidden md:flex"} min-w-0 flex-1 flex-col`}>
        {!selected && <div className="flex flex-1 flex-col items-center justify-center px-6 text-center"><FaMessage className="text-2xl text-[#A8795D]" /><h2 className="mt-4 text-lg font-bold">Select a conversation</h2><p className="mt-2 max-w-sm text-sm text-[#776B60]">Choose a conversation or start a new message.</p></div>}
        {selected && <><header className="flex items-center gap-3 border-b border-[#302A25]/10 px-4 py-4"><button type="button" onClick={() => setMobileChat(false)} className="md:hidden" aria-label="Back to conversations"><FaArrowLeft /></button><span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#E8DFD3] text-sm font-semibold">{(selected.name ?? "S").charAt(0)}</span><div className="min-w-0"><h2 className="truncate text-sm font-bold">{selected.name ?? "Setim member"}</h2><p className="truncate text-xs text-[#A09384]">@{selected.username ?? shortId(selected.other_user_id)}</p></div></header><div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-8">{messagesLoading && <p className="text-center text-xs text-[#A09384]">Loading messages…</p>}{!messagesLoading && messages.length === 0 && <p className="py-12 text-center text-xs text-[#776B60]">No messages yet. Say hello.</p>}{messages.map((message) => <div key={message.id} className={`mb-3 flex ${message.sender_id === selected.other_user_id ? "justify-start" : "justify-end"}`}><div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-5 ${message.sender_id === selected.other_user_id ? "rounded-bl-md bg-[#E8DFD3] text-[#302A25]" : "rounded-br-md bg-[#A8795D] text-white"}`}><p className="whitespace-pre-wrap break-words">{message.content}</p><p className={`mt-1 text-[10px] ${message.sender_id === selected.other_user_id ? "text-[#A09384]" : "text-white/70"}`}>{formatTime(message.created_at)}</p></div></div>)}<div ref={bottomRef} /></div><form onSubmit={(event) => { event.preventDefault(); void sendMessage(); }} className="border-t border-[#302A25]/10 p-4"><div className="flex items-end gap-2 rounded-2xl border border-[#302A25]/10 bg-[#E8DFD3]/35 px-3 py-2"><textarea value={composer} onChange={(event) => setComposer(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void sendMessage(); } }} placeholder="Write a message" rows={1} className="max-h-32 min-h-9 flex-1 resize-none bg-transparent py-2 text-sm outline-none placeholder:text-[#A09384]" /><button type="submit" disabled={sending || !composer.trim()} aria-label="Send message" className="rounded-full bg-[#302A25] p-2 text-[#F5F1EA] disabled:opacity-40"><FaPaperPlane /></button></div><p className="mt-2 px-2 text-[10px] text-[#A09384]">Enter to send · Shift + Enter for a new line</p></form></>}
      </section>
      {error && <p role="alert" className="absolute bottom-4 left-1/2 z-30 -translate-x-1/2 rounded-lg bg-[#E8DFD3] px-3 py-2 text-xs text-[#776B60]">{error}</p>}
    </section>
  );
};

export default MessagesPage;
