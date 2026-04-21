"use client";

import { ChevronRight, Download, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import type {
  ChainEntry,
  EntryWithBody,
  TagsResponse,
} from "@/lib/types";
import { AiView } from "./AiView";
import { CodeBlock } from "./CodeBlock";
import { Composer } from "./Composer";
import { EntryCard } from "./EntryCard";
import { ViewSwitcher, type ViewId } from "./ViewSwitcher";

interface Props {
  slug: string;
  description: string;
  view: ViewId;
  entries: ChainEntry[];
  bodies: Record<string, EntryWithBody>;
  rawSnippet: string;
  /** Tags-view payload (the new AI view). null on backend error. */
  aiTags:
    | { kind: "ok"; data: TagsResponse }
    | { kind: "error"; status: number; error: string; message?: string }
    | null;
  /** Initial ?tag=... for the AI view (filter + URL preserve). */
  initialTag?: string;
  /** Initial ?q=... for the AI view (search filter). */
  initialQuery?: string;
}

export function PageView({
  slug,
  description,
  view,
  entries,
  bodies,
  rawSnippet,
  aiTags,
  initialTag,
  initialQuery,
}: Props) {
  const [replyTo, setReplyTo] = useState<ChainEntry | null>(null);

  const entriesById = useMemo(() => {
    const m = new Map<string, ChainEntry>();
    for (const e of entries) m.set(e.id, e);
    return m;
  }, [entries]);

  return (
    <main className="mx-auto max-w-5xl px-6 py-10 sm:py-14">
      {/* Page header */}
      <header className="mb-8">
        <nav className="text-sm text-zinc-500 mb-3 flex items-center gap-1.5">
          <Link href="/" className="no-underline hover:text-zinc-900">
            append.page
          </Link>
          <ChevronRight size={14} className="text-zinc-300" />
          <span className="font-mono text-zinc-700">/p/{slug}</span>
        </nav>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-zinc-900">
              /p/{slug}
            </h1>
            {description && (
              <p className="mt-2 text-zinc-600 max-w-2xl">{description}</p>
            )}
          </div>
          <div className="text-xs text-zinc-500 flex items-center gap-4">
            <span>
              <span className="font-mono text-zinc-900 tabular-nums">
                {entries.length}
              </span>{" "}
              {entries.length === 1 ? "entry" : "entries"}
            </span>
            <Link
              href={`/p/${encodeURIComponent(slug)}/audit`}
              className="inline-flex items-center gap-1 no-underline hover:text-zinc-900"
            >
              <ShieldCheck size={13} />
              Audit
            </Link>
          </div>
        </div>
      </header>

      {/* Pill bar */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <ViewSwitcher current={view} />
      </div>

      {/* Active view */}
      {view === "ai" && (
        <>
          {aiTags?.kind === "ok" ? (
            <AiView
              slug={slug}
              entries={entries}
              bodies={bodies}
              tags={aiTags.data}
              initialTag={initialTag}
              initialQuery={initialQuery}
              onReply={setReplyTo}
            />
          ) : (
            <AiViewFallback
              slug={slug}
              entryCount={entries.length}
              status={aiTags}
            />
          )}
        </>
      )}

      {view === "chrono" && (
        <ChronoView
          entries={entries}
          bodies={bodies}
          entriesById={entriesById}
          onReply={setReplyTo}
        />
      )}

      {view === "raw" && <RawView slug={slug} rawSnippet={rawSnippet} />}

      {/* Sticky composer */}
      <div className="sticky bottom-4 mt-12 z-10">
        <Composer
          slug={slug}
          parent={replyTo}
          onClearParent={() => setReplyTo(null)}
        />
      </div>
    </main>
  );
}

// ---------- Chronological view ----------

function ChronoView({
  entries,
  bodies,
  onReply,
}: {
  entries: ChainEntry[];
  bodies: Record<string, EntryWithBody>;
  entriesById: Map<string, ChainEntry>;
  onReply: (e: ChainEntry) => void;
}) {
  if (entries.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-300 bg-white/60 p-12 text-center">
        <p className="text-base font-medium text-zinc-900">No entries yet.</p>
        <p className="mt-2 text-sm text-zinc-500 max-w-sm mx-auto">
          Be the first to post. Posts here can&apos;t be silently edited or
          deleted.
        </p>
      </div>
    );
  }

  const ordered = [...entries].reverse();

  return (
    <div className="space-y-3 fade-in">
      {ordered.map((e) => {
        const parentSnippet =
          e.parent && bodies[e.parent]?.body
            ? bodies[e.parent]!.body!.replace(/\s+/g, " ")
            : undefined;
        return (
          <EntryCard
            key={e.id}
            entry={e}
            body={bodies[e.id] ?? null}
            parentSnippet={parentSnippet}
            onReply={onReply}
          />
        );
      })}
    </div>
  );
}

// ---------- Raw view ----------

function RawView({ slug, rawSnippet }: { slug: string; rawSnippet: string }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white overflow-hidden fade-in">
      <div className="border-b border-zinc-200 px-5 py-3 flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-500">
        <span>
          JCS-canonicalized JSONL · one entry per line · the canonical wire
          format
        </span>
        <div className="flex flex-wrap items-center gap-3">
          <a
            href={`/p/${encodeURIComponent(slug)}/raw`}
            className="inline-flex items-center gap-1 no-underline hover:text-zinc-900"
          >
            <Download size={12} />
            Download
          </a>
          <a
            href="https://huggingface.co/datasets/appendpage/ledger"
            className="no-underline hover:text-zinc-900"
          >
            HF mirror
          </a>
        </div>
      </div>
      <div className="max-h-[60vh] overflow-auto">
        <CodeBlock tone="light">{rawSnippet}</CodeBlock>
      </div>
      <div className="border-t border-zinc-200 px-5 py-3 text-xs text-zinc-500">
        <p className="mb-2">Verify the chain in one command:</p>
        <CodeBlock>
          {`curl -sS https://append.page/p/${slug}/raw | python tools/verify.py /dev/stdin`}
        </CodeBlock>
      </div>
    </div>
  );
}

