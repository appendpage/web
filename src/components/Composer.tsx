"use client";

import { Send, X } from "lucide-react";
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

  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 320)}px`;
  }, [body]);

  useEffect(() => {
    if (parent) taRef.current?.focus();
  }, [parent]);

  const byteLength = new Blob([body]).size;
  const tooLong = byteLength > MAX_BYTES;
  const empty = body.trim().length === 0;
  const pct = Math.min(100, (byteLength / MAX_BYTES) * 100);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (empty || tooLong || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/p/${encodeURIComponent(slug)}/entries`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ body, parent_id: parent?.id }),
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
      className="rounded-2xl border border-zinc-200 bg-white shadow-lg shadow-zinc-900/5 ring-1 ring-zinc-900/5"
    >
      {parent && (
        <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-2.5 text-xs text-zinc-700">
          <span className="inline-flex items-center gap-2">
            <span className="text-zinc-500">Replying to</span>
            <span className="font-mono text-zinc-900">#{parent.seq}</span>
          </span>
          <button
            type="button"
            onClick={onClearParent}
            className="inline-flex items-center gap-1 text-zinc-400 hover:text-zinc-900 transition-colors"
          >
            <X size={12} />
            cancel
          </button>
        </div>
      )}

      <div className="px-5 pt-4">
        <textarea
          ref={taRef}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={
            parent
              ? "Write a reply… markdown is fine. Once posted, this can never be silently changed."
              : "Write something… markdown is fine. Once posted, this can never be silently changed."
          }
          className="w-full resize-none border-0 outline-none text-base placeholder:text-zinc-400 bg-transparent min-h-[5.5rem] focus:ring-0"
          disabled={submitting}
        />
      </div>

      {/* Bottom action bar */}
      <div className="px-5 pb-3 pt-1 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="h-1 w-24 bg-zinc-100 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${
                tooLong
                  ? "bg-red-500"
                  : pct > 75
                    ? "bg-amber-500"
                    : "bg-zinc-700"
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <span
            className={`text-xs tabular-nums ${
              tooLong ? "text-red-600" : "text-zinc-400"
            }`}
          >
            {byteLength.toLocaleString()} / {MAX_BYTES.toLocaleString()}
          </span>
        </div>
        <button
          type="submit"
          disabled={empty || tooLong || submitting}
          className="inline-flex items-center gap-1.5 rounded-full bg-zinc-900 px-5 py-2 text-sm text-white font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:bg-zinc-800"
        >
          {submitting ? (
            "Posting…"
          ) : (
            <>
              <Send size={13} strokeWidth={2.25} />
              {parent ? "Post reply" : "Post"}
            </>
          )}
        </button>
      </div>

      {error && (
        <p className="mx-5 mb-3 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700 border border-red-100">
          {error}
        </p>
      )}
    </form>
  );
}
