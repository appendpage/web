/**
 * Tiny search helpers for the in-page "Find on this page" filter.
 *
 * Pure functions, no deps. Used by:
 *   - SearchBar (URL state)
 *   - DocView (filter + highlight sections / key_points)
 *   - ThreadGroup + EntryCard (filter + highlight thread bodies)
 *
 * Substring matching only; no fuzzy / no regex / no tokenization. The use
 * case is "is Prof X mentioned anywhere on this page?" — a literal needle
 * is exactly right and matches the way users type into a "Find on this
 * page" box (Cmd-F mental model).
 */

/**
 * Trim + lowercase. Returns "" for falsy/whitespace-only input so callers
 * can do `if (q) ...` to gate the whole filter pipeline. Lowercasing here
 * once means callers don't have to remember to do it themselves.
 */
export function normalizeQuery(q: string | null | undefined): string {
  if (!q) return "";
  return q.trim().toLowerCase();
}

/**
 * Case-insensitive substring match. `needle` must already be normalized
 * (lowercased). Null/undefined haystacks return false rather than
 * throwing, so callers can ad-hoc test fields that may not exist
 * (e.g. body of an erased entry).
 */
export function matches(
  haystack: string | null | undefined,
  needle: string,
): boolean {
  if (!needle) return true; // empty query matches everything
  if (!haystack) return false;
  return haystack.toLowerCase().includes(needle);
}

/**
 * Split `text` into alternating match / non-match segments so a renderer
 * can wrap the matched ones in <mark>. `needle` must already be
 * normalized (lowercased). Empty needle returns the whole text as a
 * single non-match segment so the renderer doesn't have to special-case
 * it.
 *
 * Example: highlightSegments("Hello World", "world") =>
 *   [
 *     { text: "Hello ", isMatch: false },
 *     { text: "World",  isMatch: true  },
 *   ]
 *
 * The matched segment preserves the ORIGINAL casing from `text` (so
 * "World" stays "World", not "world"), which keeps the visual look of
 * the page intact.
 */
export interface HighlightSegment {
  text: string;
  isMatch: boolean;
}

export function highlightSegments(
  text: string,
  needle: string,
): HighlightSegment[] {
  if (!needle || !text) {
    return [{ text: text ?? "", isMatch: false }];
  }
  const lower = text.toLowerCase();
  const segments: HighlightSegment[] = [];
  let cursor = 0;
  while (cursor < text.length) {
    const idx = lower.indexOf(needle, cursor);
    if (idx === -1) {
      segments.push({ text: text.slice(cursor), isMatch: false });
      break;
    }
    if (idx > cursor) {
      segments.push({ text: text.slice(cursor, idx), isMatch: false });
    }
    segments.push({
      text: text.slice(idx, idx + needle.length),
      isMatch: true,
    });
    cursor = idx + needle.length;
  }
  return segments;
}

/**
 * Count occurrences of `needle` in `text`. Used by the match-count banner
 * ("12 matches across 3 sections"). Cheap; iterates the lowercased text
 * once with indexOf.
 */
export function countMatches(
  haystack: string | null | undefined,
  needle: string,
): number {
  if (!needle || !haystack) return 0;
  const lower = haystack.toLowerCase();
  let count = 0;
  let cursor = 0;
  while (true) {
    const idx = lower.indexOf(needle, cursor);
    if (idx === -1) break;
    count += 1;
    cursor = idx + needle.length;
  }
  return count;
}
