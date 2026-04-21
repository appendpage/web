import Link from "next/link";
import { ArrowRight, BookOpen } from "lucide-react";

const FEATURED_PAGES: Array<{ slug: string; label: string; hint: string }> = [
  { slug: "advisors", label: "/p/advisors", hint: "Anonymous reviews of academic advisors" },
  { slug: "internships", label: "/p/internships", hint: "Tech internships and host advice" },
  { slug: "demo", label: "/p/demo", hint: "Hand-written sample (fictional)" },
];

export default function Landing() {
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

      {/* Featured pages */}
      <section className="pb-24">
        <h2 className="text-xs uppercase tracking-wide text-zinc-500 font-medium mb-3">
          Pages
        </h2>
        <ul className="space-y-2">
          {FEATURED_PAGES.map((p) => (
            <li key={p.slug}>
              <Link
                href={`/p/${p.slug}`}
                className="group flex items-center justify-between gap-4 rounded-xl border border-zinc-200 bg-white px-5 py-4 no-underline hover:border-zinc-900 hover:shadow-sm transition-all"
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium font-mono text-zinc-900">
                    {p.label}
                  </div>
                  <div className="text-sm text-zinc-500 mt-0.5">{p.hint}</div>
                </div>
                <ArrowRight
                  size={16}
                  className="text-zinc-300 group-hover:text-zinc-900 transition-colors shrink-0"
                />
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
