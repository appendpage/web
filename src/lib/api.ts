/**
 * Server-side fetch helpers for the backend API.
 *
 * Browser-side calls use same-origin fetch (e.g. `fetch('/p/foo/entries', ...)`)
 * because nginx routes those paths to the backend. This module is for SSR
 * only — Next.js server components need an absolute URL.
 *
 * Set APPEND_PAGE_API_URL to whatever backend you want this fork to read
 * from (the official one at https://append.page, your own deploy, anything
 * spec-compatible).
 */
import type {
  ChainEntry,
  EntryWithBody,
  PageListItem,
  TagsResponse,
  ViewResponse,
} from "./types";

const API_URL =
  process.env.APPEND_PAGE_API_URL ?? "https://append.page";

/** Fetch the JSONL chain for a page. Returns parsed entries in order. */
export async function fetchChain(slug: string): Promise<ChainEntry[]> {
  const res = await fetch(`${API_URL}/p/${encodeURIComponent(slug)}/raw`, {
    cache: "no-store",
  });
  if (res.status === 404) return [];
  if (!res.ok) {
    throw new Error(`fetchChain(${slug}): ${res.status} ${res.statusText}`);
  }
  const text = await res.text();
  return text
    .split("\n")
    .filter((line) => line.length > 0)
    .map((line) => JSON.parse(line) as ChainEntry);
}

/**
 * Fetch a single entry's body. Returns null if the page or entry is missing,
 * or { erased: true } if the body has been removed.
 */
export async function fetchEntryBody(
  slug: string,
  entryId: string,
): Promise<EntryWithBody | null> {
  const res = await fetch(
    `${API_URL}/p/${encodeURIComponent(slug)}/e/${encodeURIComponent(entryId)}`,
    { cache: "no-store" },
  );
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(
      `fetchEntryBody(${slug}, ${entryId}): ${res.status} ${res.statusText}`,
    );
  }
  return (await res.json()) as EntryWithBody;
}

/**
 * Fetch the bodies for many entries in one batch (POST /p/:slug/bodies with
 * a list of ids). Falls back to per-entry fetches if the bulk endpoint is
 * not yet available on the backend (the bulk endpoint is added in Phase B).
 */
export async function fetchBodies(
  slug: string,
  entryIds: string[],
): Promise<Map<string, EntryWithBody>> {
  const result = new Map<string, EntryWithBody>();
  if (entryIds.length === 0) return result;
  const res = await fetch(
    `${API_URL}/p/${encodeURIComponent(slug)}/bodies`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ids: entryIds }),
      cache: "no-store",
    },
  );
  if (res.ok) {
    const json = (await res.json()) as { entries: EntryWithBody[] };
    for (const e of json.entries) result.set(e.entry.id, e);
    return result;
  }
  // Bulk endpoint not implemented yet — fall back to one fetch per entry,
  // capped at 100 to avoid runaway pages during page render.
  const slice = entryIds.slice(0, 100);
  await Promise.all(
    slice.map(async (id) => {
      const body = await fetchEntryBody(slug, id);
      if (body) result.set(id, body);
    }),
  );
  return result;
}

/**
 * Fetch the LLM-generated default view for a page.
 *
 * Defaults to staleOk=true: serve a slightly-stale cached view immediately
 * if the chain has moved on, and let the backend regenerate in the background.
 * The next visit (or refresh) gets the fresh one. This is the "stale-while-
 * revalidate" pattern; without it, every post would block the next AI-view
 * pageload behind a 5-15s LLM call.
 *
 * Set staleOk=false on the rare path where a fresh view is required (e.g.
 * a "regenerate" button click).
 */
export async function fetchDefaultView(
  slug: string,
  opts: { staleOk?: boolean; cacheOnly?: boolean } = {},
): Promise<
  | { kind: "ok"; view: ViewResponse }
  | { kind: "error"; status: number; error: string; message?: string }
  | { kind: "miss" }
