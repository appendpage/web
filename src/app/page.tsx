import Link from "next/link";

export default function Landing() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <section className="mb-12">
        <h1 className="text-4xl font-semibold tracking-tight mb-3">
          append.page
        </h1>
        <p className="text-xl text-zinc-700 mb-6 leading-snug">
          A place to write things that can&apos;t be silently deleted.
        </p>
        <p className="text-zinc-600 mb-8 leading-relaxed">
          Anyone can post on any page. No one (including the operator) can
          edit or delete a post. If a post must be removed for legal reasons,
          the removal itself becomes a permanent public record.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/new"
            className="rounded-full bg-zinc-900 px-5 py-2 text-white no-underline hover:bg-zinc-700"
          >
            Start a page
          </Link>
          <Link
            href="/p/demo"
            className="rounded-full border border-zinc-300 bg-white px-5 py-2 text-zinc-900 no-underline hover:bg-zinc-50"
          >
            Try the demo page
          </Link>
        </div>
      </section>

      <section className="mb-12">
        <h2 className="text-lg font-semibold tracking-tight mb-3">
          How it works
        </h2>
        <p className="text-zinc-700 leading-relaxed">
          Each page is an append-only chain. Every post is hashed and linked to
          the one before it, so any later edit, deletion, or reorder is
          mathematically detectable by anyone who saved a snapshot. Bodies
          live off-chain as <em>commitments</em>, so a post can be erased on
          legal request without invalidating the chain — and the erasure
          itself is on-chain forever. Read{" "}
          <a href="/AGENTS.md">AGENTS.md</a> for the technical detail.
        </p>
      </section>

      <section className="mb-12">
        <h2 className="text-lg font-semibold tracking-tight mb-3">
          Same data, your presentation
        </h2>
        <p className="text-zinc-700 leading-relaxed mb-3">
          On every page you can switch between three views with one click:
        </p>
        <ul className="space-y-2 text-zinc-700">
          <li>
            <span className="font-semibold">AI view</span> — the LLM reads the
            chain, groups entries, and surfaces themes. Default for visitors.
          </li>
          <li>
            <span className="font-semibold">Chronological</span> — newest
            posts first. The whole chain, plain.
          </li>
          <li>
            <span className="font-semibold">Raw JSONL</span> — the canonical
            wire format that powers every other view.
          </li>
        </ul>
        <p className="text-zinc-600 text-sm mt-4">
          The data layer is decoupled from the presentation layer. This site
          is one viewer; you can{" "}
          <a href="https://github.com/appendpage/web">fork it</a> or{" "}
          <a href="/AGENTS.md">build your own</a> against the public API. The
          chain is downloadable from the{" "}
          <a href="https://huggingface.co/datasets/appendpage/ledger">
            HuggingFace mirror
          </a>{" "}
          and verifiable in one command.
        </p>
      </section>

      <section className="mb-12">
        <h2 className="text-lg font-semibold tracking-tight mb-3">
          Some pages to start with
        </h2>
        <ul className="grid grid-cols-2 gap-2 text-zinc-700">
          {[
            "demo",
            "advisors",
            "conferences-cs",
            "internships",
            "landlords-bayarea",
            "landlords-nyc",
            "visa-lawyers",
            "coding-bootcamps",
            "online-courses",
            "cs-phd-programs",
          ].map((slug) => (
            <li key={slug}>
              <Link
                href={`/p/${slug}`}
                className="no-underline hover:underline"
              >
                /p/{slug}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
