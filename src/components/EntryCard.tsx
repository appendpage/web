"use client";

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
        "rounded-lg border bg-white p-5",
        isModeration ? "border-amber-200 bg-amber-50/40" : "border-zinc-200",
      ].join(" ")}
    >
      <header className="flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-500 mb-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono">#{entry.seq}</span>
          <time dateTime={entry.created_at}>
            {formatTime(entry.created_at)}
          </time>
          {isModeration && (
            <span className="rounded-full bg-amber-100 text-amber-900 px-2 py-0.5 text-[10px] uppercase tracking-wide">
              Moderator note
            </span>
          )}
          {parentSnippet && (
            <a
              href={`#e-${entry.parent}`}
              className="rounded-full bg-zinc-100 text-zinc-700 px-2 py-0.5 no-underline hover:bg-zinc-200"
            >
              ↳ reply to: {truncate(parentSnippet, 40)}
            </a>
          )}
        </div>
        <button
          type="button"
          onClick={() => setShowHash((s) => !s)}
          className="font-mono text-[10px] text-zinc-400 hover:text-zinc-700"
          title="Toggle entry hash"
        >
          {showHash
            ? entry.hash
            : `${entry.hash.slice(0, 14)}…`}
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
          <p className="text-zinc-400">[loading…]</p>
        )}
      </div>

      <footer className="mt-4 flex items-center gap-3 text-sm">
        <button
          type="button"
          onClick={() => onReply(entry)}
          className="text-zinc-600 hover:text-zinc-900"
        >
          Reply
        </button>
      </footer>
    </article>
  );
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function truncate(s: string, max: number): string {
  return s.length <= max ? s : s.slice(0, max - 1) + "…";
}
