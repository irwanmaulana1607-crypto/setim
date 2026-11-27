"use client";

import { useEffect, useState } from "react";
import hljs from "highlight.js/lib/common";
import {
  FaBookmark,
  FaHeart,
  FaRegBookmark,
  FaRegComment,
  FaRegHeart,
  FaRetweet,
  FaShare,
} from "react-icons/fa6";
import { getProjectFileCount, type CodeSnippet, type FeedPost, type PollData } from "./data";

type ThreadProps = {
  post: FeedPost;
  onReviewSourceCode: (post: FeedPost, reviewCode?: boolean) => void;
  onBookmarkChange?: (threadId: string, bookmarked: boolean) => void;
};

const snippetLanguage: Record<string, string> = { js: "javascript", javascript: "javascript", typescript: "typescript", python: "python", java: "java", cpp: "cpp", html: "xml", css: "css", sql: "sql", bash: "bash", json: "json" };

const CodeSnippetCard = ({ snippet }: { snippet: CodeSnippet }) => {
  const [copied, setCopied] = useState(false);
  const highlighted = snippetLanguage[snippet.language] ? hljs.highlight(snippet.code, { language: snippetLanguage[snippet.language] }).value : snippet.code.replaceAll("&", "&amp;").replaceAll("<", "&lt;");
  const lines = highlighted.split("\n");
  return <div className="mt-4 overflow-hidden rounded-xl border border-[#302A25]/10 bg-[#302A25]/5"><div className="flex items-center justify-between border-b border-[#302A25]/10 px-3 py-2"><span className="text-[10px] uppercase text-[#A09384]">{snippet.language}</span><button type="button" onClick={() => { void navigator.clipboard.writeText(snippet.code); setCopied(true); window.setTimeout(() => setCopied(false), 1500); }} className="text-[10px] text-[#A8795D]">{copied ? "Copied" : "Copy code"}</button></div><div className="max-h-80 overflow-auto py-3 font-mono text-xs leading-5"><div className="flex min-w-max"><div className="select-none border-r border-[#302A25]/10 px-3 text-right text-[#A09384]">{lines.map((_, index) => <div key={index}>{index + 1}</div>)}</div><pre className="px-4 text-[#302A25]"><code>{lines.map((line, index) => <span key={index} className="block" dangerouslySetInnerHTML={{ __html: line || " " }} />)}</code></pre></div></div></div>;
};

const PollCard = ({ poll }: { poll: PollData }) => {
  const [selected, setSelected] = useState(poll.votedOptionId ?? "");
  const [options, setOptions] = useState(poll.options);
  const totalVotes = options.reduce((total, option) => total + option.votes, 0);
  const expired = Boolean(poll.expiresAt && new Date(poll.expiresAt).getTime() <= Date.now());
  const vote = async (optionId: string) => {
    if (selected || expired) return;
    setSelected(optionId);
    setOptions((current) => current.map((option) => option.id === optionId ? { ...option, votes: option.votes + 1 } : option));
    if (poll.id) await fetch("/api/polls/vote", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pollId: poll.id, optionId }) });
  };
  return <div className="mt-4 rounded-xl border border-[#302A25]/10 p-4"><p className="font-semibold text-[#302A25]">{poll.question}</p><div className="mt-3 grid gap-2">{options.map((option) => { const percentage = totalVotes ? Math.round((option.votes / totalVotes) * 100) : 0; return <button key={option.id} type="button" disabled={Boolean(selected) || expired} onClick={() => vote(option.id)} className="relative overflow-hidden rounded-lg border border-[#302A25]/10 px-3 py-2 text-left text-xs text-[#776B60] disabled:cursor-default"><span className="absolute inset-y-0 left-0 bg-[#E8DFD3]" style={{ width: `${percentage}%` }} /><span className="relative flex justify-between"><span>{option.text}</span><span>{percentage}%</span></span></button>; })}</div><p className="mt-2 text-[10px] text-[#A09384]">{totalVotes} votes{expired ? " · Poll ended" : ""}</p></div>;
};

