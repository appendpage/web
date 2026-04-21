"use client";

import { ArrowRight, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import type { PageListItem } from "@/lib/types";

const SLUG_REGEX = /^[a-z0-9][a-z0-9-]{1,48}$/;
const SUGGEST_DEBOUNCE_MS = 180;

export default function NewPage() {
  const router = useRouter();
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<PageListItem[]>([]);
  const [suggestLoading, setSuggestLoading] = useState(false);

  const slugValid = SLUG_REGEX.test(slug);

  // Debounced autocomplete: as the user types, fetch existing pages whose
  // slug or description matches. Prevents duplicates like "google-interviews"
  // + "google-internships-2024" for what's effectively the same topic.
  const debounceRef = useRef<number | null>(null);
  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    const needle = slug.trim();
    if (needle.length < 2) {
      setSuggestions([]);
      setSuggestLoading(false);
      return;
    }
    setSuggestLoading(true);
    debounceRef.current = window.setTimeout(async () => {
      try {
        const res = await fetch(
          `/pages?q=${encodeURIComponent(needle)}&limit=6`,
        );
        if (res.ok) {
          const j = (await res.json()) as { pages: PageListItem[] };
          setSuggestions(Array.isArray(j.pages) ? j.pages : []);
        } else {
          setSuggestions([]);
        }
      } catch {
        setSuggestions([]);
      } finally {
        setSuggestLoading(false);
      }
    }, SUGGEST_DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [slug]);

  // Don't confuse the user: if an exact-slug match already exists, don't
  // offer to create that slug — it's already taken.
  const exactMatch = suggestions.find((s) => s.slug === slug);

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

        {/* Autocomplete: existing pages the user might actually want */}
        {(suggestions.length > 0 || suggestLoading) && slug.length >= 2 && (
          <div className="rounded-xl border border-zinc-200 bg-zinc-50/60 p-4">
            <p className="text-xs uppercase tracking-wide text-zinc-500 font-medium mb-2">
              {exactMatch
                ? "Already exists — maybe you meant to visit it?"
                : "Did you mean one of these existing pages?"}
            </p>
            {suggestions.length === 0 && suggestLoading ? (
              <p className="text-sm text-zinc-400">Searching…</p>
            ) : (
              <ul className="space-y-1.5">
                {suggestions.map((s) => (
                  <li key={s.slug}>
                    <Link
                      href={`/p/${s.slug}`}
                      className="group flex items-center justify-between gap-3 rounded-lg border border-transparent hover:border-zinc-300 bg-white px-3 py-2 text-sm no-underline transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-mono text-zinc-900">
                          /p/{s.slug}
                        </div>
                        {s.description && (
                          <div className="text-xs text-zinc-500 truncate">
                            {s.description}
                          </div>
                        )}
                      </div>
                      <span className="shrink-0 text-xs text-zinc-400 tabular-nums">
                        {s.entry_count > 0 ? (
                          <>
                            {s.entry_count}{" "}
                            {s.entry_count === 1 ? "entry" : "entries"}
                          </>
                        ) : (
                          "empty"
                        )}
                      </span>
                      <ArrowRight
                        size={13}
                        className="text-zinc-300 group-hover:text-zinc-900 transition-colors"
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            {!exactMatch && (
              <p className="mt-2 text-xs text-zinc-400">
                Or keep typing to create{" "}
                <code className="font-mono text-zinc-700">/p/{slug}</code>.
              </p>
            )}
          </div>
        )}

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
            disabled={!slugValid || submitting || !!exactMatch}
            className="inline-flex items-center gap-1.5 rounded-full bg-zinc-900 px-5 py-2.5 text-sm text-white font-medium disabled:opacity-40 hover:bg-zinc-800 transition-colors"
          >
            {submitting ? (
              "Creating…"
            ) : exactMatch ? (
              "Already exists"
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
