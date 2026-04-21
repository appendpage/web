import Link from "next/link";

import { fetchChain } from "@/lib/api";
import type { ChainEntry } from "@/lib/types";

interface Props {
  params: Promise<{ slug: string }>;
}

export const dynamic = "force-dynamic";

export default async function AuditPage({ params }: Props) {
  const { slug } = await params;
  const entries = await fetchChain(slug);

  return (
    <main className="mx-auto max-w-3xl px-6 py-8">
      <header className="mb-6">
        <div className="text-xs text-zinc-500 mb-1">
          <a href="/" className="no-underline hover:underline">
            append.page
          </a>{" "}
          / <Link href={`/p/${slug}`}>/p/{slug}</Link> /
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Audit</h1>
        <p className="mt-2 text-sm text-zinc-600">
          {entries.length === 0
            ? "Empty chain."
            : `${entries.length} ${entries.length === 1 ? "entry" : "entries"}, head ${entries[entries.length - 1]?.hash.slice(0, 20)}…`}
        </p>
      </header>

      <section className="mb-8 rounded-lg border border-zinc-200 bg-white p-5">
        <h2 className="text-sm font-semibold mb-2">Verify this chain</h2>
        <ol className="list-decimal pl-5 text-sm text-zinc-700 space-y-1">
          <li>
            Download the JSONL:{" "}
            <code className="font-mono">
              curl -O https://append.page/p/{slug}/raw
            </code>
          </li>
          <li>
            Get the verifier:{" "}
            <code className="font-mono">
              curl -O
              https://raw.githubusercontent.com/appendpage/appendpage/main/tools/verify.py
            </code>
          </li>
          <li>
            Run it: <code className="font-mono">python verify.py raw</code>
          </li>
        </ol>
        <p className="text-xs text-zinc-500 mt-3">
          The verifier replays the chain, recomputes every hash, and checks
          every <code className="font-mono">prev_hash</code> link. Exit code 0
          means the chain is intact. See <a href="/AGENTS.md">AGENTS.md §7</a>.
        </p>
      </section>

      <section>
        <h2 className="text-sm font-semibold mb-3">Chain</h2>
        {entries.length === 0 ? (
          <p className="text-zinc-500">(Empty.)</p>
        ) : (
          <ol className="space-y-1 font-mono text-xs">
            {entries.map((e: ChainEntry) => (
              <li
                key={e.id}
                className="rounded border border-zinc-200 bg-white px-3 py-2"
              >
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="text-zinc-500">#{e.seq}</span>
                  <span className="text-zinc-900 break-all">{e.id}</span>
                  <span className="text-zinc-500">{e.kind}</span>
                  {e.parent && (
                    <span className="text-zinc-500">
                      ↳ parent {e.parent.slice(0, 12)}…
                    </span>
                  )}
                </div>
                <div className="mt-1 text-zinc-600 break-all">
                  prev: {e.prev_hash}
                </div>
                <div className="text-zinc-900 break-all">hash: {e.hash}</div>
              </li>
            ))}
          </ol>
        )}
      </section>

      <p className="mt-8 text-xs text-zinc-500">
        <Link href={`/p/${slug}`} className="no-underline hover:underline">
          ← back to /p/{slug}
        </Link>
      </p>
    </main>
  );
}
