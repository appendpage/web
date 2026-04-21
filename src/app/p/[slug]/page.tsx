import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { fetchBodies, fetchChain, fetchTags } from "@/lib/api";
import { PageView } from "@/components/PageView";
import type { ViewId } from "@/components/ViewSwitcher";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ view?: string; tag?: string; q?: string }>;
}

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return {
    title: `/p/${slug}`,
    description: `Append-only feedback chain at append.page/p/${slug}.`,
  };
}

export default async function Page({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const view = parseView(sp.view);

  let entries;
  try {
    entries = await fetchChain(slug);
  } catch (err) {
    console.error(`[/p/${slug}] fetchChain error:`, err);
    notFound();
  }

  if (entries.length === 0) {
    const probe = await fetch(
      `${process.env.APPEND_PAGE_API_URL ?? "https://append.page"}/p/${encodeURIComponent(slug)}/raw`,
      { cache: "no-store" },
    );
    if (probe.status === 404) notFound();
  }

  const bodyMap = await fetchBodies(slug, entries.map((e) => e.id));
  const bodies = Object.fromEntries(bodyMap);

  // Re-emit canonical JSONL for the Raw view (avoids a second /raw fetch).
  const rawSnippet = entries
    .map((e) => JSON.stringify(e, Object.keys(e).sort()))
    .join("\n");

  // AI view = tags. Stale-while-revalidate; if the page has uncached entries
  // the backend extracts them in the background and the next visit is fresh.
  let aiTags: Awaited<ReturnType<typeof fetchTags>> | null = null;
  if (view === "ai" && entries.length > 0) {
    aiTags = await fetchTags(slug);
  }

  return (
    <PageView
      slug={slug}
      description={""}
      view={view}
      entries={entries}
      bodies={bodies}
      rawSnippet={rawSnippet}
      aiTags={aiTags}
      initialTag={sp.tag}
      initialQuery={sp.q}
    />
  );
}

function parseView(v: string | undefined): ViewId {
  if (v === "ai" || v === "raw") return v;
  // Chronological is the default — instant, always-fresh.
  return "chrono";
}
