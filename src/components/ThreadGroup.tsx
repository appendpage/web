"use client";

/**
 * ThreadGroup — Xiaohongshu/Threads-style 1-level threaded card.
 *
 * Renders one Thread (a top-level entry plus all its transitive descendants)
 * as a coherent visual unit:
 *
 *   ┌─────────────────────────────────┐
 *   │  full-size root EntryCard       │
 *   └─────────────────────────────────┘
 *      │
 *      │  compact reply 1 (oldest)
 *      │  compact reply 2
 *      │  [ Show N more replies ▾ ]   ← only if >2 descendants
 *
 * Indented descendants share a thin vertical guide line (the left border)
 * so the grouping is obvious even when a reply runs long. Replies render
 * in chronological order (oldest first) so the conversation reads
 * top-to-bottom like an instant message thread.
 *
 * Replies-to-replies are visually flat (no second-level indent); the
 * reader knows a reply is answering some other reply (not the root)
 * because the compact EntryCard prepends a small "@#N" tag.
 *
 * Just-posted highlighting flows through unchanged — the flash class is
 * keyed by entry id, which matches whether the new entry is the root or
 * a descendant inside the thread.
 */
import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

import type { ChainEntry, EntryWithBody } from "@/lib/types";
import type { Thread } from "@/lib/threads";

import { EntryCard } from "./EntryCard";

interface Props {
  thread: Thread;
  bodies: Record<string, EntryWithBody>;
  onReply: (entry: ChainEntry) => void;
  justPostedId: string | null;
}

/** How many replies to show by default before collapsing the rest behind
 *  a "Show N more replies" toggle. Matches the Xiaohongshu / Threads
 *  default — enough to convey "there's a conversation here" without
 *  overwhelming the root. */
const REPLIES_INITIAL = 2;

export function ThreadGroup({
  thread,
  bodies,
  onReply,
  justPostedId,
}: Props) {
  const [expanded, setExpanded] = useState(false);

  const totalReplies = thread.descendants.length;
  const collapseEligible = totalReplies > REPLIES_INITIAL;
  const visibleReplies =
    collapseEligible && !expanded
      ? thread.descendants.slice(0, REPLIES_INITIAL)
      : thread.descendants;
  const hiddenReplyCount =
    collapseEligible && !expanded ? totalReplies - REPLIES_INITIAL : 0;

  // If the user just posted a reply that lands inside this thread but is
  // currently hidden behind the collapse, auto-expand so the post-flash is
  // visible. Cheap check; runs every render but only flips state once.
  if (
    !expanded &&
    justPostedId &&
    thread.descendants.some(
      (d, i) => d.entry.id === justPostedId && i >= REPLIES_INITIAL,
    )
  ) {
    setExpanded(true);
  }

  return (
    <section className="space-y-2">
      <EntryCard
        entry={thread.root}
        body={bodies[thread.root.id] ?? null}
        onReply={onReply}
        justPosted={thread.root.id === justPostedId}
      />
      {totalReplies > 0 && (
        <div className="ml-6 sm:ml-10 border-l-2 border-zinc-100 pl-4 sm:pl-5 space-y-2">
          {visibleReplies.map((d) => (
            <EntryCard
              key={d.entry.id}
              entry={d.entry}
              body={bodies[d.entry.id] ?? null}
              onReply={onReply}
              justPosted={d.entry.id === justPostedId}
              compact
              directParentSeq={d.directParentSeq}
              threadRootSeq={thread.root.seq}
            />
          ))}
          {(hiddenReplyCount > 0 || expanded) && collapseEligible && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-900 transition-colors px-2 py-1 -ml-2 rounded"
            >
              {expanded ? (
                <>
                  <ChevronUp size={12} strokeWidth={2.25} />
                  Show fewer replies
                </>
              ) : (
                <>
                  <ChevronDown size={12} strokeWidth={2.25} />
                  Show {hiddenReplyCount} more{" "}
                  {hiddenReplyCount === 1 ? "reply" : "replies"}
                </>
              )}
            </button>
          )}
        </div>
      )}
    </section>
  );
}
