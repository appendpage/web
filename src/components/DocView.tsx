"use client";

/**
 * DocView — Wikipedia-style synthesis of a page, organized into sections
 * with inline `[#N]` citation markers that link to the underlying entries.
 *
 * Renders the DocViewResponse from /p/<slug>/views/doc. Citation markers
 * are parsed out of free-text strings (intro, summary, key_points.text,
 * conflicting_views.perspectives.view) and turned into clickable
 * superscript footnote links pointing at #e-<entry_id>.
 *
 * Design goals:
 *   - Looks like a curated review article, not a forum.
 *   - Every claim has a footnote you can click to read the original post.
 *   - Disclaimer at the top makes the auto-generation honest and the
 *     citations the source of truth.
 *   - Off-topic posts collapse out of the way but never disappear.
 */
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  EyeOff,
  Loader2,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useState, type ReactNode } from "react";

import type { DocViewResponse } from "@/lib/types";

interface Props {
  slug: string;
  data: DocViewResponse;
}

export function DocView({ slug, data }: Props) {
  const { view, entry_seq_to_id, stale, entries_since_cache } = data;
  const [showOffTopic, setShowOffTopic] = useState(false);

  return (
    <article className="space-y-8 fade-in">
      {/* Disclaimer banner */}
      <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 px-4 py-3 text-xs text-zinc-700 leading-relaxed flex items-start gap-3">
        <Sparkles
          size={14}
          className="mt-0.5 text-zinc-500 shrink-0"
          strokeWidth={2.25}
        />
        <div className="flex-1">
          <p>
            <span className="font-medium text-zinc-900">
              Auto-generated from the posts on this page.
            </span>{" "}
            Every claim is cited. Click any{" "}
            <span className="font-mono text-zinc-900">[#N]</span> to read the
            original post. Posts here are tamper-evident — verify the chain
            at <Link href={`/p/${encodeURIComponent(slug)}/audit`} className="no-underline hover:text-zinc-900 underline-offset-2 underline decoration-zinc-300">/audit</Link>.
          </p>
          {stale && (
            <p className="mt-1.5 inline-flex items-center gap-1.5 text-zinc-600">
              <Loader2 size={11} className="animate-spin" />
              Refreshing — {entries_since_cache ?? 1} new{" "}
              {entries_since_cache === 1 ? "post" : "posts"} since this was
              generated.
            </p>
          )}
        </div>
      </div>

      {/* Title + intro */}
      <header className="space-y-4">
        <h1 className="text-3xl sm:text-[2rem] font-semibold tracking-tight text-zinc-900 leading-tight">
          {view.title}
        </h1>
        <div className="text-base text-zinc-700 leading-relaxed prose-doc">
          <CitedText text={view.intro} seqToId={entry_seq_to_id} />
        </div>
      </header>

      {/* Conflicting views (surfaced before sections so they're not buried) */}
      {view.conflicting_views.length > 0 && (
        <section className="rounded-2xl border border-amber-200 bg-amber-50/40 p-5">
          <h2 className="text-sm font-semibold text-amber-900 mb-3 inline-flex items-center gap-2">
            <AlertTriangle size={14} strokeWidth={2.25} />
            Where posters disagree
          </h2>
          <ul className="space-y-3">
            {view.conflicting_views.map((cv, i) => (
              <li key={i}>
                <p className="text-sm font-medium text-zinc-900 mb-1.5">
                  {cv.topic}
                </p>
                <ul className="space-y-1 text-sm text-zinc-700">
                  {cv.perspectives.map((p, j) => (
                    <li key={j} className="flex gap-2">
                      <span className="text-amber-700 shrink-0">•</span>
                      <span>
                        <CitedText text={p.view} seqToId={entry_seq_to_id} />{" "}
                        <CitesInline cites={p.cites} seqToId={entry_seq_to_id} />
                      </span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Sections */}
      {view.sections.length === 0 ? (
        <p className="text-sm text-zinc-500 italic">
          The synthesizer didn&apos;t find enough structure to form sections
          yet. As more posts arrive, sections will appear here.
        </p>
      ) : (
        <div className="space-y-9">
          {view.sections.map((s, i) => (
            <section key={i}>
              <h2 className="text-xl font-semibold tracking-tight text-zinc-900 mb-3">
                {renderHeading(s.heading)}
              </h2>
              <div className="text-[15px] text-zinc-800 leading-relaxed prose-doc">
                <CitedText text={s.summary} seqToId={entry_seq_to_id} />
              </div>
              {s.key_points.length > 0 && (
                <ul className="mt-4 space-y-2">
                  {s.key_points.map((kp, j) => (
                    <li
                      key={j}
                      className="flex gap-2.5 text-sm text-zinc-800 leading-relaxed"
                    >
                      <span className="text-zinc-300 mt-1.5 shrink-0">•</span>
                      <span>
                        <CitedText text={kp.text} seqToId={entry_seq_to_id} />{" "}
                        <CitesInline cites={kp.cites} seqToId={entry_seq_to_id} />
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      )}

      {/* Off-topic posts collapsed */}
      {view.off_topic_seqs.length > 0 && (
        <div className="pt-4 border-t border-zinc-100">
          <button
            type="button"
            onClick={() => setShowOffTopic((s) => !s)}
            className="inline-flex items-center gap-2 text-xs text-zinc-500 hover:text-zinc-900 transition-colors"
          >
            {showOffTopic ? (
              <ChevronDown size={13} />
            ) : (
              <ChevronRight size={13} />
            )}
            <EyeOff size={12} />
            {showOffTopic ? "Hide" : "Show"}{" "}
            <span className="font-mono">{view.off_topic_seqs.length}</span>{" "}
            off-topic{" "}
            {view.off_topic_seqs.length === 1 ? "post" : "posts"}
          </button>
          {showOffTopic && (
            <div className="mt-3 fade-in flex flex-wrap gap-1.5">
              {view.off_topic_seqs.map((seq) => (
                <CiteLink
                  key={seq}
                  seq={seq}
                  seqToId={entry_seq_to_id}
                  variant="chip"
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Footer note */}
      <p className="pt-6 text-xs text-zinc-500 leading-relaxed border-t border-zinc-100">
        Want a different organization?{" "}
        <a
          href={`/p/${encodeURIComponent(slug)}/raw`}
          className="no-underline hover:text-zinc-900"
        >
          Download the raw JSONL
        </a>{" "}
        and roll your own — or{" "}
        <a
          href="https://github.com/appendpage/web"
          className="no-underline hover:text-zinc-900"
        >
          fork the frontend
        </a>{" "}
        and{" "}
        <a
          href="https://github.com/appendpage/web/pulls"
          className="no-underline hover:text-zinc-900"
        >
          open a PR
        </a>
        . The data layer and the presentation layer are decoupled by design.
      </p>
    </article>
  );
}

// ---------- citation rendering ----------

/**
 * Parse free text containing [#5] or [#5, #12, #18] markers and render
 * each marker as a clickable superscript footnote link to #e-<id>.
 *
 * The regex matches [#N] with optional comma-separated extras: the LLM is
 * instructed to use exactly that format. Anything that doesn't match
 * passes through as plain text — we never inject HTML from the LLM.
 */
function CitedText({
  text,
  seqToId,
}: {
  text: string;
  seqToId: Record<string, string>;
}) {
  const nodes: ReactNode[] = [];
  const re = /\[\s*#\d+(?:\s*,\s*#\d+)*\s*\]/g;
  let cursor = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = re.exec(text)) !== null) {
    if (match.index > cursor) {
      nodes.push(text.slice(cursor, match.index));
    }
    const seqs = parseSeqList(match[0]);
    nodes.push(
      <CitesInline key={`c${key++}`} cites={seqs} seqToId={seqToId} />,
    );
    cursor = match.index + match[0].length;
  }
  if (cursor < text.length) nodes.push(text.slice(cursor));
  return <>{nodes}</>;
}

function parseSeqList(marker: string): number[] {
  // marker is like "[#5, #12, #18]"
  const out: number[] = [];
  for (const m of marker.matchAll(/#(\d+)/g)) {
    const n = parseInt(m[1]!, 10);
    if (Number.isFinite(n)) out.push(n);
  }
  return out;
}

/** A run of citation links shown as superscripts: ⁵ ⁷ ¹². */
function CitesInline({
  cites,
  seqToId,
}: {
  cites: number[];
  seqToId: Record<string, string>;
}) {
  if (cites.length === 0) return null;
  return (
    <sup className="text-[10px] font-mono ml-0.5 whitespace-nowrap">
      {cites.map((seq, i) => (
        <span key={seq}>
          {i > 0 && <span className="text-zinc-300">,</span>}
          <CiteLink seq={seq} seqToId={seqToId} variant="superscript" />
        </span>
      ))}
    </sup>
  );
}

function CiteLink({
  seq,
  seqToId,
  variant,
}: {
  seq: number;
  seqToId: Record<string, string>;
  variant: "superscript" | "chip";
}) {
  const id = seqToId[String(seq)];
  // Without an id we can't deep-link, but render the seq so the reader
  // still sees the citation visually.
  if (!id) {
    return variant === "superscript" ? (
      <span className="text-zinc-400">#{seq}</span>
    ) : (
      <span className="rounded-full bg-zinc-100 text-zinc-500 px-2 py-0.5 text-[11px] font-mono">
        #{seq}
      </span>
    );
  }
  if (variant === "superscript") {
    return (
      <a
        href={`?view=chrono#e-${id}`}
        className="text-zinc-500 hover:text-zinc-900 no-underline"
        title={`Read post #${seq}`}
      >
        #{seq}
      </a>
    );
  }
  return (
    <a
      href={`?view=chrono#e-${id}`}
      className="rounded-full bg-zinc-100 text-zinc-700 px-2 py-0.5 text-[11px] font-mono no-underline hover:bg-zinc-200 transition-colors"
      title={`Read post #${seq}`}
    >
      #{seq}
    </a>
  );
}

/**
 * Render a section heading. If the LLM produced "Context · Subject", style
 * the context in muted text. Otherwise render whole as the title.
 */
function renderHeading(s: string): ReactNode {
  const idx = s.indexOf(" · ");
  if (idx < 0) return s;
  return (
    <>
      <span className="text-zinc-500 font-normal">{s.slice(0, idx)}</span>
      <span className="text-zinc-300 font-normal mx-1.5">·</span>
      <span>{s.slice(idx + 3)}</span>
    </>
  );
}
