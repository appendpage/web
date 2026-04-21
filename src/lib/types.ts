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
