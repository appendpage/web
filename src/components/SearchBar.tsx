"use client";

/**
 * SearchBar — the "Find on this page" input that lives next to the
 * ViewSwitcher.
 *
 * Behavior:
 *   - Bound to `?q=` in the URL (shareable, survives view switches).
 *   - Controlled input with INSTANT React state updates so the filter
 *     responds with no perceived delay; URL updates are debounced ~150ms
 *     so typing doesn't spam history entries.
 *   - Press `/` anywhere on the page to focus (GitHub/YouTube/SO
 *     convention). Skips when typing in another input/textarea or when
 *     a modifier key is held.
 *   - Press `Esc` while focused to clear and blur.
 *   - Small `×` button when non-empty.
 *
 * Note this component renders its own state; the parent reads `q` from
 * `useSearchParams` separately and passes it down to filtered views.
 * That's intentional — the input "owns" the URL via debounced replace,
 * and consumers re-render reactively when the URL changes. This avoids
 * lifting state into PageView and re-rendering the whole tree on every
 * keystroke.
 */
import { Search, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

/** Debounce window for syncing input -> URL. Short enough to feel
 *  immediate, long enough that holding down a key doesn't push 30
 *  entries into history. */
const URL_SYNC_MS = 150;

export function SearchBar() {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();

  // Initialize from URL on mount and whenever the URL `q` changes from
  // outside (e.g. browser back/forward, view switch carrying q).
  const urlQ = search.get("q") ?? "";
  const [value, setValue] = useState(urlQ);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const debounceRef = useRef<number | null>(null);

  // External -> internal sync (back/forward, view switch). We only sync
  // when the URL value diverges from the current input — no risk of
  // wiping in-flight typing because urlQ only changes after our own
  // debounced router.replace lands, by which time `value` already
  // matches it.
  useEffect(() => {
    if (urlQ !== value) {
      setValue(urlQ);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlQ]);

  // Debounced URL sync. Cancel any pending sync on every keystroke;
  // schedule a new one. On unmount, also clear so we don't fire after
  // navigation away.
  useEffect(() => {
    if (debounceRef.current !== null) {
      window.clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    debounceRef.current = window.setTimeout(() => {
      const params = new URLSearchParams(search.toString());
      if (value.trim() === "") {
        params.delete("q");
      } else {
        params.set("q", value);
      }
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    }, URL_SYNC_MS);
    return () => {
      if (debounceRef.current !== null) {
        window.clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
    };
    // We intentionally don't depend on `search` here — including it
    // would re-fire on every URL change and create a loop with our own
    // router.replace.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, pathname, router]);

  // `/` key focuses the input from anywhere. Skip when:
  //   - the active element is already an input/textarea/contenteditable
  //   - any modifier (cmd/ctrl/alt/meta) is held (don't steal real shortcuts)
  //   - the input is already focused
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "/") return;
      if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;
      const t = e.target as HTMLElement | null;
      if (
        t &&
        (t.tagName === "INPUT" ||
          t.tagName === "TEXTAREA" ||
          t.isContentEditable)
      ) {
        return;
      }
      e.preventDefault();
      inputRef.current?.focus();
      inputRef.current?.select();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const clear = useCallback(() => {
    setValue("");
    inputRef.current?.focus();
  }, []);

  return (
    <div className="relative w-full sm:w-72">
      <Search
        size={14}
        strokeWidth={2}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
      />
      <input
        ref={inputRef}
        type="search"
        inputMode="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault();
            if (value !== "") {
              setValue("");
            } else {
              inputRef.current?.blur();
            }
          }
        }}
        placeholder="Find on this page"
        aria-label="Find on this page"
        className="w-full rounded-full border border-zinc-200 bg-white pl-9 pr-9 py-1.5 text-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-300"
      />
      {value !== "" && (
        <button
          type="button"
          onClick={clear}
          aria-label="Clear search"
          className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center justify-center rounded-full p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition-colors"
        >
          <X size={12} strokeWidth={2.5} />
        </button>
      )}
    </div>
  );
}
