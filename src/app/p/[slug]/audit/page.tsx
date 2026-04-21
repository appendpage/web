import { ChevronRight, Link2, ShieldCheck } from "lucide-react";
import Link from "next/link";

import { CodeBlock } from "@/components/CodeBlock";
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
    <main className="mx-auto max-w-4xl px-6 py-12">
      <nav className="text-sm text-zinc-500 mb-4 flex items-center gap-1.5">
        <Link href="/" className="no-underline hover:text-zinc-900">
          append.page
        </Link>
        <ChevronRight size={14} className="text-zinc-300" />
        <Link
          href={`/p/${slug}`}
          className="no-underline hover:text-zinc-900 font-mono"
        >
          /p/{slug}
        </Link>
        <ChevronRight size={14} className="text-zinc-300" />
        <span className="text-zinc-700">audit</span>
      </nav>

      <header className="mb-10">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-zinc-500 font-medium mb-2">
          <ShieldCheck size={12} strokeWidth={2.25} />
          Chain audit
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
          Audit
        </h1>
        <p className="mt-2 text-zinc-600">
          {entries.length === 0 ? (
            "Empty chain."
          ) : (
            <>
              <span className="font-mono text-zinc-900 tabular-nums">
                {entries.length}
              </span>{" "}
              {entries.length === 1 ? "entry" : "entries"} · head{" "}
              <code className="font-mono text-xs">
                {entries[entries.length - 1]?.hash.slice(0, 24)}…
              </code>
            </>
          )}
        </p>
      </header>

      {/* Verifier instructions */}
      <section className="mb-12 rounded-2xl border border-zinc-200 bg-white p-6">
        <h2 className="text-sm font-semibold text-zinc-900 mb-4 inline-flex items-center gap-2">
          <ShieldCheck size={14} />
          Verify this chain (and every body)
        </h2>
        <div className="space-y-3 text-sm">
          <Step n={1} text="Get the verifier (one stdlib-Python file):">
            {`curl -O https://append.page/verify.py`}
          </Step>
          <Step n={2} text="Run it on this page:">
            {`python verify.py https://append.page/p/${slug}`}
          </Step>
        </div>
        <p className="text-xs text-zinc-500 mt-4 leading-relaxed">
          Exit code 0 means: every entry&apos;s <code className="font-mono">hash</code> recomputes
          correctly, every <code className="font-mono">prev_hash</code> link is consistent, and for every
          non-erased entry <code className="font-mono">SHA-256(salt || body)</code> matches the
          on-chain <code className="font-mono">body_commitment</code>. Erased
          entries skip the body check (no body to verify against), but the
          chain link is still checked. See{" "}
          <a href="/AGENTS.md">AGENTS.md §8</a> for the full model.
        </p>
      </section>

      {/* Chain visualization */}
      <section>
        <h2 className="text-lg font-semibold tracking-tight text-zinc-900 mb-4">
          Chain
        </h2>
        {entries.length === 0 ? (
          <p className="text-zinc-500">(Empty.)</p>
        ) : (
          <ol className="space-y-2">
            {entries.map((e: ChainEntry, idx) => (
              <li key={e.id}>
                <ChainNode entry={e} isFirst={idx === 0} isLast={idx === entries.length - 1} />
              </li>
            ))}
          </ol>
        )}
      </section>

      <p className="mt-10 text-sm">
        <Link
          href={`/p/${slug}`}
          className="inline-flex items-center gap-1 no-underline hover:text-zinc-900"
        >
          ← Back to /p/{slug}
        </Link>
      </p>
    </main>
  );
}

function Step({
  n,
  text,
  children,
}: {
  n: number;
  text: string;
  children: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="shrink-0 size-6 rounded-full bg-zinc-100 text-zinc-700 inline-flex items-center justify-center text-xs font-semibold">
        {n}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-zinc-700 mb-1.5">{text}</p>
        <CodeBlock>{children}</CodeBlock>
      </div>
    </div>
  );
}

function ChainNode({
  entry,
  isFirst,
  isLast,
}: {
  entry: ChainEntry;
  isFirst: boolean;
  isLast: boolean;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 hover:border-zinc-300 transition-colors">
      <div className="flex items-center gap-3 mb-2">
        <span className="font-mono text-sm font-medium text-zinc-900 tabular-nums">
          #{entry.seq}
        </span>
        <span className="text-zinc-300">·</span>
        <span className="font-mono text-xs text-zinc-500 truncate flex-1">
          {entry.id}
        </span>
        <span className="rounded-full bg-zinc-100 text-zinc-700 px-2 py-0.5 text-[10px] uppercase tracking-wide font-medium">
          {entry.kind}
        </span>
        {entry.parent && (
          <span className="text-xs text-zinc-500 inline-flex items-center gap-1">
            <Link2 size={11} />
            replies to {entry.parent.slice(0, 10)}…
          </span>
        )}
      </div>
      <div className="font-mono text-[11px] text-zinc-500 space-y-0.5 break-all">
        <div>
          <span className="text-zinc-400">prev:</span>{" "}
          <span className={isFirst ? "text-zinc-400 italic" : ""}>
            {entry.prev_hash}
            {isFirst && " (genesis seed)"}
          </span>
        </div>
        <div>
          <span className="text-zinc-400">hash:</span>{" "}
          <span className={isLast ? "text-zinc-900 font-medium" : "text-zinc-700"}>
            {entry.hash}
            {isLast && " ← head"}
          </span>
        </div>
      </div>
    </div>
  );
}
