"use client";

import { useMemo, useState } from "react";

import type { ChainEntry, EntryWithBody } from "@/lib/types";
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
}: Props) {
  const [replyTo, setReplyTo] = useState<ChainEntry | null>(null);

  const entriesById = useMemo(() => {
    const m = new Map<string, ChainEntry>();
    for (const e of entries) m.set(e.id, e);
    return m;
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
        <AiViewPlaceholder slug={slug} entryCount={entries.length} />
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

// ---------- AI view placeholder ----------

function AiViewPlaceholder({
  slug,
  entryCount,
}: {
  slug: string;
  entryCount: number;
}) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-8">
      <div className="text-xs uppercase tracking-wide text-zinc-500 mb-2">
        AI view
      </div>
      <h2 className="text-lg font-semibold mb-2">
        AI-organized view is coming online.
      </h2>
      <p className="text-sm text-zinc-600 mb-4">
        The AI view is the default presentation: an LLM reads {entryCount}{" "}
        {entryCount === 1 ? "entry" : "entries"} on this page and groups them
        by topic, surfaces summaries, and highlights notable threads. It runs
        once per page-update and is cached.
      </p>
      <p className="text-sm text-zinc-600">
        Until it&apos;s wired up, switch to the{" "}
        <button
          type="button"
          onClick={() => {
            const url = new URL(window.location.href);
            url.searchParams.set("view", "chrono");
            window.location.href = url.toString();
          }}
          className="text-zinc-900 underline underline-offset-2"
        >
          chronological view
        </button>{" "}
        to read the page now. Same data, different presentation —{" "}
        <a
          href={`/p/${encodeURIComponent(slug)}/raw`}
          className="no-underline hover:underline"
        >
          and the raw JSONL is always available
        </a>
        .
      </p>
    </div>
  );
}
