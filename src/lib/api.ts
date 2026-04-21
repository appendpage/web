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
import type { ChainEntry, EntryWithBody } from "./types";

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
