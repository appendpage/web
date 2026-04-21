import Link from "next/link";
import { ArrowRight, BookOpen, FilePlus2 } from "lucide-react";

import { fetchPageList } from "@/lib/api";

export const dynamic = "force-dynamic";

// Curated cards at the top — always present, in this order.
const FEATURED_SLUGS = new Set(["advisors", "internships", "demo"]);
const FEATURED: Array<{ slug: string; hint: string }> = [
  { slug: "advisors", hint: "Anonymous reviews of academic advisors" },
  { slug: "internships", hint: "Tech internships and host advice" },
  { slug: "demo", hint: "Hand-written sample (fictional)" },
];

export default async function Landing() {
  // Fetch the most-recently-active pages to display below the featured trio.
  // Stripped of the curated ones so we don't double-list.
  const active = (await fetchPageList({ limit: 20 })).filter(
    (p) => !FEATURED_SLUGS.has(p.slug),
  );

  return (
    <main className="mx-auto max-w-3xl px-6">
      {/* Hero */}
      <section className="pt-24 pb-12 sm:pt-32 sm:pb-16">
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight text-zinc-900 leading-[1.05]">
          A place to write things that can&apos;t be silently deleted.
        </h1>
        <p className="mt-6 text-lg text-zinc-600 max-w-xl leading-relaxed">
          Anyone can post. No one — including the operator — can edit or
          delete a post.
        </p>
        <div className="mt-9 flex flex-wrap gap-3">
          <Link
            href="/p/advisors"
            className="inline-flex items-center gap-2 rounded-full bg-zinc-900 px-6 py-3 text-white text-sm font-medium no-underline hover:bg-zinc-800 transition-colors shadow-sm"
          >
            <BookOpen size={16} />
            Read /p/advisors
          </Link>
          <Link
            href="/new"
            className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-6 py-3 text-zinc-900 text-sm font-medium no-underline hover:border-zinc-900 transition-colors"
          >
            Start a page
            <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      {/* Featured */}
      <section className="pb-12">
        <h2 className="text-xs uppercase tracking-wide text-zinc-500 font-medium mb-3">
          Featured
        </h2>
        <ul className="space-y-2">
          {FEATURED.map((p) => (
            <li key={p.slug}>
              <PageListRow
                slug={p.slug}
                hint={p.hint}
                entryCount={undefined}
                lastPostAt={null}
              />
            </li>
          ))}
        </ul>
      </section>

      {/* Active (community pages) */}
      {active.length > 0 && (
        <section className="pb-24">
          <h2 className="text-xs uppercase tracking-wide text-zinc-500 font-medium mb-3">
            Recently active
          </h2>
          <ul className="space-y-2">
            {active.map((p) => (
              <li key={p.slug}>
                <PageListRow
                  slug={p.slug}
                  hint={p.description || "—"}
                  entryCount={p.entry_count}
                  lastPostAt={p.last_post_at}
                />
              </li>
            ))}
          </ul>
          <p className="mt-6 text-xs text-zinc-500">
            Don&apos;t see what you want?{" "}
            <Link
              href="/new"
              className="no-underline hover:text-zinc-900 inline-flex items-center gap-1"
            >
              <FilePlus2 size={11} />
              Start a new page
            </Link>
            .
          </p>
        </section>
      )}
    </main>
  );
}

function PageListRow({
  slug,
  hint,
  entryCount,
  lastPostAt,
}: {
  slug: string;
  hint: string;
  entryCount: number | undefined;
  lastPostAt: string | null;
}) {
  return (
    <Link
      href={`/p/${slug}`}
      className="group flex items-center justify-between gap-4 rounded-xl border border-zinc-200 bg-white px-5 py-4 no-underline hover:border-zinc-900 hover:shadow-sm transition-all"
    >
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium font-mono text-zinc-900">
          /p/{slug}
        </div>
        <div className="text-sm text-zinc-500 mt-0.5 truncate">{hint}</div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        {entryCount !== undefined && entryCount > 0 && (
          <div className="text-right text-xs text-zinc-400 tabular-nums">
            <div>
              <span className="font-medium text-zinc-700">{entryCount}</span>{" "}
              {entryCount === 1 ? "entry" : "entries"}
            </div>
            {lastPostAt && <div>{shortTimeAgo(lastPostAt)}</div>}
          </div>
        )}
        <ArrowRight
          size={16}
          className="text-zinc-300 group-hover:text-zinc-900 transition-colors"
        />
      </div>
    </Link>
  );
}

function shortTimeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diff = Date.now() - then;
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const d = Math.floor(hr / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}
