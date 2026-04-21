"use client";

import { useMemo, useState } from "react";

import type {
  ChainEntry,
  EntryWithBody,
  ViewResponse,
} from "@/lib/types";
import { AiView } from "./AiView";
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
  /**
   * AI view payload, fetched server-side. null if not cached yet (page is
   * being generated) or if the budget was exceeded. The error variant lets
   * us render a useful banner.
   */
  aiView:
    | { kind: "ok"; view: ViewResponse }
    | { kind: "error"; status: number; error: string; message?: string }
    | { kind: "miss" }
    | null;
}

/**
 * The /p/<slug> client component. Hosts the pill bar, the active view, the
 * compose box, and Reply state. Server passes pre-fetched entries + bodies;
 * client manages reply target.
 */
export function PageView({
  slug,
  description,
  view,
  entries,
  bodies,
  rawSnippet,
  aiView,
}: Props) {
  const [replyTo, setReplyTo] = useState<ChainEntry | null>(null);

  const entriesById = useMemo(() => {
    const m = new Map<string, ChainEntry>();
    for (const e of entries) m.set(e.id, e);
    return m;
  }, [entries]);

  const entriesByIdRecord = useMemo(() => {
    const r: Record<string, ChainEntry> = {};
    for (const e of entries) r[e.id] = e;
    return r;
  }, [entries]);

  return (
    <main className="mx-auto max-w-3xl px-6 py-8">
      <header className="mb-6">
        <div className="text-xs text-zinc-500 mb-1">
          <a href="/" className="no-underline hover:underline">
            append.page
          </a>{" "}
          /
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">/p/{slug}</h1>
        {description && (
          <p className="mt-2 text-sm text-zinc-600">{description}</p>
        )}
      </header>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <ViewSwitcher current={view} />
        <div className="text-xs text-zinc-500">
          {entries.length} {entries.length === 1 ? "entry" : "entries"} ·{" "}
          <a
            href={`/p/${encodeURIComponent(slug)}/audit`}
            className="no-underline hover:underline"
          >
            audit chain
          </a>
        </div>
      </div>

      {view === "ai" && (
        <>
          {aiView?.kind === "ok" ? (
            <AiView
              slug={slug}
              view={aiView.view.view}
              cached={aiView.view.cached}
              generatedAt={aiView.view.generated_at}
              costUsd={aiView.view.cost_usd}
              bodies={bodies}
              entriesById={entriesByIdRecord}
              onReply={setReplyTo}
            />
          ) : (
            <AiViewFallback
              slug={slug}
              entryCount={entries.length}
              status={aiView}
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

      {view === "raw" && (
        <RawView slug={slug} rawSnippet={rawSnippet} />
      )}

      <div className="sticky bottom-4 mt-8">
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
  entriesById,
  onReply,
}: {
  entries: ChainEntry[];
  bodies: Record<string, EntryWithBody>;
  entriesById: Map<string, ChainEntry>;
  onReply: (e: ChainEntry) => void;
}) {
  if (entries.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-zinc-300 bg-white p-8 text-center text-zinc-500">
        <p className="font-medium text-zinc-700">No entries yet.</p>
        <p className="mt-1 text-sm">
          Be the first to post. Posts here can&apos;t be silently edited or
          deleted.
        </p>
      </div>
    );
  }

  // Newest first per spec; reverse a copy so we don't mutate.
  const ordered = [...entries].reverse();

  return (
    <div className="space-y-3">
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
    <div className="rounded-lg border border-zinc-200 bg-white">
      <div className="border-b border-zinc-200 px-4 py-3 text-xs text-zinc-500 flex items-center justify-between">
        <span>
          JCS-canonicalized JSONL, one entry per line.{" "}
          <a
            href={`/p/${encodeURIComponent(slug)}/raw`}
            className="no-underline hover:underline"
          >
            Download
          </a>{" "}
          ·{" "}
          <a
            href={`https://huggingface.co/datasets/appendpage/ledger`}
            className="no-underline hover:underline"
          >
            HF mirror
          </a>{" "}
          ·{" "}
          <code className="font-mono">
            python verify.py /path/to/file.jsonl
          </code>
        </span>
      </div>
      <pre className="overflow-x-auto whitespace-pre p-4 text-xs font-mono text-zinc-800 max-h-[60vh]">
        {rawSnippet}
      </pre>
    </div>
  );
}

// ---------- AI view fallback ----------
// Rendered when the AI view didn't load: empty page, budget exceeded,
// generation error, or first-time visitor on a fresh chain (cache miss with
// inline generation that timed out).

function AiViewFallback({
  slug,
  entryCount,
  status,
}: {
  slug: string;
  entryCount: number;
  status:
    | { kind: "error"; status: number; error: string; message?: string }
    | { kind: "miss" }
    | null;
}) {
  let headline: string;
  let message: string;

  if (entryCount === 0) {
    headline = "Be the first to post.";
    message =
      "Posts here can't be silently edited or deleted. Once you post, an AI view will organize them by topic.";
  } else if (status?.kind === "error" && status.error === "budget_exceeded") {
    headline = "AI views paused for cost.";
    message =
      status.message ??
      "The daily OpenAI budget cap was reached. AI views will resume at 00:00 UTC. The data is unaffected — switch to chronological or raw.";
  } else if (status?.kind === "error") {
    headline = "AI view didn't generate.";
    message =
      "The LLM render failed. Try the chronological view; AI view will be retried on the next page-update.";
  } else {
    headline = "AI view is generating…";
    message =
      "First time we're rendering this page. The LLM is working on it; refresh in a few seconds, or switch to the chronological view to read now.";
  }

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-8">
      <div className="text-xs uppercase tracking-wide text-zinc-500 mb-2">
        AI view
      </div>
      <h2 className="text-lg font-semibold mb-2">{headline}</h2>
      <p className="text-sm text-zinc-600 mb-4 leading-relaxed">{message}</p>
      <p className="text-sm text-zinc-600">
        <a
          href={`/p/${encodeURIComponent(slug)}?view=chrono`}
          className="text-zinc-900 underline underline-offset-2"
        >
          Open chronological view
        </a>{" "}
        ·{" "}
        <a
          href={`/p/${encodeURIComponent(slug)}/raw`}
          className="no-underline hover:underline"
        >
          download raw JSONL
        </a>
      </p>
    </div>
  );
}
