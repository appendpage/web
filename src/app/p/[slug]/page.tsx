import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { fetchBodies, fetchChain, fetchDocView } from "@/lib/api";
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

  // Doc view = synthesized, citation-linked document. Stale-while-revalidate;
  // a slightly-stale doc renders instantly and the backend regenerates in
  // the background so the next visit picks up the fresh one.
  let docView: Awaited<ReturnType<typeof fetchDocView>> | null = null;
  if (view === "doc" && entries.length > 0) {
    docView = await fetchDocView(slug);
  }

  return (
    <PageView
      slug={slug}
      description={""}
      view={view}
      entries={entries}
      bodies={bodies}
      rawSnippet={rawSnippet}
      docView={docView}
    />
  );
}

function parseView(v: string | undefined): ViewId {
  if (v === "doc" || v === "raw") return v;
  // Backwards compat: ?view=ai used to mean the tag-based AI view; now
  // it routes to the doc view (the new AI surface).
  if (v === "ai") return "doc";
  // Chronological is the default — instant, always-fresh.
  return "chrono";
}
