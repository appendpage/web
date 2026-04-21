"use client";

import { ArrowRight, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

const SLUG_REGEX = /^[a-z0-9][a-z0-9-]{1,48}$/;

export default function NewPage() {
  const router = useRouter();
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const slugValid = SLUG_REGEX.test(slug);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!slugValid || submitting) return;
    setSubmitting(true);
    setError(null);
    setInfo(null);
    try {
      const res = await fetch("/pages", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          slug,
          description: description || undefined,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(j.message ?? j.error ?? `${res.status}`);
      }
      if (j.status === "queued_review") {
        setInfo(
          `Page /p/${j.slug} was created but needs admin review (the slug looks like a person's name). It'll go live once approved.`,
        );
      } else {
        router.push(`/p/${j.slug}`);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not create the page.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-12 sm:py-16">
      <nav className="text-sm text-zinc-500 mb-5 flex items-center gap-1.5">
        <Link href="/" className="no-underline hover:text-zinc-900">
          append.page
        </Link>
        <ChevronRight size={14} className="text-zinc-300" />
        <span className="text-zinc-700">new</span>
      </nav>

      <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-zinc-900">
        Start a page
      </h1>
      <p className="mt-3 text-zinc-600 leading-relaxed max-w-xl">
        Pick a slug. Anything posted on the page becomes part of an append-only
        chain — once a post is in, no one (including the operator) can silently
        edit or delete it. Slugs are reserved forever.
      </p>

      <form
        onSubmit={submit}
        className="mt-8 space-y-5 rounded-2xl border border-zinc-200 bg-white p-7 shadow-sm"
      >
        <label className="block">
          <span className="block text-sm font-medium text-zinc-900 mb-1.5">
            Slug
          </span>
          <div className="flex items-center rounded-xl border border-zinc-200 bg-white focus-within:border-zinc-900 transition-colors overflow-hidden">
            <span className="pl-3.5 pr-1 text-zinc-400 select-none font-mono text-sm">
              append.page/p/
            </span>
            <input
              type="text"
              value={slug}
              onChange={(e) =>
                setSlug(
                  e.target.value
                    .toLowerCase()
                    .replace(/[^a-z0-9-]/g, "")
                    .slice(0, 49),
                )
              }
              placeholder="conferences-cs"
              className="flex-1 px-1 py-2.5 outline-none bg-transparent font-mono text-sm focus:ring-0"
              autoComplete="off"
              autoFocus
            />
          </div>
          <p className="text-xs text-zinc-500 mt-2">
            Lowercase letters, digits, and hyphens. 2–49 characters. Slugs that
            look like a person&apos;s name (e.g.{" "}
            <code className="font-mono text-zinc-700">first-last</code>) need a
            quick admin review before going live.
          </p>
        </label>

        <label className="block">
          <span className="block text-sm font-medium text-zinc-900 mb-1.5">
            Description{" "}
            <span className="text-zinc-400 font-normal">(optional)</span>
          </span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value.slice(0, 280))}
            placeholder="One sentence about what this page is for."
            rows={2}
            className="w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 outline-none focus:border-zinc-900 transition-colors text-sm resize-none focus:ring-0"
          />
          <p className="text-xs text-zinc-400 mt-1.5 tabular-nums">
            {description.length}/280
          </p>
        </label>

        <div className="flex items-center justify-between gap-3 pt-1">
          <p className="text-xs text-zinc-500">
            By creating a page you agree to the <a href="/terms">terms</a>.
          </p>
          <button
            type="submit"
            disabled={!slugValid || submitting}
            className="inline-flex items-center gap-1.5 rounded-full bg-zinc-900 px-5 py-2.5 text-sm text-white font-medium disabled:opacity-40 hover:bg-zinc-800 transition-colors"
          >
            {submitting ? (
              "Creating…"
            ) : (
              <>
                Create page
                <ArrowRight size={14} />
              </>
            )}
          </button>
        </div>

        {error && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 border border-red-100">
            {error}
          </p>
        )}
        {info && (
          <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800 border border-amber-100">
            {info}
          </p>
        )}
      </form>
    </main>
  );
}
