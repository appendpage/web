"use client";

import { Sparkles, Clock, FileJson } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

const VIEWS = [
  { id: "ai", label: "AI view", icon: Sparkles },
  { id: "chrono", label: "Chronological", icon: Clock },
  { id: "raw", label: "Raw JSONL", icon: FileJson },
] as const;

export type ViewId = (typeof VIEWS)[number]["id"];

/**
 * The view-switcher pill bar at the top of every /p/<slug> page.
 *
 * The whole conceptual point of append.page is data-layer / presentation-layer
 * disaggregation; this control is what makes that decoupling visible to a
 * non-technical visitor in the first second of viewing.
 */
export function ViewSwitcher({ current }: { current: ViewId }) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();

  function go(viewId: ViewId) {
    const params = new URLSearchParams(search.toString());
    if (viewId === "ai") {
      params.delete("view"); // ai is the default
    } else {
      params.set("view", viewId);
    }
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  return (
    <div className="inline-flex rounded-full border border-zinc-200 bg-white p-1 shadow-sm">
      {VIEWS.map((v) => {
        const active = v.id === current;
        const Icon = v.icon;
        return (
          <button
            key={v.id}
            type="button"
            onClick={() => go(v.id)}
            aria-pressed={active}
            className={[
              "inline-flex items-center gap-1.5 px-4 py-1.5 text-sm rounded-full transition-colors",
              active
                ? "bg-zinc-900 text-white"
                : "text-zinc-600 hover:text-zinc-900",
            ].join(" ")}
          >
            <Icon size={14} strokeWidth={2} />
            <span className="hidden sm:inline">{v.label}</span>
          </button>
        );
      })}
    </div>
  );
}
