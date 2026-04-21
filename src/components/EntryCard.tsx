"use client";

import { CornerDownRight, Reply, Shield } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useState } from "react";

import type { ChainEntry, EntryWithBody } from "@/lib/types";

interface Props {
  entry: ChainEntry;
  body: EntryWithBody | null;
  parentSnippet?: string;
  /** Called when the user clicks "Reply" — opens the composer with parent set. */
  onReply: (entry: ChainEntry) => void;
}

export function EntryCard({ entry, body, parentSnippet, onReply }: Props) {
  const [showHash, setShowHash] = useState(false);
  const isModeration = entry.kind === "moderation";
  const erased = body?.erased ?? false;
  const text = body?.body ?? null;

  return (
    <article
      id={`e-${entry.id}`}
      className={[
        "group rounded-2xl border bg-white px-6 py-5 transition-all",
        isModeration
          ? "border-amber-200/80 bg-amber-50/30"
          : "border-zinc-200 hover:border-zinc-300",
      ].join(" ")}
    >
      <header className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
          <span className="font-mono text-zinc-400">#{entry.seq}</span>
          <span className="text-zinc-300">·</span>
          <time dateTime={entry.created_at} className="text-zinc-500">
            {formatTime(entry.created_at)}
          </time>
          {isModeration && (
            <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-900 px-2 py-0.5 text-[10px] uppercase tracking-wide font-medium">
              <Shield size={10} strokeWidth={2.25} />
              Moderator
            </span>
          )}
          {parentSnippet && (
            <a
              href={`#e-${entry.parent}`}
              className="ml-1 inline-flex items-center gap-1 rounded-full bg-zinc-100 text-zinc-700 px-2.5 py-0.5 text-xs no-underline hover:bg-zinc-200 transition-colors"
            >
              <CornerDownRight size={11} strokeWidth={2.25} />
              <span className="text-zinc-500">replying to:</span>
              <span className="text-zinc-800">
                {truncate(parentSnippet, 36)}
              </span>
            </a>
          )}
        </div>
        <button
          type="button"
          onClick={() => setShowHash((s) => !s)}
          className="font-mono text-[10px] text-zinc-300 hover:text-zinc-700 transition-colors opacity-0 group-hover:opacity-100"
          title="Click to toggle full hash"
        >
          {showHash ? entry.hash : `${entry.hash.slice(0, 14)}…`}
        </button>
      </header>

      <div className="prose-entry">
        {erased ? (
          <p className="italic text-zinc-500">
            [body erased
            {body?.erased_reason ? `: ${body.erased_reason}` : ""}]
          </p>
        ) : text ? (
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            disallowedElements={["script", "iframe", "style", "img"]}
            unwrapDisallowed
          >
            {text}
          </ReactMarkdown>
        ) : (
          <p className="text-zinc-300">[loading…]</p>
        )}
      </div>

      <footer className="mt-4 flex items-center gap-3">
        <button
          type="button"
          onClick={() => onReply(entry)}
          className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900 transition-colors"
        >
          <Reply size={14} strokeWidth={2} />
          Reply
        </button>
      </footer>
    </article>
  );
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const now = Date.now();
  const diff = now - d.getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function truncate(s: string, max: number): string {
  return s.length <= max ? s : s.slice(0, max - 1) + "…";
}
