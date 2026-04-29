"use client";

/**
 * DocView — Wikipedia-style synthesis of a page, organized into sections
 * with inline `[#N]` citation markers that link to the underlying entries.
 *
 * Renders the DocViewResponse from /p/<slug>/views/doc. Citation markers
 * are parsed out of free-text strings (intro, summary, key_points.text)
 * and turned into clickable superscript footnote links pointing at
 * #e-<entry_id>.
 *
 * Phase 2: gradual loading.
 *   - Top SECTIONS_INITIAL sections render fully expanded above the fold;
 *     remaining sections collapse into a "Show N more" toggle so the
 *     initial paint stays scannable even when N grows large.
 *   - Within each section, the first KEY_POINTS_INITIAL key_points render
 *     by default; if the section has more, a per-section "Show N more"
 *     button reveals them inline.
 *   - All data is already in the SSR payload — these are pure client-
 *     side collapses, no extra fetches. The /views/doc/sections/<key>
 *     endpoint exists for future use when section count is in the
 *     hundreds and we want to drop them from SSR entirely.
 *
 * Design goals:
 *   - Looks like a curated review article, not a forum.
 *   - Every claim has a footnote you can click to read the original post.
 *   - Disclaimer at the top makes the auto-generation honest and the
 *     citations the source of truth.
 *   - Off-topic posts collapse out of the way but never disappear.
 */
