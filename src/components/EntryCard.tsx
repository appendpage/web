"use client";

import { AtSign, CornerDownRight, Reply, Shield } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useState } from "react";

import type { ChainEntry, EntryWithBody } from "@/lib/types";
import { Highlight } from "./Highlight";

interface Props {
  entry: ChainEntry;
  body: EntryWithBody | null;
  parentSnippet?: string;
  /** Called when the user clicks "Reply" — opens the composer with parent set. */
  onReply: (entry: ChainEntry) => void;
  /**
   * If true, apply a fading ring highlight so the user can locate their
   * just-submitted post after the page re-renders. PageView clears this
   * a few seconds after a successful POST.
   */
  justPosted?: boolean;
  /**
   * When true, renders a slimmer card meant to live INSIDE a ThreadGroup
   * underneath its root entry. We drop the "replying to:" pill (the visual
   * indent + thread structure already conveys parent context) and tighten
   * padding/font so a thread of replies doesn't visually overpower its
   * root post.
   */
  compact?: boolean;
  /**
   * Seq of this entry's IMMEDIATE parent inside its thread. When provided
   * AND the parent is NOT the thread root, render a small "@#N" tag so the
   * reader can tell which sibling reply this entry is answering.
   * `directParentSeq === thread.root.seq` is the implied common case
   * (replies to the root) and gets no tag — the indent already says it.
   */
  directParentSeq?: number;
  /** The thread root's seq, used to decide whether to show the @#N tag. */
  threadRootSeq?: number;
  /**
   * In-page search query (already normalized — lowercased, trimmed).
   * When non-empty, the body renders as plain text wrapped in <Highlight>
   * so matches are visually marked. Markdown formatting is intentionally
   * traded away while searching: the goal is to FIND text, not to enjoy
   * prose, and a hybrid markdown+highlight renderer would be a lot of
   * code for marginal benefit. Reverts to ReactMarkdown when the search
   * is cleared.
   */
  highlight?: string;
}

export function EntryCard({
  entry,
  body,
  parentSnippet,
  onReply,
  justPosted,
  compact,
  directParentSeq,
  threadRootSeq,
  highlight = "",
}: Props) {
  const [showHash, setShowHash] = useState(false);
  const isModeration = entry.kind === "moderation";
  const erased = body?.erased ?? false;
  const text = body?.body ?? null;

  // Show "@#N" only when this is a reply-to-a-reply WITHIN a thread, i.e.
  // the immediate parent is some other descendant rather than the thread
  // root. Direct replies to the root get no tag (the indent says it all).
  const showAtMention =
    compact &&
    typeof directParentSeq === "number" &&
    typeof threadRootSeq === "number" &&
    directParentSeq !== threadRootSeq;

  return (
    <article
      id={`e-${entry.id}`}
      className={[
        "group rounded-2xl border bg-white transition-all",
        compact
          ? "px-4 py-3 border-zinc-100 hover:border-zinc-200"
          : "px-6 py-5 border-zinc-200 hover:border-zinc-300",
        isModeration ? "border-amber-200/80 bg-amber-50/30" : "",
        justPosted ? "post-flash" : "",
      ].filter(Boolean).join(" ")}
    >
      <header
        className={[
          "flex flex-wrap items-center justify-between gap-3",
          compact ? "mb-2" : "mb-3",
        ].join(" ")}
      >
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
          {showAtMention && (
            <a
              href={`#e-${entry.parent}`}
              className="ml-1 inline-flex items-center gap-0.5 rounded-full bg-zinc-100 text-zinc-700 px-2 py-0.5 text-[11px] font-mono no-underline hover:bg-zinc-200 transition-colors"
              title={`Reply to #${directParentSeq}`}
            >
              <AtSign size={10} strokeWidth={2.25} />
              <span>#{directParentSeq}</span>
            </a>
          )}
          {!compact && parentSnippet && (
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

      <div className={compact ? "prose-entry text-sm" : "prose-entry"}>
        {erased ? (
          <p className="italic text-zinc-500">
            [body erased
            {body?.erased_reason ? `: ${body.erased_reason}` : ""}]
          </p>
        ) : text ? (
          highlight ? (
            // Search active: render plain text with <Highlight> so matches
            // are marked. Preserves paragraph breaks via simple split on
            // blank lines; gives up other markdown formatting until the
            // search is cleared.
            text.split(/\n\n+/).map((para, i) => (
              <p key={i} className="whitespace-pre-wrap">
                <Highlight text={para} q={highlight} />
              </p>
            ))
          ) : (
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              disallowedElements={["script", "iframe", "style", "img"]}
              unwrapDisallowed
            >
              {text}
            </ReactMarkdown>
          )
        ) : (
          <p className="text-zinc-300">[loading…]</p>
        )}
      </div>

      <footer className={compact ? "mt-2 flex items-center gap-3" : "mt-4 flex items-center gap-3"}>
        <button
          type="button"
          onClick={() => onReply(entry)}
          className={[
            "inline-flex items-center gap-1.5 text-zinc-500 hover:text-zinc-900 transition-colors",
            compact ? "text-xs" : "text-sm",
          ].join(" ")}
        >
          <Reply size={compact ? 12 : 14} strokeWidth={2} />
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
