import Link from "next/link";
import {
  ArrowRight,
  Layers,
  ShieldCheck,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

const FEATURED_PAGES: Array<{ slug: string; label: string; hint: string }> = [
  { slug: "demo", label: "/p/demo", hint: "See the AI view in action" },
  { slug: "advisors", label: "/p/advisors", hint: "PhD advisor reviews" },
  { slug: "conferences-cs", label: "/p/conferences-cs", hint: "CS conferences" },
  { slug: "internships", label: "/p/internships", hint: "Tech internships" },
  { slug: "landlords-bayarea", label: "/p/landlords-bayarea", hint: "Bay Area landlords" },
  { slug: "visa-lawyers", label: "/p/visa-lawyers", hint: "Immigration lawyers" },
  { slug: "coding-bootcamps", label: "/p/coding-bootcamps", hint: "Coding bootcamps" },
  { slug: "online-courses", label: "/p/online-courses", hint: "Online courses" },
  { slug: "cs-phd-programs", label: "/p/cs-phd-programs", hint: "CS PhD programs" },
];

export default function Landing() {
  return (
    <main className="mx-auto max-w-5xl px-6">
      {/* Hero */}
      <section className="pt-20 pb-16 sm:pt-28 sm:pb-24">
        <div className="max-w-3xl">
          <p className="text-sm font-medium text-zinc-500 mb-5 tracking-wide uppercase">
            append.page
          </p>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight text-zinc-900 leading-[1.05]">
            A place to write things that can&apos;t be silently deleted.
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-zinc-600 leading-relaxed max-w-2xl">
            Anyone can post on any page. No one — including the operator — can
            edit or delete a post. If a post must be removed for legal reasons,
            the removal itself becomes a permanent public record.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link
              href="/new"
              className="inline-flex items-center gap-2 rounded-full bg-zinc-900 px-6 py-3 text-white text-sm font-medium no-underline hover:bg-zinc-800 transition-colors shadow-sm"
            >
              Start a page
              <ArrowRight size={16} />
            </Link>
            <Link
              href="/p/demo"
              className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-6 py-3 text-zinc-900 text-sm font-medium no-underline hover:border-zinc-900 transition-colors"
            >
              <Sparkles size={16} className="text-zinc-500" />
              See the AI view
            </Link>
          </div>
        </div>
      </section>

      {/* Three core ideas */}
      <section className="grid gap-4 sm:grid-cols-3 mb-24">
        <Pitch
          icon={ShieldCheck}
          title="Tamper-evident"
          body="Every post is hashed and chained to the one before it. Any later edit, deletion, or reorder is mathematically detectable by anyone who saved a snapshot."
        />
        <Pitch
          icon={Sparkles}
          title="AI organizes the chaos"
          body="A language model reads the chain and groups entries by topic, surfaces themes, and highlights notable threads. The default view on every page."
        />
        <Pitch
          icon={Layers}
          title="Data and presentation, decoupled"
          body="The website you're reading is one viewer. The chain is downloadable as JSONL and verifiable in one command. Fork the frontend if ours doesn't suit you."
        />
      </section>

      {/* How it works */}
      <section className="mb-24 grid gap-12 lg:grid-cols-3 lg:gap-16">
        <div className="lg:col-span-1">
          <h2 className="text-2xl font-semibold tracking-tight text-zinc-900">
            How it works
          </h2>
        </div>
        <div className="lg:col-span-2 space-y-6 text-[0.97rem] text-zinc-700 leading-relaxed">
          <p>
            Each page at <code className="font-mono text-zinc-900">/p/&lt;slug&gt;</code>{" "}
            is an <strong>append-only chain</strong>. Every post is hashed and
            linked to the one before it. The whole chain is publicly downloadable
            and verifiable in one command.
          </p>
          <p>
            Bodies live off-chain as <em>salted commitments</em>, so a post can
            be erased on legal request without invalidating the chain — and the
            erasure itself becomes a permanent on-chain record. There is no
            silent deletion, ever.
          </p>
          <p>
            On every page, switch between three views with one click: an
            AI-generated summary, the chronological feed, or the raw JSONL.
            Same data, your presentation. Read{" "}
            <a href="/AGENTS.md">AGENTS.md</a> for the technical spec, or grab
            the full dataset from{" "}
            <a href="https://huggingface.co/datasets/appendpage/ledger">
              HuggingFace
            </a>
            .
          </p>
        </div>
      </section>

      {/* Featured pages */}
      <section className="mb-24">
        <div className="flex items-end justify-between mb-6">
          <h2 className="text-2xl font-semibold tracking-tight text-zinc-900">
            Pages to explore
          </h2>
          <Link
            href="/new"
            className="text-sm text-zinc-600 no-underline hover:text-zinc-900 inline-flex items-center gap-1"
          >
            Start your own
            <ArrowRight size={14} />
          </Link>
        </div>
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURED_PAGES.map((p) => (
            <li key={p.slug}>
              <Link
                href={`/p/${p.slug}`}
                className="block rounded-lg border border-zinc-200 bg-white px-4 py-3 no-underline hover:border-zinc-900 hover:shadow-sm transition-all"
              >
                <div className="text-sm font-medium font-mono text-zinc-900">
                  {p.label}
                </div>
                <div className="text-xs text-zinc-500 mt-0.5">{p.hint}</div>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

function Pitch({
  icon: Icon,
  title,
  body,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 hover:shadow-sm transition-shadow">
      <Icon size={20} className="text-zinc-900 mb-4" strokeWidth={1.75} />
      <h3 className="text-base font-semibold tracking-tight text-zinc-900 mb-1.5">
        {title}
      </h3>
      <p className="text-sm text-zinc-600 leading-relaxed">{body}</p>
    </div>
  );
}
