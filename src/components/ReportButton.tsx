"use client";

import { Flag, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { ChainEntry } from "@/lib/types";
import { reportReasons } from "@/lib/report-reasons";

export function ReportButton({ entry, compact }: { entry: ChainEntry; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const request = useRef<{ payload: string; id: string } | null>(null);
  const titleId = useId();
  const reasonId = useId();
  const detailsId = useId();

  useEffect(() => {
    if (open) dialog.current?.showModal();
  }, [open]);

  function close() {
    dialog.current?.close();
    setOpen(false);
    trigger.current?.focus();
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy || !reason) return;
    setBusy(true);
    setError("");
    const payload = JSON.stringify({ page: entry.page, entry_id: entry.id, reason, details });
    if (request.current?.payload !== payload) request.current = { payload, id: crypto.randomUUID() };
    try {
      const response = await fetch("/api/reports", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...JSON.parse(payload), id: request.current.id }),
        signal: AbortSignal.timeout(20_000),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "Couldn't send your report. Please try again.");
      setSent(true);
    } catch (err) {
      setError(err instanceof Error && err.name !== "TimeoutError" ? err.message : "Couldn't confirm receipt. Please try again.");
    } finally { setBusy(false); }
  }

  return <>
    <button ref={trigger} type="button" onClick={() => setOpen(true)}
      aria-label={`Report post #${entry.seq}`}
      className={`inline-flex min-h-11 items-center gap-1.5 px-2 text-zinc-500 hover:text-zinc-900 ${compact ? "text-xs" : "text-sm"}`}>
      <Flag size={compact ? 12 : 14} aria-hidden="true" />{sent ? "Reported" : "Report"}
    </button>
    {open && createPortal(
      <dialog ref={dialog} aria-labelledby={titleId} onCancel={(event) => { event.preventDefault(); close(); }}
        className="m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl backdrop:bg-black/35">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 id={titleId} className="text-lg font-semibold">{sent ? "Report received" : `Report post #${entry.seq}`}</h2>
          <button type="button" onClick={close} aria-label="Close report" className="flex min-h-11 min-w-11 items-center justify-center rounded-lg hover:bg-zinc-100"><X size={20} /></button>
        </div>
        {sent ? <>
          <p role="status" className="text-sm leading-relaxed text-zinc-600">Your report is private and will be reviewed.</p>
          <button type="button" onClick={close} className="mt-6 min-h-11 w-full rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white">Done</button>
        </> : <form onSubmit={submit} className="space-y-4">
          <p className="text-sm text-zinc-600">Only the moderator can see your report.</p>
          <div>
            <label htmlFor={reasonId} className="mb-1.5 block text-sm font-medium">Reason</label>
            <select id={reasonId} required value={reason} onChange={(event) => setReason(event.target.value)} disabled={busy}
              className="min-h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm">
              <option value="" disabled>Choose a reason</option>
              {Object.entries(reportReasons).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor={detailsId} className="mb-1.5 block text-sm font-medium">What should we know? <span className="font-normal text-zinc-500">(optional)</span></label>
            <textarea id={detailsId} value={details} onChange={(event) => setDetails(event.target.value)} disabled={busy} maxLength={2000} rows={4}
              placeholder={reason === "misleading" ? "Which statement is inaccurate, and why?" : "Add any context that helps us review this post."}
              className="w-full rounded-lg border border-zinc-300 p-3 text-sm" />
            <p className="mt-1 text-xs text-zinc-500">Please don’t include sensitive personal information.</p>
          </div>
          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
          <button type="submit" disabled={busy || !reason} className="min-h-11 w-full rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white disabled:opacity-40">{busy ? "Sending…" : "Submit report"}</button>
        </form>}
      </dialog>, document.body,
    )}
  </>;
}
