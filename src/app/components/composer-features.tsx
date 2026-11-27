"use client";

import { useEffect, useState } from "react";
import { FaCode, FaHashtag, FaLink, FaPlus, FaSquarePollVertical, FaXmark } from "react-icons/fa6";
import type { CodeSnippet, LinkPreview, PollData, PostType, Topic } from "./data";

export type ComposerFeatureValues = {
  linkPreview?: LinkPreview;
  snippet?: CodeSnippet;
  poll?: PollData;
  topics: Topic[];
  postType?: PostType;
};

type ComposerFeaturesProps = {
  mode: "link" | "snippet" | "poll" | "topics";
  onClose: () => void;
  onSave: (values: ComposerFeatureValues) => void;
};

const languages = ["javascript", "typescript", "python", "java", "cpp", "html", "css", "sql", "bash", "json"];

const ComposerFeatures = ({ mode, onClose, onSave }: ComposerFeaturesProps) => {
  const [linkUrl, setLinkUrl] = useState("");
  const [linkPreview, setLinkPreview] = useState<LinkPreview | undefined>();
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState("typescript");
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [expiresAt, setExpiresAt] = useState("");
  const [topics, setTopics] = useState<Topic[]>([]);
  const [topicQuery, setTopicQuery] = useState("");
  const [topicResults, setTopicResults] = useState<Topic[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (mode !== "topics" || !topicQuery.trim()) {
      setTopicResults([]);
      return;
    }
    const timer = window.setTimeout(() => {
      fetch(`/api/topics?q=${encodeURIComponent(topicQuery.trim())}`)
        .then((response) => response.json() as Promise<{ topics?: Topic[] }>)
        .then((result) => setTopicResults(result.topics ?? []))
        .catch(() => setTopicResults([]));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [mode, topicQuery]);

  const fetchLinkPreview = async () => {
    try {
      const url = new URL(linkUrl.trim());
      if (!['http:', 'https:'].includes(url.protocol)) throw new Error("Use a valid HTTP or HTTPS URL.");
      setLoading(true); setError(null);
      const response = await fetch("/api/links/metadata", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: url.toString() }) });
      const result = await response.json() as { error?: string; preview?: LinkPreview };
      if (!response.ok || !result.preview) throw new Error(result.error ?? "Link preview unavailable.");
      setLinkPreview(result.preview);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Link preview unavailable.");
    } finally { setLoading(false); }
  };

  const save = () => {
    setError(null);
    if (mode === "link" && !linkPreview) { setError("Fetch a link preview before attaching it."); return; }
    if (mode === "snippet" && !code.trim()) { setError("Code snippet cannot be empty."); return; }
    if (mode === "poll" && (!question.trim() || options.filter((option) => option.trim()).length < 2)) { setError("A poll needs a question and at least two options."); return; }
    onSave({
      linkPreview: mode === "link" ? linkPreview : undefined,
      snippet: mode === "snippet" ? { language, code } : undefined,
      poll: mode === "poll" ? { question: question.trim(), options: options.filter(Boolean).map((text, index) => ({ id: `option-${index}`, text: text.trim(), votes: 0 })), expiresAt: expiresAt || undefined } : undefined,
      topics,
    });
  };

  const titles = { link: "Attach Link", snippet: "Code Snippet", poll: "Create Poll", topics: "Add Topics" };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#302A25]/35 p-4 backdrop-blur-[2px]">
      <div role="dialog" aria-modal="true" className="setim-popover max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-[#302A25]/10 bg-[#F5F1EA] p-5 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-[#302A25]">{titles[mode]}</h2>
          <button type="button" onClick={onClose} aria-label="Close dialog" className="rounded-lg p-2 text-lg text-[#776B60] hover:bg-[#E8DFD3] hover:text-[#A8795D]"><FaXmark /></button>
        </div>

        {mode === "link" && <div className="mt-4 space-y-3">
          <div className="flex gap-2"><input value={linkUrl} onChange={(event) => setLinkUrl(event.target.value)} placeholder="https://example.com" className="min-w-0 flex-1 rounded-lg border border-[#302A25]/10 bg-transparent px-3 py-2 text-sm outline-none" /><button type="button" onClick={fetchLinkPreview} disabled={loading} className="rounded-lg bg-[#A8795D] px-3 text-xs font-semibold text-white">{loading ? "Loading…" : "Preview"}</button></div>
          {linkPreview && <div className="overflow-hidden rounded-xl border border-[#302A25]/10 bg-[#E8DFD3]/50">{linkPreview.thumbnail && <img src={linkPreview.thumbnail} alt="" className="h-32 w-full object-cover" />}<div className="p-3"><p className="text-[10px] uppercase text-[#A09384]">{linkPreview.domain}</p><p className="mt-1 font-semibold text-[#302A25]">{linkPreview.title}</p><p className="mt-1 text-xs text-[#776B60]">{linkPreview.description}</p></div></div>}
        </div>}

        {mode === "snippet" && <div className="mt-4 space-y-3"><select value={language} onChange={(event) => setLanguage(event.target.value)} className="rounded-lg border border-[#302A25]/10 bg-transparent px-3 py-2 text-sm"><option value="">Select language</option>{languages.map((item) => <option key={item}>{item}</option>)}</select><textarea value={code} onChange={(event) => setCode(event.target.value)} placeholder="Paste a small code snippet" className="min-h-48 w-full resize-y rounded-lg border border-[#302A25]/10 bg-[#302A25]/5 p-3 font-mono text-xs leading-5 outline-none" /></div>}

        {mode === "poll" && <div className="mt-4 space-y-3"><input value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Ask a question" className="w-full rounded-lg border border-[#302A25]/10 bg-transparent px-3 py-2 text-sm outline-none" />{options.map((option, index) => <div key={index} className="flex gap-2"><input value={option} onChange={(event) => setOptions((current) => current.map((item, itemIndex) => itemIndex === index ? event.target.value : item))} placeholder={`Option ${index + 1}`} className="min-w-0 flex-1 rounded-lg border border-[#302A25]/10 bg-transparent px-3 py-2 text-sm outline-none" />{options.length > 2 && <button type="button" onClick={() => setOptions((current) => current.filter((_, itemIndex) => itemIndex !== index))} aria-label="Remove option"><FaXmark /></button>}</div>)}<button type="button" onClick={() => setOptions((current) => [...current, ""])} className="inline-flex items-center gap-2 text-xs text-[#A8795D]"><FaPlus /> Add option</button><input type="datetime-local" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} className="block rounded-lg border border-[#302A25]/10 bg-transparent px-3 py-2 text-xs text-[#776B60]" /></div>}

        {mode === "topics" && <div className="mt-4 space-y-3"><input value={topicQuery} onChange={(event) => setTopicQuery(event.target.value)} placeholder="Search topics" className="w-full rounded-lg border border-[#302A25]/10 bg-transparent px-3 py-2 text-sm outline-none" /><div className="flex flex-wrap gap-2">{topics.map((topic) => <button key={topic.id} type="button" onClick={() => setTopics((current) => current.filter((item) => item.id !== topic.id))} className="rounded-full bg-[#E8DFD3] px-3 py-1 text-xs text-[#776B60]">{topic.name} ×</button>)}</div><div className="grid gap-1">{topicResults.filter((topic) => !topics.some((selected) => selected.id === topic.id)).map((topic) => <button key={topic.id} type="button" onClick={() => setTopics((current) => [...current, topic])} className="rounded-lg px-3 py-2 text-left text-xs hover:bg-[#E8DFD3]">{topic.name}</button>)}</div></div>}

        {error && <p role="alert" className="mt-3 text-xs text-[#B65F57]">{error}</p>}
        <div className="mt-5 flex justify-end gap-2"><button type="button" onClick={onClose} className="rounded-lg border border-[#302A25]/10 px-4 py-2 text-xs text-[#776B60] hover:bg-[#E8DFD3]">Cancel</button><button type="button" onClick={save} className="rounded-lg bg-[#A8795D] px-4 py-2 text-xs font-semibold text-white hover:bg-[#93694F] active:scale-95">Attach</button></div>
      </div>
    </div>
  );
};

export default ComposerFeatures;
