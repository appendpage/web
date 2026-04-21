"use client";

import {
  AlertTriangle,
  Info,
  RefreshCw,
  Sparkles,
  Lightbulb,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import type { ChainEntry, EntryWithBody, ViewJson } from "@/lib/types";

interface Props {
  slug: string;
  view: ViewJson;
  cached: boolean;
  /** True if the cache row was generated before the current head_hash. */
  stale: boolean;
  /** How many entries were posted after the cached view was generated. */
  entriesSinceCache: number;
  generatedAt: string;
  costUsd: number;
  bodies: Record<string, EntryWithBody>;
  entriesById: Record<string, ChainEntry>;
  onReply: (entry: ChainEntry) => void;
}

/**
 * Renders an LLM-generated view_json through a fixed component palette.
 *
 * The palette has NO raw-HTML escape hatch:
 *   <Group> | <SectionSummary> | <Callout> | <FilterChip> | <EntryRef>
 *
 * Posters' bodies (rendered inside <EntryRef>) go through react-markdown with
 * <script>/<iframe>/<style>/<img> stripped. The LLM's text fields render as
 * PLAIN TEXT (not markdown) so even if a prompt-injection slipped past
 * schema validation, it can't emit clickable links or images.
 */
export function AiView({
  view,
  cached,
  stale,
  entriesSinceCache,
  generatedAt,
  costUsd,
  bodies,
  entriesById,
  onReply,
}: Props) {
  return (
    <div className="space-y-10 fade-in">
      {/* "Refreshing in background" banner — shown when the cached view is
          older than the current chain head. The view below it is the most
          recent one we have; a fresh one is being generated and will appear
          on the next visit. */}
      {stale && entriesSinceCache > 0 && (
        <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 px-4 py-2.5 text-sm text-zinc-700 flex items-center gap-2.5">
          <RefreshCw size={13} strokeWidth={2.25} className="text-zinc-500 animate-spin-slow" />
          <span>
            <span className="font-medium">{entriesSinceCache}</span>{" "}
            new {entriesSinceCache === 1 ? "entry" : "entries"} since this view
            was generated. Refreshing in the background — reload in a few
            seconds for the latest.
          </span>
        </div>
      )}

      {/* Header band: section summaries (the page-level take) */}
      {view.section_summaries.length > 0 && (
        <section className="rounded-2xl bg-gradient-to-br from-zinc-100/80 to-zinc-50 border border-zinc-200 px-7 py-6">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-zinc-500 font-medium mb-4">
            <Sparkles size={12} strokeWidth={2.25} />
            AI summary
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {view.section_summaries.map((s, i) => (
              <div key={i}>
                <h3 className="text-sm font-semibold text-zinc-900 mb-1">
                  {s.label}
                </h3>
                <p className="text-sm text-zinc-700 leading-relaxed">
                  {s.text}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Callouts row */}
      {view.callouts.length > 0 && (
        <section className="grid gap-3 md:grid-cols-2">
          {view.callouts.map((c, i) => (
            <Callout
              key={i}
              tone={c.tone}
              text={c.text}
              relatedEntryIds={c.related_entry_ids}
            />
          ))}
        </section>
      )}

      {/* Suggested filters */}
      {view.suggested_filters.length > 0 && (
        <section>
          <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-zinc-500 font-medium mb-3">
            <Lightbulb size={12} strokeWidth={2.25} />
            Try
          </div>
          <ul className="flex flex-wrap gap-2">
            {view.suggested_filters.map((f, i) => (
              <li key={i}>
                <span
                  className="inline-block rounded-full border border-zinc-200 bg-white px-3.5 py-1.5 text-sm text-zinc-700 hover:border-zinc-900 hover:bg-zinc-50 transition-colors cursor-default"
                  title={f.natural_language}
                >
                  {f.label}
                </span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-zinc-400 mt-2 italic">
            Custom views ship in the next update — these are suggestions for now.
          </p>
        </section>
      )}

      {/* Groupings — the meat */}
      <section className="space-y-12">
        {view.groupings.map((g, i) => (
          <Group
            key={i}
            label={g.label}
            summary={g.summary}
            entryIds={g.entry_ids}
            bodies={bodies}
            entriesById={entriesById}
            onReply={onReply}
          />
        ))}
      </section>

      <p className="text-xs text-zinc-400 text-center pt-4 border-t border-zinc-100">
        Generated by AI · {cached ? "cached" : "fresh"} · {timeAgo(generatedAt)}
        {costUsd > 0 ? ` · $${costUsd.toFixed(4)}` : ""}
      </p>
    </div>
  );
}

// ---------- Group ----------

function Group({
  label,
  summary,
  entryIds,
  bodies,
  entriesById,
  onReply,
}: {
  label: string;
  summary: string | null;
  entryIds: string[];
  bodies: Record<string, EntryWithBody>;
  entriesById: Record<string, ChainEntry>;
  onReply: (e: ChainEntry) => void;
}) {
  return (
    <div>
      <div className="mb-4 max-w-prose">
        <h2 className="text-xl font-semibold tracking-tight text-zinc-900 mb-2">
          {label}
        </h2>
        {summary && (
          <p className="text-sm text-zinc-600 leading-relaxed">{summary}</p>
        )}
      </div>
      <div className="space-y-3">
        {entryIds.map((id) => {
          const entry = entriesById[id];
          const body = bodies[id];
          if (!entry) return null;
          return (
            <EntryRef
              key={id}
              entry={entry}
              body={body ?? null}
              onReply={onReply}
            />
          );
        })}
      </div>
    </div>
  );
}

// ---------- Callout ----------

const TONE_STYLES: Record<
  "neutral" | "info" | "warning",
  { wrapper: string; iconBg: string; icon: LucideIcon; iconColor: string; label: string }
> = {
  neutral: {
    wrapper: "border-zinc-200 bg-white",
    iconBg: "bg-zinc-100",
    icon: Info,
    iconColor: "text-zinc-500",
    label: "Note",
  },
  info: {
    wrapper: "border-zinc-200 bg-white",
    iconBg: "bg-blue-50",
    icon: Info,
    iconColor: "text-blue-600",
    label: "Pattern",
  },
  warning: {
    wrapper: "border-amber-200 bg-amber-50/40",
    iconBg: "bg-amber-100",
    icon: AlertTriangle,
    iconColor: "text-amber-700",
    label: "Heads up",
  },
};

function Callout({
  tone,
  text,
  relatedEntryIds,
}: {
  tone: "neutral" | "warning" | "info";
  text: string;
  relatedEntryIds: string[];
}) {
  const s = TONE_STYLES[tone];
  const Icon = s.icon;
  return (
    <div
      className={`rounded-2xl border px-5 py-4 ${s.wrapper}`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`shrink-0 rounded-full ${s.iconBg} p-2`}
        >
          <Icon size={14} strokeWidth={2.25} className={s.iconColor} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] uppercase tracking-wide text-zinc-500 font-medium mb-1">
            {s.label}
          </div>
          <p className="text-sm text-zinc-800 leading-relaxed">{text}</p>
          {relatedEntryIds.length > 0 && (
            <p className="text-xs text-zinc-400 mt-2">
              Related:{" "}
              {relatedEntryIds.slice(0, 5).map((id, i) => (
                <span key={id}>
                  {i > 0 && " · "}
                  <a
                    href={`#e-${id}`}
                    className="font-mono no-underline hover:text-zinc-900"
                  >
                    {id.slice(0, 8)}
                  </a>
                </span>
              ))}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------- EntryRef ----------

function EntryRef({
  entry,
  body,
  onReply,
}: {
  entry: ChainEntry;
  body: EntryWithBody | null;
  onReply: (e: ChainEntry) => void;
}) {
  const [open, setOpen] = useState(false);
  const erased = body?.erased ?? false;
  const text = body?.body ?? null;
  const preview =
    text && !erased
      ? text.replace(/\s+/g, " ").slice(0, 180) +
        (text.length > 180 ? "…" : "")
      : null;

  return (
    <article
      id={`e-${entry.id}`}
      className="rounded-xl border border-zinc-200 bg-white px-5 py-4 hover:border-zinc-300 transition-colors"
    >
      <header className="flex items-center justify-between text-xs text-zinc-400 mb-2">
        <div className="flex items-center gap-2">
          <span className="font-mono">#{entry.seq}</span>
          {entry.kind === "moderation" && (
            <span className="rounded-full bg-amber-100 text-amber-900 px-2 py-0.5 text-[10px] uppercase tracking-wide font-medium">
              Moderator
            </span>
          )}
          {entry.parent && (
            <span className="text-zinc-300 inline-flex items-center gap-1">
              ↳ reply
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => onReply(entry)}
          className="text-zinc-400 hover:text-zinc-900 transition-colors"
        >
          Reply
        </button>
      </header>

      {erased ? (
        <p className="text-sm italic text-zinc-500">[body erased]</p>
      ) : open && text ? (
        <div className="prose-entry text-[0.95rem] fade-in">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            disallowedElements={["script", "iframe", "style", "img"]}
            unwrapDisallowed
          >
            {text}
          </ReactMarkdown>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="mt-3 text-xs text-zinc-400 hover:text-zinc-900 transition-colors"
          >
            Show less
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-left text-[0.95rem] text-zinc-700 hover:text-zinc-900 transition-colors block w-full"
        >
          {preview ?? "[loading…]"}
        </button>
      )}
    </article>
  );
}

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return iso;
  const seconds = Math.floor((Date.now() - then) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(iso).toLocaleDateString();
}
