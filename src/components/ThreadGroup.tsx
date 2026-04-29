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
 *      │  compact reply (newest)      ← pinned when 4+ descendants, so a
 *      │                                fresh reply that bumped the thread
 *      │                                to the top is immediately visible
 *
 * Indented descendants share a thin vertical guide line (the left border)
 * so the grouping is obvious even when a reply runs long. Replies render
 * in chronological order (oldest first) so the conversation reads
 * top-to-bottom like an instant message thread; the pinned newest at the
 * bottom (Twitter/Threads/Bluesky pattern) gives readers immediate
 * context for why the thread sits where it does in the list.
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
  /**
   * In-page search query, already normalized (lowercased, trimmed). When
   * non-empty, the thread renders ALL descendants (skipping the
   * REPLIES_INITIAL=2 collapse) so a matching reply deep in the tail is
   * visible, and the body text in each EntryCard is highlighted.
   */
  q?: string;
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
  q = "",
}: Props) {
  const [expanded, setExpanded] = useState(false);

  const totalReplies = thread.descendants.length;
  // When a search query is active, force-expand the thread so any matching
  // reply (potentially deep in the tail) is visible. The collapse toggle
  // is intentionally still rendered (so the user can re-collapse), but it
  // starts open.
  const forceExpandAll = q !== "";
  const effectivelyExpanded = expanded || forceExpandAll;
  const collapseEligible = totalReplies > REPLIES_INITIAL;

  // Pin the newest reply at the bottom of the collapsed view when there's
  // at least one truly-hidden reply between the oldest-N and the newest
  // (so 4+ replies). Threads sort by latest activity DESC at the page
  // level — without this pin, a fresh reply that just bumped the thread
  // to the top would silently sit hidden behind the "Show N more" toggle
  // and the visitor would have no idea what bumped it. For 3-reply
  // threads pinning would mean rendering all three with no gap, which is
  // just the uncollapsed view in disguise — skip the visual split there.
  const lastIdx = totalReplies - 1;
  const pinnedNewest =
    collapseEligible && !effectivelyExpanded && lastIdx > REPLIES_INITIAL
      ? thread.descendants[lastIdx]!
      : null;

  const visibleOldest =
    collapseEligible && !effectivelyExpanded
      ? thread.descendants.slice(0, REPLIES_INITIAL)
      : thread.descendants;
  const hiddenReplyCount =
    collapseEligible && !effectivelyExpanded
      ? totalReplies - REPLIES_INITIAL - (pinnedNewest ? 1 : 0)
      : 0;

  // If the user just posted a reply that lands inside this thread but is
  // currently hidden behind the collapse, auto-expand so the post-flash is
  // visible. The "lands in hidden middle" set is descendants with seq
  // index in [REPLIES_INITIAL, lastIdx) — the pinned-newest at lastIdx is
  // already rendered without expanding, so we don't need to fire for it.
  if (
    !expanded &&
    justPostedId &&
    thread.descendants.some(
      (d, i) =>
        d.entry.id === justPostedId &&
        i >= REPLIES_INITIAL &&
        (!pinnedNewest || i < lastIdx),
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
        highlight={q}
      />
      {totalReplies > 0 && (
        <div className="ml-6 sm:ml-10 border-l-2 border-zinc-100 pl-4 sm:pl-5 space-y-2">
          {visibleOldest.map((d) => (
            <EntryCard
              key={d.entry.id}
              entry={d.entry}
              body={bodies[d.entry.id] ?? null}
              onReply={onReply}
              justPosted={d.entry.id === justPostedId}
              compact
              directParentSeq={d.directParentSeq}
              threadRootSeq={thread.root.seq}
              highlight={q}
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
          {pinnedNewest && (
            <EntryCard
              key={pinnedNewest.entry.id}
              entry={pinnedNewest.entry}
              body={bodies[pinnedNewest.entry.id] ?? null}
              onReply={onReply}
              justPosted={pinnedNewest.entry.id === justPostedId}
              compact
              directParentSeq={pinnedNewest.directParentSeq}
              threadRootSeq={thread.root.seq}
              highlight={q}
            />
          )}
        </div>
      )}
    </section>
  );
}
