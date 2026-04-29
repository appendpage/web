/**
 * <Highlight text="..." q="..." /> — wraps every case-insensitive substring
 * match of `q` inside `text` with a <mark> element so the match jumps out
 * visually. Used by DocView (section heading + summary + key_points) and
 * EntryCard (entry body) when a search query is active.
 *
 * If `q` is empty/falsy or `text` doesn't contain it, the original text is
 * returned unchanged so the renderer doesn't pay a wrap-cost in the no-q
 * baseline. Pure presentation; no state.
 */
import type { ReactNode } from "react";

import { highlightSegments, normalizeQuery } from "@/lib/search";

interface Props {
  text: string;
  /** Already-normalized query (lowercased). Falsy => no highlight. */
  q: string;
}

export function Highlight({ text, q }: Props): ReactNode {
  // Defensive normalize — callers should already pass a normalized q,
  // but a stray uppercase or whitespace shouldn't break the highlight.
  const needle = normalizeQuery(q);
  if (!needle) return text;
  const segments = highlightSegments(text, needle);
  if (segments.length === 1 && !segments[0]!.isMatch) return text;
  return (
    <>
      {segments.map((seg, i) =>
        seg.isMatch ? (
          <mark
            key={i}
            className="bg-yellow-200/70 text-zinc-900 rounded-sm px-0.5"
          >
            {seg.text}
          </mark>
        ) : (
          <span key={i}>{seg.text}</span>
        ),
      )}
    </>
  );
}
