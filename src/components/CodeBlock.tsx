"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

interface Props {
  /** The text to render and copy. Whitespace is preserved verbatim. */
  children: string;
  /** Visual variant: dark = terminal-style, light = inline code-block. */
  tone?: "dark" | "light";
}

/**
 * <pre>-style code block with a small copy-to-clipboard button in the
 * top-right corner. The button shows a checkmark for ~1.5s after a
 * successful copy, falls back gracefully if `navigator.clipboard` isn't
 * available (e.g. on http origins).
 */
export function CodeBlock({ children, tone = "dark" }: Props) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(false);

  async function copy() {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(children);
      } else {
        // Fallback for non-secure contexts.
        const ta = document.createElement("textarea");
        ta.value = children;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopied(true);
      setError(false);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setError(true);
      window.setTimeout(() => setError(false), 2000);
    }
  }

  const dark = tone === "dark";

  return (
    <div className="relative group">
      <pre
        className={[
          "overflow-x-auto rounded-md text-xs font-mono leading-relaxed",
          dark
            ? "bg-zinc-900 text-zinc-50 px-3 py-2 pr-12"
            : "bg-zinc-100 text-zinc-800 px-3 py-2 pr-12",
        ].join(" ")}
      >
        {children}
      </pre>
      <button
        type="button"
        onClick={copy}
        aria-label={copied ? "Copied" : "Copy to clipboard"}
        title={error ? "Copy failed" : copied ? "Copied" : "Copy"}
        className={[
          "absolute top-1.5 right-1.5 inline-flex items-center justify-center rounded-md p-1.5 transition-all",
          dark
            ? "bg-zinc-800/80 text-zinc-300 hover:bg-zinc-700 hover:text-white"
            : "bg-white/80 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-900",
          // Hidden until hover on coarse-pointer devices, but always visible
          // on touch devices that don't trigger :hover.
          "opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100",
        ].join(" ")}
      >
        {copied ? (
          <Check size={13} strokeWidth={2.5} className="text-emerald-400" />
        ) : (
          <Copy size={13} strokeWidth={2} />
        )}
      </button>
    </div>
  );
}
