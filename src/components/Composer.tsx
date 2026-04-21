"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import type { ChainEntry } from "@/lib/types";

interface Props {
  slug: string;
  /** When set, the composer renders as a reply to this entry. */
  parent: ChainEntry | null;
  onClearParent: () => void;
}

const MAX_BYTES = 4096;

export function Composer({ slug, parent, onClearParent }: Props) {
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const taRef = useRef<HTMLTextAreaElement | null>(null);
  const router = useRouter();

  // Auto-grow the textarea.
  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 320)}px`;
  }, [body]);

  // Scroll the parent into view when reply mode is engaged.
  useEffect(() => {
    if (parent) {
      taRef.current?.focus();
    }
  }, [parent]);

  const byteLength = new Blob([body]).size;
  const tooLong = byteLength > MAX_BYTES;
  const empty = body.trim().length === 0;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (empty || tooLong || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/p/${encodeURIComponent(slug)}/entries`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          body,
          parent_id: parent?.id,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(
          j.message ?? j.error ?? `${res.status} ${res.statusText}`,
        );
      }
      setBody("");
      onClearParent();
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong. Try again?",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm"
    >
      {parent && (
        <div className="mb-3 flex items-center justify-between rounded-md bg-zinc-100 px-3 py-2 text-xs text-zinc-700">
          <span>
            Replying to <span className="font-mono">#{parent.seq}</span>
          </span>
          <button
            type="button"
            onClick={onClearParent}
            className="text-zinc-500 hover:text-zinc-900"
          >
            cancel
          </button>
        </div>
      )}

      <textarea
        ref={taRef}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={
          parent
            ? "Write a reply… (markdown is fine; once posted, this can never be silently changed)"
            : "Write something… (markdown is fine; once posted, this can never be silently changed)"
        }
        className="w-full resize-none border-0 outline-none text-base placeholder:text-zinc-400 bg-transparent min-h-[6rem]"
        disabled={submitting}
      />

      <div className="mt-3 flex items-center justify-between text-xs text-zinc-500">
        <div>
          {tooLong ? (
            <span className="text-red-600">
              {byteLength}/{MAX_BYTES} bytes — too long
            </span>
          ) : (
            <span>
              {byteLength}/{MAX_BYTES} bytes
            </span>
          )}
        </div>
        <button
          type="submit"
          disabled={empty || tooLong || submitting}
          className="rounded-full bg-zinc-900 px-4 py-1.5 text-sm text-white transition disabled:opacity-50 hover:bg-zinc-700"
        >
          {submitting ? "Posting…" : parent ? "Post reply" : "Post"}
        </button>
      </div>

      {error && (
        <p className="mt-2 text-xs text-red-600">{error}</p>
      )}
    </form>
  );
}