// ---------- AI view fallback ----------

function AiViewFallback({
  slug,
  entryCount,
  status,
}: {
  slug: string;
  entryCount: number;
  status:
    | { kind: "error"; status: number; error: string; message?: string }
    | null;
}) {
  let headline: string;
  let message: string;

  if (entryCount === 0) {
    headline = "Be the first to post.";
    message =
      "Posts here can't be silently edited or deleted. Once you post, this view will tag entries automatically so you can filter by person, place, or topic.";
  } else if (status?.kind === "error" && status.error === "budget_exceeded") {
    headline = "AI tagging paused for cost.";
    message =
      status.message ??
      "The daily OpenAI budget cap was reached. Tagging resumes at 00:00 UTC. The data is unaffected — switch to chronological or raw.";
  } else if (status?.kind === "error") {
    headline = "Couldn't load tags.";
    message =
      "The tag service didn't respond. Try the chronological view; the tags view will retry on the next page load.";
  } else {
    headline = "Loading tags…";
    message = "Refresh in a moment.";
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-10 text-center fade-in">
      <div className="text-xs uppercase tracking-wide text-zinc-500 font-medium mb-3">
        AI view
      </div>
      <h2 className="text-xl font-semibold tracking-tight text-zinc-900 mb-3">
        {headline}
      </h2>
      <p className="text-sm text-zinc-600 max-w-md mx-auto leading-relaxed mb-5">
        {message}
      </p>
      <div className="flex justify-center gap-3 text-sm">
        <Link
          href={`/p/${encodeURIComponent(slug)}?view=chrono`}
          className="rounded-full bg-zinc-900 text-white px-4 py-2 no-underline hover:bg-zinc-800 transition-colors"
        >
          Open chronological
        </Link>
        <a
          href={`/p/${encodeURIComponent(slug)}/raw`}
          className="rounded-full border border-zinc-200 bg-white text-zinc-900 px-4 py-2 no-underline hover:border-zinc-900 transition-colors"
        >
          Download raw
        </a>
      </div>
    </div>
  );
}