const Thread = ({ post, onReviewSourceCode, onBookmarkChange }: ThreadProps) => {
  const [liked, setLiked] = useState(false);
  const [reposted, setReposted] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);

  useEffect(() => {
    let active = true;
    fetch(`/api/bookmarks?threadId=${encodeURIComponent(post.id)}`)
      .then(async (response) => response.ok ? (await response.json() as { bookmarked?: boolean }).bookmarked === true : false)
      .then((value) => { if (active) setBookmarked(value); })
      .catch(() => undefined);
    return () => { active = false; };
  }, [post.id]);

  const toggleBookmark = async () => {
    const nextValue = !bookmarked;
    setBookmarked(nextValue);
    try {
      const response = await fetch(`/api/bookmarks${nextValue ? "" : `?threadId=${encodeURIComponent(post.id)}`}`, {
        method: nextValue ? "POST" : "DELETE",
        headers: nextValue ? { "Content-Type": "application/json" } : undefined,
        body: nextValue ? JSON.stringify({ threadId: post.id }) : undefined,
      });
      if (!response.ok) throw new Error("Bookmark update failed");
      onBookmarkChange?.(post.id, nextValue);
    } catch {
      setBookmarked(!nextValue);
    }
  };

  return (
    <article className="setim-thread border-b border-[#302A25]/10 px-5 py-5 transition-colors duration-150">
      <div className="flex gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#E8DFD3] text-sm font-bold text-[#776B60]">
          {post.name.charAt(0)}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="font-semibold text-[#302A25]">{post.name}</span>
            <span className="text-[#A09384]">@{post.username}</span>
            <span className="text-[#A09384]">·</span>
            <span className="text-[#A09384]">{post.time}</span>
          </div>

          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#302A25]">
            {post.content}
          </p>

          {post.postType && <span className="mt-2 inline-block rounded-full bg-[#E8DFD3] px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-[#776B60]">{post.postType.replaceAll("_", " ")}</span>}
          {post.topics && post.topics.length > 0 && <div className="mt-2 flex flex-wrap gap-2">{post.topics.map((topic) => <a key={topic.id} href={`/?topic=${topic.slug}`} className="text-xs text-[#A8795D] hover:underline">#{topic.name}</a>)}</div>}

          {post.linkPreview && <a href={post.linkPreview.url} target="_blank" rel="noreferrer" className="mt-4 block overflow-hidden rounded-xl border border-[#302A25]/10 bg-[#E8DFD3]/50">{post.linkPreview.thumbnail && <img src={post.linkPreview.thumbnail} alt="" className="h-32 w-full object-cover" />}<div className="p-3"><p className="text-[10px] uppercase text-[#A09384]">{post.linkPreview.domain}</p><p className="mt-1 font-semibold text-[#302A25]">{post.linkPreview.title}</p><p className="mt-1 text-xs text-[#776B60]">{post.linkPreview.description}</p></div></a>}
          {post.snippet && <CodeSnippetCard snippet={post.snippet} />}
          {post.poll && <PollCard poll={post.poll} />}

          {post.imageUrl && (
            <img
              src={post.imageUrl}
              alt="Attached to post"
              className="mt-4 max-h-[420px] w-full rounded-xl border border-[#302A25]/10 object-cover"
            />
          )}

          {post.project && (
            <div className="mt-4 overflow-hidden rounded-xl border border-[#302A25]/10">
              <div className="flex flex-col items-start gap-3 bg-[#E8DFD3]/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[#302A25]">
                    {post.project.owner}/{post.project.name}
                  </p>
                  <p className="mt-1 text-xs text-[#776B60]">
                    {post.project.language} · {getProjectFileCount(post.project)} files
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => onReviewSourceCode(post, false)}
                  className="min-h-11 whitespace-nowrap rounded-md border border-[#302A25]/10 px-3 py-2 text-xs font-semibold text-[#776B60] transition hover:bg-[#F5F1EA] hover:text-[#A8795D] touch-manipulation"
                >
                  Repository
                </button>
              </div>

              <div className="px-4 py-3">
                <p className="text-sm text-[#776B60]">{post.project.description}</p>
                <button
                  type="button"
                  onClick={() => onReviewSourceCode(post, true)}
                  className="mt-3 min-h-11 w-full rounded-lg bg-[#A8795D] px-4 py-3 text-xs font-semibold text-white transition hover:bg-[#93694F] touch-manipulation sm:w-auto"
                >
                  Review Source Code
                </button>
              </div>
            </div>
          )}

          <div className="setim-action-row mt-4 flex items-center justify-between gap-2 text-sm text-[#A09384] sm:gap-5">
            <button type="button" aria-label={`Reply, ${post.replies}`} className="inline-flex items-center gap-1.5 transition hover:text-[#A8795D]">
              <FaRegComment aria-hidden="true" />
              <span>{post.replies}</span>
            </button>

            <button
              type="button"
              onClick={() => setReposted(!reposted)}
              aria-label={`Repost, ${post.reposts + (reposted ? 1 : 0)}`}
              className={`inline-flex items-center gap-1.5 ${reposted ? "font-semibold text-[#5E8066]" : "hover:text-[#A8795D]"}`}
            >
              <FaRetweet aria-hidden="true" />
              <span>{post.reposts + (reposted ? 1 : 0)}</span>
            </button>

            <button
              type="button"
              onClick={() => setLiked(!liked)}
              aria-label={`Likes, ${post.likes + (liked ? 1 : 0)}`}
              className={`inline-flex items-center gap-1.5 ${liked ? "font-semibold text-[#B65F57]" : "hover:text-[#A8795D]"}`}
            >
              {liked ? <FaHeart aria-hidden="true" /> : <FaRegHeart aria-hidden="true" />}
              <span>{post.likes + (liked ? 1 : 0)}</span>
            </button>

            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => void toggleBookmark()}
                aria-label={bookmarked ? "Remove bookmark" : "Bookmark"}
                className={`inline-flex items-center gap-1.5 ${bookmarked ? "font-semibold text-[#A8795D]" : "hover:text-[#A8795D]"}`}
              >
                {bookmarked ? <FaBookmark aria-hidden="true" /> : <FaRegBookmark aria-hidden="true" />}
              </button>

              <button type="button" aria-label="Share" className="inline-flex items-center gap-1.5 hover:text-[#A8795D]">
                <FaShare aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
};

export default Thread;