import {
  Activity,
  ChevronDown,
  ChevronRight,
  EyeOff,
  Loader2,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import { countMatches } from "@/lib/search";
import type { ChainEntry, DocViewResponse, DocViewSection } from "@/lib/types";

import { Highlight } from "./Highlight";

/**
 * How many sections to render on first paint. We default to "all" because
 * the Doc View is meant to read like a Wikipedia article (or any
 * reference long-form), and readers don't expect content to be hidden in
 * a collapse — clicking a TOC anchor for a hidden section silently
 * fails. The Phase 2 backend (?max_sections=K) is still there for the
 * day a page genuinely has 100+ sections; for the typical case of
 * 5-30 sections, just render the whole article and let the reader
 * scroll or use the TOC. Keep the chip-row collapse as a fallback only
 * when section count exceeds SECTIONS_COLLAPSE_THRESHOLD.
 */
const SECTIONS_COLLAPSE_THRESHOLD = 30;
/** How many key_points to render per section before collapsing. */
const KEY_POINTS_INITIAL = 5;
/** Show jump-to TOC at top once we have at least this many sections. */
const TOC_THRESHOLD = 6;
/** Top-K most-recent sections to surface in the "Recently active" callout. */
const RECENT_TOP = 3;
/** A section is "new" if its newest member was posted within this many ms. */
const NEW_BADGE_WINDOW_MS = 60 * 60 * 1000; // 1 hour

interface Props {
  slug: string;
  data: DocViewResponse;
  /** All entries on the page; used for per-section recency UI. */
  entries: ChainEntry[];
  /**
   * In-page search query (already normalized — lowercased, trimmed).
   * When non-empty, sections are filtered down to those whose
   * heading + summary + key_points text matches; matches inside
   * normally-collapsed content (the section tail or the per-section
   * key_points tail) are force-expanded so the reader actually sees the
   * hit. Match-count banner above the section list, empty-state when
   * nothing matches.
   */
  q?: string;
}

export function DocView({ slug, data, entries, q = "" }: Props) {
  const { view, entry_seq_to_id, stale, entries_since_cache } = data;
  const [showAllSections, setShowAllSections] = useState(false);
  const [showOffTopic, setShowOffTopic] = useState(false);

  // seq -> created_at_ms, used for recency badges + "Recently active"
  // callout. Computed once per page load; entries already SSR'd by
  // PageView so this is cheap.
  const seqToCreatedMs = useMemo(() => {
    const m = new Map<number, number>();
    for (const e of entries) {
      const t = Date.parse(e.created_at);
      if (Number.isFinite(t)) m.set(e.seq, t);
    }
    return m;
  }, [entries]);

  // Collapse only kicks in for genuinely huge pages; below the
  // threshold we always render the whole article so anchor links + TOC
  // navigation just work without surprises. Computed early so the
  // hash-change effect below can reference it.
  const collapseEligible = view.sections.length > SECTIONS_COLLAPSE_THRESHOLD;

  // If the page is loaded with a hash (or the user clicks a TOC anchor
  // for a hidden section) and that section is in the collapsed tail,
  // auto-expand so the browser actually scrolls there. Without this,
  // the click is silently dropped because the target element isn't in
  // the DOM. Runs on every hashchange + once on mount.
  useEffect(() => {
    if (!collapseEligible || showAllSections) return;
    function expandIfTargetIsHidden() {
      const hash = window.location.hash;
      if (!hash || !hash.startsWith("#s-")) return;
      // Hash format: #s-<index>-<slug>. Pull the index.
      const m = hash.match(/^#s-(\d+)-/);
      if (!m) return;
      const idx = parseInt(m[1]!, 10);
      if (idx >= SECTIONS_COLLAPSE_THRESHOLD) {
        setShowAllSections(true);
        // Re-trigger the browser's anchor-scroll after the section
        // mounts. requestAnimationFrame is enough for the next paint.
        requestAnimationFrame(() => {
          const el = document.getElementById(hash.slice(1));
          if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      }
    }
    expandIfTargetIsHidden();
    window.addEventListener("hashchange", expandIfTargetIsHidden);
    return () => window.removeEventListener("hashchange", expandIfTargetIsHidden);
  }, [collapseEligible, showAllSections]);

  // For each section, compute the timestamp of its newest member.
  // Sections without member_seqs (legacy v1 cache) get -Infinity so
  // they sort last in "recently active".
  const sectionsWithRecency = useMemo(() => {
    return view.sections.map((s, i) => {
      let newestMs = -Infinity;
      let newestSeq = -1;
      for (const seq of s.member_seqs ?? []) {
        const t = seqToCreatedMs.get(seq);
        if (t !== undefined && t > newestMs) {
          newestMs = t;
          newestSeq = seq;
        }
      }
      return { section: s, originalIndex: i, newestMs, newestSeq };
    });
  }, [view.sections, seqToCreatedMs]);

  // "Recently active" callout: top RECENT_TOP sections by newestMs desc.
  // Skip the callout entirely when there are too few sections OR no
  // section has a meaningful newestMs (e.g. all v1-cached without
  // member_seqs).
  const recentlyActive = useMemo(() => {
    if (sectionsWithRecency.length < 4) return [];
    const withTime = sectionsWithRecency.filter((x) => x.newestMs > 0);
    if (withTime.length === 0) return [];
    return [...withTime]
      .sort((a, b) => b.newestMs - a.newestMs)
      .slice(0, RECENT_TOP);
  }, [sectionsWithRecency]);

  // Filter sections by the in-page search query. A section matches if its
  // heading, summary, or any key_point text contains the substring. When
  // q is non-empty we ALSO force-show every key_point inside the
  // surviving sections (skipping the per-section KEY_POINTS_INITIAL cap)
  // so a match in a hidden tail key_point isn't itself hidden.
  const filteredSections = useMemo(() => {
    if (!q) return view.sections;
    return view.sections.filter((s) => {
      if (s.heading.toLowerCase().includes(q)) return true;
      if (s.summary.toLowerCase().includes(q)) return true;
      for (const kp of s.key_points) {
        if (kp.text.toLowerCase().includes(q)) return true;
      }
      return false;
    });
  }, [view.sections, q]);

  // Count total textual matches across surviving sections — drives the
  // "12 matches across 3 sections" banner.
  const matchCount = useMemo(() => {
    if (!q) return 0;
    let total = 0;
    for (const s of filteredSections) {
      total += countMatches(s.heading, q);
      total += countMatches(s.summary, q);
      for (const kp of s.key_points) {
        total += countMatches(kp.text, q);
      }
    }
    return total;
  }, [filteredSections, q]);

  // (collapseEligible defined above the hash-change effect.) The actual
  // visible / hidden split for the current render. When q is non-empty
  // the search has already filtered down to relevant sections, so we
  // always render the full filtered set (no "Show N more sections" tail).
  const visibleSections = q
    ? filteredSections
    : collapseEligible && !showAllSections
      ? view.sections.slice(0, SECTIONS_COLLAPSE_THRESHOLD)
      : view.sections;
  const hiddenSections =
    !q && collapseEligible && !showAllSections
      ? view.sections.slice(SECTIONS_COLLAPSE_THRESHOLD)
      : [];
  const hiddenSectionCount = hiddenSections.length;

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
          <CitedText text={view.intro} seqToId={entry_seq_to_id} paragraphs />
        </div>
      </header>

      {/* "Recently active" callout — surfaces the top sections by newest
          member post, so returning visitors see what's new without
          having sections shift position in the body (which is sorted
          alphabetically for stability). Hidden while searching: the
          search result IS the user's intended focus. */}
      {!q && recentlyActive.length > 0 && (
        <div className="rounded-2xl border border-emerald-200/70 bg-emerald-50/40 p-4">
          <h2 className="text-xs font-semibold text-emerald-900 mb-2.5 inline-flex items-center gap-1.5 uppercase tracking-wide">
            <Activity size={12} strokeWidth={2.5} />
            Recently active
          </h2>
          <ul className="space-y-1.5 text-sm">
            {recentlyActive.map((r) => (
              <li key={r.originalIndex} className="flex items-baseline gap-2.5">
                <a
                  href={`#${sectionAnchor(r.section.heading, r.originalIndex)}`}
                  className="text-zinc-800 hover:text-zinc-900 no-underline font-medium"
                >
                  {renderHeading(r.section.heading, q)}
                </a>
                <span className="text-xs text-zinc-500">
                  {formatRelativeTime(r.newestMs)}
                </span>
                <span className="text-xs text-zinc-400 tabular-nums font-mono">
                  · {r.section.member_seqs?.length ?? 0}{" "}
                  {(r.section.member_seqs?.length ?? 0) === 1 ? "post" : "posts"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Jump-to TOC — appears once we have enough sections that
          scrolling-to-find becomes painful. Pure anchor links to each
          section header. Not sticky (keeps mobile clean); a single
          horizontal scroll on narrow screens. Hidden when the user is
          searching: the filtered section list IS the navigation. */}
      {!q && view.sections.length >= TOC_THRESHOLD && (
        <nav
          aria-label="Sections"
          className="border-y border-zinc-200 -mx-2 px-2 py-3 overflow-x-auto"
        >
          <div className="flex flex-wrap gap-x-3 gap-y-1.5 text-xs">
            <span className="text-zinc-500 uppercase tracking-wide font-medium">
              Sections:
            </span>
            {view.sections.map((s, i) => (
              <a
                key={i}
                href={`#${sectionAnchor(s.heading, i)}`}
                className="text-zinc-700 hover:text-zinc-900 no-underline whitespace-nowrap"
              >
                {s.heading}
              </a>
            ))}
          </div>
        </nav>
      )}

      {/* Match-count banner / empty state — only when q is set. */}
      {q && (
        filteredSections.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-300 bg-white/60 p-10 text-center fade-in">
            <p className="text-base font-medium text-zinc-900">
              No sections match{" "}
              <span className="font-mono bg-zinc-100 rounded px-1.5 py-0.5">{q}</span>
              .
            </p>
            <p className="mt-2 text-sm text-zinc-500 max-w-sm mx-auto">
              Try another spelling, or switch to the Chronological view to
              search post-by-post.
            </p>
          </div>
        ) : (
          <p className="text-xs text-zinc-500">
            <span className="font-mono tabular-nums text-zinc-700">
              {matchCount}
            </span>{" "}
            {matchCount === 1 ? "match" : "matches"} across{" "}
            <span className="font-mono tabular-nums text-zinc-700">
              {filteredSections.length}
            </span>{" "}
            {filteredSections.length === 1 ? "section" : "sections"}
          </p>
        )
      )}

      {/* Sections */}
      {view.sections.length === 0 ? (
        <p className="text-sm text-zinc-500 italic">
          The synthesizer didn&apos;t find enough structure to form sections
          yet. As more posts arrive, sections will appear here.
        </p>
      ) : (
        <div className="space-y-9">
          {visibleSections.map((s, i) => {
            // When q is set, `visibleSections` is `filteredSections`, so
            // index `i` no longer maps to the original section position
            // used for the recency table. We look up by reference.
            const recencyEntry =
              sectionsWithRecency.find((r) => r.section === s) ??
              sectionsWithRecency[i]!;
            return (
              <SectionRender
                key={i}
                section={s}
                index={i}
                seqToId={entry_seq_to_id}
                isNew={
                  recencyEntry.newestMs > 0 &&
                  Date.now() - recencyEntry.newestMs <= NEW_BADGE_WINDOW_MS
                }
                q={q}
              />
            );
          })}

          {/* Collapsed-section reveal — only fires above the
              SECTIONS_COLLAPSE_THRESHOLD. Borrows the GitHub "load
              more" full-width-bar pattern: clear visual rule, big
              button, hidden-headings preview underneath as chips so
              the reader can see what they'd be expanding to. */}
          {hiddenSectionCount > 0 && (
            <div className="border-t border-zinc-200 pt-8 space-y-4">
              <button
                type="button"
                onClick={() => setShowAllSections(true)}
                className="w-full rounded-xl border-2 border-dashed border-zinc-300 hover:border-zinc-900 hover:bg-zinc-50 px-6 py-4 transition-colors group"
              >
                <span className="flex items-center justify-center gap-2 text-base font-medium text-zinc-700 group-hover:text-zinc-900">
                  <ChevronDown size={18} strokeWidth={2.25} />
                  Show {hiddenSectionCount} more{" "}
                  {hiddenSectionCount === 1 ? "section" : "sections"}
                </span>
              </button>
              <div className="flex flex-wrap gap-1.5 justify-center">
                {hiddenSections.slice(0, 12).map((s, i) => (
                  <SectionChip
                    key={i}
                    section={s}
                    index={SECTIONS_COLLAPSE_THRESHOLD + i}
                  />
                ))}
                {hiddenSections.length > 12 && (
                  <span className="text-xs text-zinc-400 self-center">
                    +{hiddenSections.length - 12} more
                  </span>
                )}
              </div>
            </div>
          )}
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

// ---------- section rendering ----------

/**
 * Render one section: heading + summary + paginated key_points.
 * The first KEY_POINTS_INITIAL key_points show by default; clicking
 * "Show N more" reveals the rest in place.
 *
 * Each section has a stable anchor id (computed from heading + index)
 * so the jump-to TOC and the "Recently active" callout can link
 * directly to it.
 */
function SectionRender({
  section,
  index,
  seqToId,
  isNew,
  q = "",
}: {
  section: DocViewSection;
  index: number;
  seqToId: Record<string, string>;
  isNew: boolean;
  /** Already-normalized search query. When non-empty, force-shows all
   *  key_points (skipping the per-section collapse) and threads through
   *  to CitedText so substring matches get <mark>-highlighted. */
  q?: string;
}) {
  const [showAllKeyPoints, setShowAllKeyPoints] = useState(false);
  // When searching, ignore the per-section key_point cap so a matching
  // tail key_point isn't itself hidden.
  const showAll = showAllKeyPoints || q !== "";
  const visibleKp = showAll
    ? section.key_points
    : section.key_points.slice(0, KEY_POINTS_INITIAL);
  const hiddenKpCount = section.key_points.length - visibleKp.length;
  const anchor = sectionAnchor(section.heading, index);

  return (
    <section id={anchor} className="scroll-mt-4">
      <h2 className="text-xl font-semibold tracking-tight text-zinc-900 mb-3 inline-flex items-baseline flex-wrap gap-2">
        <span>{renderHeading(section.heading, q)}</span>
        {isNew && (
          <span className="text-[10px] font-medium uppercase tracking-wide text-emerald-700 bg-emerald-50 border border-emerald-200/70 rounded-full px-2 py-0.5 leading-none">
            new
          </span>
        )}
      </h2>
      <div className="text-[15px] text-zinc-800 leading-relaxed prose-doc">
        <CitedText text={section.summary} seqToId={seqToId} paragraphs q={q} />
      </div>
      {section.key_points.length > 0 && (
        <ul className="mt-4 space-y-2">
          {visibleKp.map((kp, j) => (
            <li
              key={j}
              className="flex gap-2.5 text-sm text-zinc-800 leading-relaxed"
            >
              <span className="text-zinc-300 mt-1.5 shrink-0">•</span>
              <span>
                <CitedText text={kp.text} seqToId={seqToId} q={q} />{" "}
                <CitesInline cites={kp.cites} seqToId={seqToId} />
              </span>
            </li>
          ))}
          {hiddenKpCount > 0 && (
            <li className="!mt-3">
              <button
                type="button"
                onClick={() => setShowAllKeyPoints(true)}
                className="ml-5 inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-medium text-zinc-700 hover:border-zinc-900 hover:bg-white hover:text-zinc-900 transition-colors"
              >
                <ChevronDown size={12} strokeWidth={2.5} />
                Show {hiddenKpCount} more key{" "}
                {hiddenKpCount === 1 ? "point" : "points"}
              </button>
            </li>
          )}
        </ul>
      )}
    </section>
  );
}

/**
 * Compact preview of a collapsed section: heading + member count, in
 * a single tappable chip. Clicking it jumps to the section's anchor
 * (the section is below in DOM, just hidden behind "Show all sections").
 * The chip is a real anchor link so the browser can jump even when the
 * section isn't expanded — we use scrollIntoView via the click handler
 * combined with showAll. For now it's a simple anchor.
 */
function SectionChip({
  section,
  index,
}: {
  section: DocViewSection;
  index: number;
}) {
  const memberCount = section.member_seqs?.length ?? 0;
  const anchor = sectionAnchor(section.heading, index);
  return (
    <a
      href={`#${anchor}`}
      className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs text-zinc-700 no-underline hover:border-zinc-900 transition-colors"
      title={
        memberCount > 0
          ? `${section.heading} — ${memberCount} ${memberCount === 1 ? "post" : "posts"}`
          : section.heading
      }
    >
      <span className="truncate max-w-[20rem]">
        {renderHeading(section.heading)}
      </span>
      {memberCount > 0 && (
        <span className="font-mono tabular-nums text-zinc-400">
          {memberCount}
        </span>
      )}
    </a>
  );
}

/**
 * Build a stable URL anchor for a section. Uses the heading slug for
 * readability + the section index as a tiebreaker (in case two sections
 * happen to slugify to the same string, which shouldn't happen given
 * subjects come from entry_tags but is cheap insurance).
 */
function sectionAnchor(heading: string, index: number): string {
  const slug = heading
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return `s-${index}-${slug || "section"}`;
}

/** "12m ago", "3h ago", "2d ago" — used by the "Recently active" callout. */
function formatRelativeTime(ms: number): string {
  const delta = Date.now() - ms;
  if (delta < 0) return "just now";
  const minutes = Math.floor(delta / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(ms).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

// ---------- citation rendering ----------

/**
 * Parse free text containing [#5] or [#5, #12, #18] markers and render
 * each marker as a clickable superscript footnote link to #e-<id>.
 *
 * The regex matches [#N] with optional comma-separated extras: the LLM is
 * instructed to use exactly that format. Anything that doesn't match
 * passes through as plain text — we never inject HTML from the LLM.
 *
 * If `paragraphs` is true, splits on `\n\n` first and wraps each chunk
 * in a `<p>` so the v2 prompt's multi-paragraph summaries render with
 * actual paragraph breaks (not collapsed whitespace).
 */
function CitedText({
  text,
  seqToId,
  paragraphs = false,
  q = "",
}: {
  text: string;
  seqToId: Record<string, string>;
  paragraphs?: boolean;
  /** Already-normalized search query; non-cite text segments get
   *  substring-highlighted via <mark> when set. */
  q?: string;
}) {
  if (paragraphs) {
    const chunks = text.split(/\n{2,}/);
    return (
      <>
        {chunks.map((chunk, i) => (
          <p key={i}>
            <InlineCitations text={chunk} seqToId={seqToId} q={q} />
          </p>
        ))}
      </>
    );
  }
  return <InlineCitations text={text} seqToId={seqToId} q={q} />;
}

/** Inline citation parsing — no paragraph splitting. Used for one-line
 *  fields like key_points.text. Non-cite text gets wrapped in <Highlight>
 *  so a search match shows up alongside the citation links. */
function InlineCitations({
  text,
  seqToId,
  q = "",
}: {
  text: string;
  seqToId: Record<string, string>;
  q?: string;
}) {
  const nodes: ReactNode[] = [];
  const re = /\[\s*#\d+(?:\s*,\s*#\d+)*\s*\]/g;
  let cursor = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  function pushText(s: string, k: string) {
    if (q) {
      nodes.push(<Highlight key={k} text={s} q={q} />);
    } else {
      nodes.push(s);
    }
  }
  while ((match = re.exec(text)) !== null) {
    if (match.index > cursor) {
      pushText(text.slice(cursor, match.index), `t${key}`);
    }
    const seqs = parseSeqList(match[0]);
    nodes.push(
      <CitesInline key={`c${key++}`} cites={seqs} seqToId={seqToId} />,
    );
    cursor = match.index + match[0].length;
  }
  if (cursor < text.length) pushText(text.slice(cursor), `tend`);
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
function renderHeading(s: string, q = ""): ReactNode {
  const idx = s.indexOf(" · ");
  if (idx < 0) {
    return q ? <Highlight text={s} q={q} /> : s;
  }
  const left = s.slice(0, idx);
  const right = s.slice(idx + 3);
  return (
    <>
      <span className="text-zinc-500 font-normal">
        {q ? <Highlight text={left} q={q} /> : left}
      </span>
      <span className="text-zinc-300 font-normal mx-1.5">·</span>
      <span>{q ? <Highlight text={right} q={q} /> : right}</span>
    </>
  );
}
