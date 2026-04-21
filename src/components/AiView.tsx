"use client";

import {
  ChevronDown,
  ChevronRight,
  EyeOff,
  Loader2,
  Search,
  Tag,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import type {
  ChainEntry,
  EntryMetadata,
  EntryWithBody,
  TagsResponse,
} from "@/lib/types";

interface Props {
  slug: string;
  entries: ChainEntry[]; // chronological order
  bodies: Record<string, EntryWithBody>;
  tags: TagsResponse;
  initialTag?: string;
  initialQuery?: string;
  onReply: (entry: ChainEntry) => void;
}

const UNTAGGED_KEY = "__no_subject__";

interface SubjectBucket {
  subject: string | null;
  displayLabel: string;
  context: string | null;
  name: string;
  entries: ChainEntry[];
}

export function AiView({
  slug,
  entries,
  bodies,
  tags,
  initialTag,
  initialQuery,
  onReply,
}: Props) {
  const [query, setQuery] = useState(initialQuery ?? "");
  const [activeTag, setActiveTag] = useState<string | undefined>(initialTag);
  const [showOffTopic, setShowOffTopic] = useState(false);

  // Sorted tag list for the chip row.
  const sortedTags = useMemo(
    () =>
      Object.entries(tags.tag_counts).sort((a, b) => {
        if (b[1] !== a[1]) return b[1] - a[1];
        return a[0].localeCompare(b[0]);
      }),
    [tags.tag_counts],
  );

  // Apply filters (search + tag) to entries, then split into relevant /
  // off-topic and group the relevant ones by subject.
  const { subjects, untaggedRelevant, offTopic } = useMemo(() => {
    const q = query.trim().toLowerCase();
    const subjectMap = new Map<string, SubjectBucket>();
    const untagged: ChainEntry[] = [];
    const offTopicList: ChainEntry[] = [];

    for (const e of entries) {
      const meta = tags.entries_meta[e.id] ?? null;
      const body = bodies[e.id]?.body ?? "";
      const entryTagsList = meta?.tags ?? [];

      // Filters apply to all entries (relevant or not — searching off-topic
      // posts should still find them).
      if (activeTag && !entryTagsList.includes(activeTag)) continue;
      if (q) {
        const haystack = (
          body +
          " " +
          entryTagsList.join(" ") +
          " " +
          (meta?.subject ?? "")
        ).toLowerCase();
        if (!haystack.includes(q)) continue;
      }

      if (meta && !meta.relevant) {
        offTopicList.push(e);
        continue;
      }

      const subjectKey = meta?.subject ?? UNTAGGED_KEY;
      if (subjectKey === UNTAGGED_KEY) {
        untagged.push(e);
        continue;
      }

      let bucket = subjectMap.get(subjectKey);
      if (!bucket) {
        const { context, name } = splitSubject(subjectKey);
        bucket = {
          subject: subjectKey,
          displayLabel: subjectKey,
          context,
          name,
          entries: [],
        };
        subjectMap.set(subjectKey, bucket);
      }
      bucket.entries.push(e);
    }

    // Sort subjects: by entry count desc, then by context+name alpha.
    const sortedSubjects = [...subjectMap.values()].sort((a, b) => {
      if (b.entries.length !== a.entries.length) {
        return b.entries.length - a.entries.length;
      }
      const ac = (a.context ?? "") + " " + a.name;
      const bc = (b.context ?? "") + " " + b.name;
      return ac.localeCompare(bc);
    });

    // Sort entries within each subject newest first.
    for (const s of sortedSubjects) {
      s.entries.sort((x, y) => y.seq - x.seq);
    }
    untagged.sort((x, y) => y.seq - x.seq);
    offTopicList.sort((x, y) => y.seq - x.seq);

    return {
      subjects: sortedSubjects,
      untaggedRelevant: untagged,
      offTopic: offTopicList,
    };
  }, [entries, tags.entries_meta, bodies, activeTag, query]);

  function clearFilters() {
    setActiveTag(undefined);
    setQuery("");
  }

  const totalShown =
    subjects.reduce((s, b) => s + b.entries.length, 0) +
    untaggedRelevant.length;
  const filtersActive = !!activeTag || query.trim().length > 0;

  return (
    <div className="space-y-6 fade-in">
      {/* Stale indicator */}
      {tags.stale && (
        <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 px-4 py-2.5 text-sm text-zinc-700 flex items-center gap-2.5">
          <Loader2 size={13} className="text-zinc-500 animate-spin" />
          <span>
            Tagging{" "}
            <span className="font-medium">{tags.uncached_count}</span> more{" "}
            {tags.uncached_count === 1 ? "entry" : "entries"} in the background
            — reload in a few seconds.
          </span>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search
          size={16}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none"
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by subject, tag, or body…"
          className="w-full rounded-xl border border-zinc-200 bg-white pl-10 pr-4 py-3 text-sm placeholder:text-zinc-400 focus:border-zinc-900 outline-none transition-colors focus:ring-0"
        />
      </div>

      {/* Tag filter row */}
      {sortedTags.length > 0 && (
        <div>
          <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-zinc-500 font-medium mb-2.5">
            <Tag size={12} strokeWidth={2.25} />
            Filter by topic
          </div>
          <div className="flex flex-wrap gap-1.5">
            {sortedTags.map(([tag, count]) => {
              const active = tag === activeTag;
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setActiveTag(active ? undefined : tag)}
                  className={[
                    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors",
                    active
                      ? "border-zinc-900 bg-zinc-900 text-white"
                      : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-900",
                  ].join(" ")}
                >
                  <span>{tag}</span>
                  <span className={active ? "text-zinc-300 tabular-nums" : "text-zinc-400 tabular-nums"}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Active filter chips */}
      {filtersActive && (
        <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-600">
          <span className="text-zinc-400">Active:</span>
          {activeTag && (
            <FilterChip label={`tag: ${activeTag}`} onClear={() => setActiveTag(undefined)} />
          )}
          {query.trim() && (
            <FilterChip label={`search: "${query.trim()}"`} onClear={() => setQuery("")} />
          )}
          <button
            type="button"
            onClick={clearFilters}
            className="ml-1 text-zinc-400 hover:text-zinc-900 transition-colors"
          >
            clear all
          </button>
        </div>
      )}

      {/* Directory header */}
      <div className="text-xs text-zinc-500 flex items-center justify-between gap-2 pt-2">
        <span>
          {totalShown === 0 ? (
            "No matching posts."
          ) : (
            <>
              <span className="font-mono text-zinc-900 tabular-nums">{totalShown}</span>{" "}
              {totalShown === 1 ? "post" : "posts"} across{" "}
              <span className="font-mono text-zinc-900 tabular-nums">{subjects.length}</span>{" "}
              {subjects.length === 1 ? "subject" : "subjects"}
              {untaggedRelevant.length > 0 && (
                <> ·{" "}
                <span className="font-mono tabular-nums">{untaggedRelevant.length}</span> uncategorized
                </>
              )}
            </>
          )}
        </span>
      </div>

      {/* Subject directory */}
      {totalShown === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 bg-white/60 p-10 text-center">
          <p className="text-sm font-medium text-zinc-800">No posts match.</p>
          <p className="mt-1 text-xs text-zinc-500">
            Try removing a filter or searching for something else.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {subjects.map((s) => (
            <SubjectGroup
              key={s.subject ?? "_"}
              bucket={s}
              bodies={bodies}
              meta={tags.entries_meta}
              activeTag={activeTag}
              onTagClick={setActiveTag}
              onReply={onReply}
            />
          ))}
          {untaggedRelevant.length > 0 && (
            <SubjectGroup
              bucket={{
                subject: null,
                displayLabel: "Uncategorized",
                context: null,
                name: "Uncategorized",
                entries: untaggedRelevant,
              }}
              bodies={bodies}
              meta={tags.entries_meta}
              activeTag={activeTag}
              onTagClick={setActiveTag}
              onReply={onReply}
              muted
            />
          )}
        </div>
      )}

      {/* Off-topic collapsible */}
      {offTopic.length > 0 && (
        <div className="pt-4">
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
            <span className="font-mono">{offTopic.length}</span>{" "}
            off-topic {offTopic.length === 1 ? "post" : "posts"}
          </button>
          {showOffTopic && (
            <div className="mt-3 space-y-2">
              {offTopic.map((e) => (
                <OffTopicEntry
                  key={e.id}
                  entry={e}
                  body={bodies[e.id] ?? null}
                  reason={tags.entries_meta[e.id]?.relevance_reason ?? null}
                  onReply={onReply}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Footer note */}
      <p className="pt-6 text-xs text-zinc-500 leading-relaxed border-t border-zinc-100">
        This view is one of many. Want a different one?{" "}
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
        . Issues with view ideas are welcome too.
      </p>
    </div>
  );
}

// ---------- subject group ----------

function SubjectGroup({
  bucket,
  bodies,
  meta,
  activeTag,
  onTagClick,
  onReply,
  muted,
}: {
  bucket: SubjectBucket;
  bodies: Record<string, EntryWithBody>;
  meta: Record<string, EntryMetadata>;
  activeTag: string | undefined;
  onTagClick: (tag: string) => void;
  onReply: (e: ChainEntry) => void;
  muted?: boolean;
}) {
  return (
    <section>
      <header className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2
          className={[
            "text-base font-semibold tracking-tight",
            muted ? "text-zinc-500" : "text-zinc-900",
          ].join(" ")}
        >
          {bucket.context ? (
            <>
              <span className="text-zinc-500 font-normal">{bucket.context}</span>
              <span className="text-zinc-300 font-normal mx-1.5">·</span>
              <span>{bucket.name}</span>
            </>
          ) : (
            bucket.displayLabel
          )}
        </h2>
        <span className="text-xs text-zinc-400 font-mono tabular-nums">
          {bucket.entries.length}{" "}
          {bucket.entries.length === 1 ? "entry" : "entries"}
        </span>
      </header>
      <div className="space-y-3">
        {bucket.entries.map((entry) => (
          <DirectoryEntryCard
            key={entry.id}
            entry={entry}
            body={bodies[entry.id] ?? null}
            tags={meta[entry.id]?.tags ?? []}
            activeTag={activeTag}
            onTagClick={onTagClick}
            onReply={onReply}
          />
        ))}
      </div>
    </section>
  );
}

// ---------- entry inside a subject group ----------

function DirectoryEntryCard({
  entry,
  body,
  tags,
  activeTag,
  onTagClick,
  onReply,
}: {
  entry: ChainEntry;
  body: EntryWithBody | null;
  tags: string[];
  activeTag: string | undefined;
  onTagClick: (tag: string) => void;
  onReply: (e: ChainEntry) => void;
}) {
  const erased = body?.erased ?? false;
  const text = body?.body ?? null;
  const isModeration = entry.kind === "moderation";

  return (
    <article
      id={`e-${entry.id}`}
      className={[
        "group rounded-xl border bg-white px-5 py-4 transition-colors",
        isModeration
          ? "border-amber-200 bg-amber-50/30"
          : "border-zinc-200 hover:border-zinc-300",
      ].join(" ")}
    >
      <header className="flex items-center justify-between gap-3 text-xs text-zinc-500 mb-2">
        <div className="flex items-center gap-2">
          <span className="font-mono text-zinc-400">#{entry.seq}</span>
          <span className="text-zinc-300">·</span>
          <time dateTime={entry.created_at}>{formatTime(entry.created_at)}</time>
          {isModeration && (
            <span className="ml-1 rounded-full bg-amber-100 text-amber-900 px-2 py-0.5 text-[10px] uppercase tracking-wide font-medium">
              Moderator
            </span>
          )}
          {entry.parent && <span className="text-zinc-400">↳ reply</span>}
        </div>
      </header>

      <div className="prose-entry">
        {erased ? (
          <p className="italic text-zinc-500">[body erased]</p>
        ) : text ? (
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            disallowedElements={["script", "iframe", "style", "img"]}
            unwrapDisallowed
          >
            {text}
          </ReactMarkdown>
        ) : (
          <p className="text-zinc-300">[loading…]</p>
        )}
      </div>

      <footer className="mt-3 flex flex-wrap items-center gap-2">
        {tags.map((t) => {
          const active = t === activeTag;
          return (
            <button
              key={t}
              type="button"
              onClick={() => onTagClick(t)}
              className={[
                "rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-colors",
                active
                  ? "bg-zinc-900 text-white"
                  : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200",
              ].join(" ")}
            >
              {t}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => onReply(entry)}
          className="ml-auto text-xs text-zinc-500 hover:text-zinc-900 transition-colors"
        >
          Reply
        </button>
      </footer>
    </article>
  );
}

// ---------- collapsed off-topic entry ----------

function OffTopicEntry({
  entry,
  body,
  reason,
  onReply,
}: {
  entry: ChainEntry;
  body: EntryWithBody | null;
  reason: string | null;
  onReply: (e: ChainEntry) => void;
}) {
  const [open, setOpen] = useState(false);
  const text = body?.body ?? "";
  const preview = text.replace(/\s+/g, " ").slice(0, 140) + (text.length > 140 ? "…" : "");

  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-50/40 px-4 py-2.5 text-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-zinc-500 min-w-0 flex-1">
          <span className="font-mono">#{entry.seq}</span>
          {reason && (
            <span className="italic truncate">{reason}</span>
          )}
        </div>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="text-xs text-zinc-500 hover:text-zinc-900"
        >
          {open ? "hide" : "show"}
        </button>
      </div>
      {open && (
        <div className="mt-2 text-sm text-zinc-700 fade-in">
          <p className="prose-entry">{preview}</p>
          <button
            type="button"
            onClick={() => onReply(entry)}
            className="mt-2 text-xs text-zinc-500 hover:text-zinc-900"
          >
            Reply
          </button>
        </div>
      )}
    </div>
  );
}

// ---------- helpers ----------

function FilterChip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-zinc-300 bg-white px-2.5 py-0.5 text-zinc-700">
      {label}
      <button
        type="button"
        onClick={onClear}
        className="text-zinc-400 hover:text-zinc-900"
        aria-label="clear filter"
      >
        <X size={11} />
      </button>
    </span>
  );
}

/**
 * Split "Context · Subject" into its two halves. If there's no separator,
 * context is null and the whole string is the name.
 */
function splitSubject(s: string): { context: string | null; name: string } {
  const idx = s.indexOf(" · ");
  if (idx < 0) return { context: null, name: s };
  return {
    context: s.slice(0, idx).trim(),
    name: s.slice(idx + 3).trim(),
  };
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const now = Date.now();
  const diff = now - d.getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
