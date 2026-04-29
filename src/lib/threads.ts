/**
 * Group a flat chain of entries into threads for the conversational
 * (Xiaohongshu/Threads-style) chrono view.
 *
 * Each top-level entry (parent === null) anchors a Thread; all of its
 * transitive descendants (replies, replies-to-replies, ...) collapse into
 * a single flat list under it, sorted by seq ascending so the conversation
 * reads top-to-bottom in natural chronological order.
 *
 * For each descendant we also record `directParentSeq`: the seq of the
 * descendant's IMMEDIATE parent. The renderer uses this to decide whether
 * to prepend a small "@#N" tag — if directParentSeq equals the thread root's
 * seq, the parent is implied by indentation and we render nothing extra; if
 * it points at a sibling within the thread, the @#N tag tells the reader
 * which sibling this reply is answering. This is the "flat 1-level threading"
 * pattern; we never indent more than once visually, regardless of chain
 * depth.
 *
 * Edge cases handled:
 *   - Orphan entries (parent_id points to something not in the input list,
 *     e.g. truncated payload or stale cache) become their own thread root.
 *   - Moderation entries are top-level threads in their own right and never
 *     get folded under a regular entry, even if their parent_id happens to
 *     match one (kind="moderation" entries are admin actions, not replies).
 *
 * Threads are returned sorted by `latestActivityIso` DESC so threads with
 * recent replies bubble to the top — the engagement-style ordering that
 * matches reader expectations on conversational platforms.
 *
 * Pure function. No side effects. Stable across calls with the same input.
 */
import type { ChainEntry } from "./types";

export interface ThreadDescendant {
  entry: ChainEntry;
  /**
   * Seq of the IMMEDIATE parent (one step up the reply chain). Equals the
   * thread root's seq when the descendant is a direct reply to the root;
   * differs when it's a reply-to-a-reply within the same thread, in which
   * case the renderer shows an "@#N" tag.
   */
  directParentSeq: number;
}

export interface Thread {
  root: ChainEntry;
  descendants: ThreadDescendant[];
  /** ISO timestamp of the newest member (root or any descendant). Used for
   *  sorting threads by recent activity. */
  latestActivityIso: string;
}

export function groupIntoThreads(entries: ChainEntry[]): Thread[] {
  if (entries.length === 0) return [];

  const byId = new Map<string, ChainEntry>();
  for (const e of entries) byId.set(e.id, e);

  // children of each entry id, in stable order. Build by iterating entries
  // in seq ascending so children come out in seq order naturally.
  const childrenOf = new Map<string, ChainEntry[]>();
  const sortedBySeq = [...entries].sort((a, b) => a.seq - b.seq);
  for (const e of sortedBySeq) {
    if (e.parent && byId.has(e.parent) && e.kind !== "moderation") {
      // Moderation entries never fold into another thread — they're admin
      // actions and surface as their own top-level rows for visibility.
      const list = childrenOf.get(e.parent) ?? [];
      list.push(e);
      childrenOf.set(e.parent, list);
    }
  }

  // Roots: entries with no parent_id, OR whose parent_id we couldn't find
  // in the input (orphan = render as its own thread root), OR moderation
  // entries (always top-level).
  const roots: ChainEntry[] = [];
  for (const e of sortedBySeq) {
    const parentMissing = e.parent !== null && !byId.has(e.parent);
    if (e.parent === null || parentMissing || e.kind === "moderation") {
      roots.push(e);
    }
  }

  function flattenDescendants(
    rootId: string,
    rootSeq: number,
  ): ThreadDescendant[] {
    const out: ThreadDescendant[] = [];
    // BFS that records the immediate parent of each visited node, but emits
    // the result sorted by seq ascending so the thread reads chronologically
    // regardless of branching.
    const queue: ChainEntry[] = [];
    const directParent = new Map<string, number>();
    for (const child of childrenOf.get(rootId) ?? []) {
      queue.push(child);
      directParent.set(child.id, rootSeq);
    }
    while (queue.length > 0) {
      const node = queue.shift()!;
      out.push({
        entry: node,
        directParentSeq: directParent.get(node.id) ?? rootSeq,
      });
      for (const grand of childrenOf.get(node.id) ?? []) {
        if (!directParent.has(grand.id)) {
          directParent.set(grand.id, node.seq);
          queue.push(grand);
        }
      }
    }
    out.sort((a, b) => a.entry.seq - b.entry.seq);
    return out;
  }

  const threads: Thread[] = roots.map((root) => {
    const descendants = flattenDescendants(root.id, root.seq);
    let latest = root.created_at;
    for (const d of descendants) {
      if (d.entry.created_at > latest) latest = d.entry.created_at;
    }
    return { root, descendants, latestActivityIso: latest };
  });

  // Sort threads by recent activity DESC so active conversations float up.
  // Tiebreaker: root.seq DESC (newer thread roots win) for determinism.
  threads.sort((a, b) => {
    if (a.latestActivityIso === b.latestActivityIso) {
      return b.root.seq - a.root.seq;
    }
    return a.latestActivityIso < b.latestActivityIso ? 1 : -1;
  });

  return threads;
}
