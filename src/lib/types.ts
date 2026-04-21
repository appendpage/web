/**
 * Wire-format types. Hand-written to match /api/spec.json. In v1 these get
 * codegen'd from the live spec endpoint.
 *
 * See https://append.page/AGENTS.md for the canonical spec.
 */

export type EntryKind = "entry" | "moderation";

export interface ChainEntry {
  id: string;
  page: string;
  seq: number;
  kind: EntryKind;
  parent: string | null;
  body_commitment: string;
  created_at: string;
  prev_hash: string;
  hash: string;
}

export interface PageInfo {
  slug: string;
  status: "live" | "queued_review";
  description?: string;
  entry_count?: number;
}

export interface EntryWithBody {
  entry: ChainEntry;
  body: string | null;
  erased: boolean;
  erased_reason?: string;
}

// ---------- LLM view ----------

export interface ViewJson {
  groupings: Array<{
    label: string;
    summary: string | null;
    entry_ids: string[];
  }>;
  section_summaries: Array<{
    label: string;
    text: string;
  }>;
  callouts: Array<{
    tone: "neutral" | "warning" | "info";
    text: string;
    related_entry_ids: string[];
  }>;
  suggested_filters: Array<{
    label: string;
    natural_language: string;
  }>;
}

export interface ViewResponse {
  view: ViewJson;
  head_hash: string;
  cached: boolean;
  cost_usd: number;
  generated_at: string;
  model?: string;
  generation_seconds?: number;
  /** When true, this view was generated before the current head_hash. */
  stale?: boolean;
  /** The head_hash this view was generated against (only set if stale). */
  cache_head_hash?: string;
  /** How many entries were posted after this view was generated. */
  entries_since_cache?: number;
}

export interface ViewError {
  error: string;
  message?: string;
}
