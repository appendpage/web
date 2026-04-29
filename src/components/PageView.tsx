"use client";

import { Check, ChevronRight, Download, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type {
  ChainEntry,
  DocViewResponse,
  EntryWithBody,
} from "@/lib/types";
import { groupIntoThreads } from "@/lib/threads";
import { CodeBlock } from "./CodeBlock";
import { Composer } from "./Composer";
import { DocView } from "./DocView";
import { ThreadGroup } from "./ThreadGroup";
import { ViewSwitcher, type ViewId } from "./ViewSwitcher";

interface Props {
  slug: string;
  description: string;
  view: ViewId;
  entries: ChainEntry[];
  bodies: Record<string, EntryWithBody>;
  rawSnippet: string;
  /**
   * Doc-view payload (the synthesized, citation-linked AI view). Three
   * shapes:
   *   - { kind: "ok", data }    rendered as the doc
   *   - { kind: "miss" }        no cache yet, falls back to the doc
   *                             placeholder; backend will generate on next
   *                             non-stale fetch
   *   - { kind: "error", ... }  service issue (budget cap, LLM error, ...)
   *   - null                    not requested (view !== "doc")
   */
  docView:
    | { kind: "ok"; data: DocViewResponse }
    | { kind: "miss" }
    | { kind: "error"; status: number; error: string; message?: string }
    | null;
}

export function PageView({
  slug,
  description,
  view,
  entries,
  bodies,
  rawSnippet,
  docView,
}: Props) {
  const [replyTo, setReplyTo] = useState<ChainEntry | null>(null);
  /**
   * After a successful POST, the Composer hands us the new entry's id.
   * We:
   *   1. Show a small "Posted ✓" confirmation toast (2s).
   *   2. Scroll to #e-<id> once it renders (SSR refresh is async — we
   *      poll for the node on a short RAF loop for up to 2s).
   *   3. Keep the id in state so EntryCard can apply the .post-flash class
   *      and the user can locate the new entry even on a long page.
   */
  const [justPostedId, setJustPostedId] = useState<string | null>(null);
  const [showPostedToast, setShowPostedToast] = useState(false);
  const flashClearRef = useRef<number | null>(null);

  const handlePostSuccess = useCallback((id: string) => {
    setJustPostedId(id);
    setShowPostedToast(true);
    window.setTimeout(() => setShowPostedToast(false), 1800);
    if (flashClearRef.current) window.clearTimeout(flashClearRef.current);
    flashClearRef.current = window.setTimeout(() => {
      setJustPostedId((current) => (current === id ? null : current));
    }, 4000);
  }, []);

  // Scroll the new entry into view once React finishes re-rendering with
  // the SSR-refreshed data. The node is named `e-<id>`. We retry for ~2s
  // because router.refresh() is fire-and-forget.
  useEffect(() => {
    if (!justPostedId) return;
    let cancelled = false;
    let attempts = 0;
    function tryScroll() {
      if (cancelled) return;
      const el = document.getElementById(`e-${justPostedId}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }
      if (attempts++ < 20) window.setTimeout(tryScroll, 100);
    }
    tryScroll();
    return () => {
      cancelled = true;
    };
  }, [justPostedId, entries.length]);

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
      {view === "doc" && (
        <>
          {docView?.kind === "ok" ? (
            <DocView slug={slug} data={docView.data} entries={entries} />
          ) : (
            <DocViewFallback
              slug={slug}
              entryCount={entries.length}
              status={docView}
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
          justPostedId={justPostedId}
        />
      )}

      {view === "raw" && <RawView slug={slug} rawSnippet={rawSnippet} />}

      {/* Sticky composer */}
      <div className="sticky bottom-4 mt-12 z-10">
        <Composer
          slug={slug}
          parent={replyTo}
          onClearParent={() => setReplyTo(null)}
          onPostSuccess={handlePostSuccess}
        />
      </div>

      {/* Transient "Posted ✓" confirmation toast. Lives as a fixed overlay
          so it's visible whether the user is at the top of the list or still
          near the composer. Auto-fades after ~1.8s. */}
      {showPostedToast && (
        <div
          aria-live="polite"
          className="fixed left-1/2 top-6 z-50 -translate-x-1/2 rounded-full bg-zinc-900 px-4 py-2 text-sm text-white shadow-lg ring-1 ring-zinc-900/10 fade-in pointer-events-none inline-flex items-center gap-1.5"
        >
          <Check size={14} strokeWidth={2.5} />
          Posted
        </div>
      )}
    </main>
  );
}

// ---------- Chronological view ----------

function ChronoView({
  entries,
  bodies,
  onReply,
  justPostedId,
}: {
  entries: ChainEntry[];
  bodies: Record<string, EntryWithBody>;
  entriesById: Map<string, ChainEntry>;
  onReply: (e: ChainEntry) => void;
  justPostedId: string | null;
}) {
  // Group the flat chain into Xiaohongshu/Threads-style 1-level threads:
  // each top-level post anchors its descendants underneath, sorted oldest-
  // first within the thread so the conversation reads top-to-bottom.
  // Threads themselves are sorted by latest activity DESC, so threads with
  // recent replies bubble to the top — engagement-style ordering that
  // matches reader expectations on conversational platforms. The Raw view
  // remains the strict-chronological JSONL firehose for power users.
  const threads = useMemo(() => groupIntoThreads(entries), [entries]);

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

  return (
    <div className="space-y-5 fade-in">
      {threads.map((t) => (
        <ThreadGroup
          key={t.root.id}
          thread={t}
          bodies={bodies}
          onReply={onReply}
          justPostedId={justPostedId}
        />
      ))}
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
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
          <a
            href={`/p/${encodeURIComponent(slug)}/raw`}
            className="inline-flex items-center gap-1 no-underline hover:text-zinc-900"
            title="JCS-canonicalized chain, one entry per line"
          >
            <Download size={12} />
            Chain (.jsonl)
          </a>
          <a
            href={`/p/${encodeURIComponent(slug)}/bodies.jsonl`}
            className="inline-flex items-center gap-1 no-underline hover:text-zinc-900"
            title="Body + salt per line, same order as the chain"
          >
            <Download size={12} />
            Bodies (.jsonl)
          </a>
          <a
            href={`/p/${encodeURIComponent(slug)}/archive.zip`}
            className="inline-flex items-center gap-1 no-underline hover:text-zinc-900"
            title="Chain + bodies + verifier + README, all in one zip"
          >
            <Download size={12} />
            Everything (.zip)
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
      <div className="border-t border-zinc-200 px-5 py-3 text-xs text-zinc-500 space-y-3">
        <div>
          <p className="mb-2">
            Verify chain + every body live, in one command:
          </p>
          <CodeBlock>
            {`python verify.py https://append.page/p/${slug}`}
          </CodeBlock>
        </div>
        <div>
          <p className="mb-2">
            Or extract <span className="font-mono">archive.zip</span> and
            verify offline (no network):
          </p>
          <CodeBlock>
            {`python verify.py chain.jsonl --with-bodies bodies.jsonl`}
          </CodeBlock>
        </div>
      </div>
    </div>
  );
}

// ---------- Doc view fallback ----------

function DocViewFallback({
  slug,
  entryCount,
  status,
}: {
  slug: string;
  entryCount: number;
  status:
    | { kind: "miss" }
    | { kind: "error"; status: number; error: string; message?: string }
    | null;
}) {
  let headline: string;
  let message: string;

  if (entryCount === 0) {
    headline = "Be the first to post.";
    message =
      "Posts here can't be silently edited or deleted. Once a few posts arrive, this view will synthesize them into a citation-linked document.";
  } else if (status?.kind === "miss") {
    headline = "Generating the document…";
    message =
      "We're synthesizing this page's posts into an organized, citation-linked summary. Refresh in a few seconds — or read the chronological view in the meantime.";
  } else if (status?.kind === "error" && status.error === "budget_exceeded") {
    headline = "Doc view paused for cost.";
    message =
      status.message ??
      "The daily OpenAI budget cap was reached. The doc view resumes at 00:00 UTC. The data is unaffected — read it chronologically or raw.";
  } else if (status?.kind === "error") {
    headline = "Couldn't load the document.";
    message =
      "The synthesis service didn't respond. Try the chronological view; the doc view will retry on the next page load.";
  } else {
    headline = "Loading the document…";
    message = "Refresh in a moment.";
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-10 text-center fade-in">
      <div className="text-xs uppercase tracking-wide text-zinc-500 font-medium mb-3">
        Doc view
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
