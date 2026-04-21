import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { fetchBodies, fetchChain } from "@/lib/api";
import { PageView } from "@/components/PageView";
import type { ViewId } from "@/components/ViewSwitcher";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ view?: string }>;
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

  // Probe the page existence: an empty array can mean "page doesn't exist"
  // OR "page exists, no entries yet". Distinguish via raw status.
  if (entries.length === 0) {
    const probe = await fetch(
      `${process.env.APPEND_PAGE_API_URL ?? "https://append.page"}/p/${encodeURIComponent(slug)}/raw`,
      { cache: "no-store" },
    );
    if (probe.status === 404) notFound();
  }

  // Fetch bodies for all entries (for the chronological + raw view).
  // The Phase B bulk endpoint will replace the per-entry fallback inside
  // fetchBodies.
  const bodyMap = await fetchBodies(
    slug,
    entries.map((e) => e.id),
  );
  const bodies = Object.fromEntries(bodyMap);

  // Raw view shows the canonical JSONL — re-serialize from what we have so
  // we don't double-fetch /raw. (The frontend's only knowledge of canonical
  // form is the entries we just got.)
  const rawSnippet = entries
    .map((e) =>
      JSON.stringify(e, Object.keys(e).sort()),
    )
    .join("\n");

  return (
    <PageView
      slug={slug}
      description={""}
      view={view}
      entries={entries}
      bodies={bodies}
      rawSnippet={rawSnippet}
    />
  );
}

function parseView(v: string | undefined): ViewId {
  if (v === "chrono" || v === "raw") return v;
  return "ai";
}