> {
  const staleOk = opts.staleOk ?? true;
  const params = new URLSearchParams();
  if (staleOk) params.set("stale_ok", "1");
  if (opts.cacheOnly) params.set("cache_only", "1");
  const qs = params.toString() ? `?${params.toString()}` : "";
  // SSR timeout: 45s if we might fall back to inline gen, 5s when we just
  // want to grab a cached row.
  const timeoutMs = staleOk || opts.cacheOnly ? 5_000 : 45_000;
  const res = await fetch(
    `${API_URL}/p/${encodeURIComponent(slug)}/views/default${qs}`,
    { cache: "no-store", signal: AbortSignal.timeout(timeoutMs) },
  );
  if (res.status === 204) return { kind: "miss" };
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    return {
      kind: "error",
      status: res.status,
      error: json.error ?? "unknown",
      message: json.message,
    };
  }
  return { kind: "ok", view: json as ViewResponse };
}

/**
 * Fetch the per-entry tags for a page (the new "AI view" backend).
 *
 * Defaults to staleOk=true: returns whatever's already cached and lets the
 * backend extract any uncached entries in the background. Frontend shows
 * an indicator when uncached_count > 0.
 */
export async function fetchTags(
  slug: string,
  opts: { staleOk?: boolean } = {},
): Promise<
  | { kind: "ok"; data: TagsResponse }
  | { kind: "error"; status: number; error: string; message?: string }
> {
  const staleOk = opts.staleOk ?? true;
  const params = new URLSearchParams();
  if (staleOk) params.set("stale_ok", "1");
  const qs = params.toString() ? `?${params.toString()}` : "";
  const timeoutMs = staleOk ? 5_000 : 60_000;
  try {
    const res = await fetch(
      `${API_URL}/p/${encodeURIComponent(slug)}/tags${qs}`,
      { cache: "no-store", signal: AbortSignal.timeout(timeoutMs) },
    );
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        kind: "error",
        status: res.status,
        error: json.error ?? "unknown",
        message: json.message,
      };
    }
    return { kind: "ok", data: json as TagsResponse };
  } catch (err) {
    return {
      kind: "error",
      status: 0,
      error: "network",
      message: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * List pages — by default the most-recently-active. Pass `q` to search by
 * slug/description (prefix match ranked first). Used for the landing-page
 * discovery list AND for /new's "did you mean an existing page?" autocomplete.
 */
export async function fetchPageList(
  opts: { q?: string; limit?: number } = {},
): Promise<PageListItem[]> {
  const params = new URLSearchParams();
  if (opts.q) params.set("q", opts.q);
  if (opts.limit) params.set("limit", String(opts.limit));
  const qs = params.toString() ? `?${params.toString()}` : "";
  try {
    const res = await fetch(`${API_URL}/pages${qs}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(4_000),
    });
    if (!res.ok) return [];
    const j = (await res.json()) as { pages: PageListItem[] };
    return Array.isArray(j.pages) ? j.pages : [];
  } catch {
    return [];
  }
}

/** Fetch basic page metadata (status, description, entry count). */
export async function fetchPageInfo(slug: string): Promise<{
  exists: boolean;
  status?: "live" | "queued_review";
  description?: string;
  entry_count?: number;
}> {
  // Until the backend has a /p/:slug/info endpoint, derive from the chain.
  // Keep this cheap by streaming /raw HEAD-only when the backend supports it
  // (Phase B); for now do a 1-byte fetch.
  const chain = await fetchChain(slug);
  if (chain.length === 0) {
    // Distinguish "page exists but empty" from "page does not exist" via a
    // status probe.
    const probe = await fetch(`${API_URL}/p/${encodeURIComponent(slug)}/raw`);
    if (probe.status === 404) return { exists: false };
    return { exists: true, entry_count: 0, status: "live" };
  }
  return { exists: true, entry_count: chain.length, status: "live" };
}
