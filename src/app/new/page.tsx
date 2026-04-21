"use client";

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
    <main className="mx-auto max-w-2xl px-6 py-12">
      <div className="text-xs text-zinc-500 mb-2">
        <a href="/" className="no-underline hover:underline">
          append.page
        </a>{" "}
        /
      </div>
      <h1 className="text-2xl font-semibold tracking-tight mb-4">
        Start a page
      </h1>
      <p className="text-zinc-600 mb-6 leading-relaxed">
        Pick a slug. Anything posted on the page becomes part of an append-only
        chain — once a post is in, no one (including the operator) can silently
        edit or delete it. Slugs are reserved forever.
      </p>

      <form
        onSubmit={submit}
        className="space-y-4 rounded-lg border border-zinc-200 bg-white p-6"
      >
        <label className="block">
          <span className="block text-sm font-medium text-zinc-800 mb-1">
            Slug
          </span>
          <div className="flex items-center rounded-md border border-zinc-300 bg-white focus-within:ring-2 focus-within:ring-zinc-900 focus-within:border-transparent">
            <span className="pl-3 pr-1 text-zinc-500 select-none">
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
              className="flex-1 px-1 py-2 outline-none bg-transparent"
              autoComplete="off"
              autoFocus
            />
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            Lowercase letters, digits, and hyphens. 2–49 characters. Slugs that
            look like a person&apos;s name (e.g.{" "}
            <code className="font-mono">first-last</code>) need a quick admin
            review.
          </p>
        </label>

        <label className="block">
          <span className="block text-sm font-medium text-zinc-800 mb-1">
            Description (optional)
          </span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value.slice(0, 280))}
            placeholder="One sentence about what this page is for."
            rows={2}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
          />
          <p className="text-xs text-zinc-500 mt-1">
            {description.length}/280
          </p>
        </label>

        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-zinc-500">
            By creating a page you agree to the{" "}
            <a href="/terms">terms</a>.
          </p>
          <button
            type="submit"
            disabled={!slugValid || submitting}
            className="rounded-full bg-zinc-900 px-5 py-2 text-sm text-white disabled:opacity-50 hover:bg-zinc-700"
          >
            {submitting ? "Creating…" : "Create page"}
          </button>
        </div>

        {error && (
          <p className="text-sm text-red-600">Error: {error}</p>
        )}
        {info && <p className="text-sm text-amber-700">{info}</p>}
      </form>
    </main>
  );
}
