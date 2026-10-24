"use client";

import { useCallback, useEffect, useState } from "react";
import { reportReasons } from "@/lib/report-reasons";

interface Report {
  id: string; reason: keyof typeof reportReasons; details: string; created_at: string;
}
interface ReviewEntry {
  id: string; page: string; seq: number; body: string; withheld: boolean;
  parent_seq: number | null; parent_body: string | null; reports: Report[];
}

export function ModerationQueue() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [entries, setEntries] = useState<ReviewEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [confirm, setConfirm] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const response = await fetch("/api/admin/reports", { cache: "no-store", signal: AbortSignal.timeout(20_000) });
    if (response.status === 401) { setAuthenticated(false); setEntries([]); setPassword(""); return; }
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? "Couldn't load reports.");
    setAuthenticated(true);
    setEntries(data.entries);
    setTotal(data.total);
  }, []);

  const run = useCallback(async (task: () => Promise<void>) => {
    setBusy(true); setError("");
    try { await task(); }
    catch (err) { setError(err instanceof Error ? err.message : "Please try again."); }
    finally { setBusy(false); }
  }, []);

  useEffect(() => { void run(refresh); }, [refresh, run]);

  async function post(path: string, data: unknown) {
    const response = await fetch(`/api/admin/${path}`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify(data), signal: AbortSignal.timeout(20_000),
    });
    const result = await response.json();
    if (response.status === 401) { setAuthenticated(false); setEntries([]); }
    if (!response.ok) throw new Error(result.error ?? "Couldn't save. Please try again.");
    return result;
  }

  function decide(entry: ReviewEntry, decision: "keep" | "withhold") {
    void run(async () => {
      const result = await post("reports", { entry_id: entry.id, report_ids: entry.reports.map((report) => report.id), decision });
      setConfirm(null);
      setNotice(!result.changed ? "These reports were already reviewed. The queue has been refreshed." : decision === "withhold" ? `Post #${entry.seq} withheld. The decision is recorded publicly.` : `Reports for post #${entry.seq} closed.`);
      await refresh();
    });
  }

  const button = "min-h-11 rounded-lg border border-zinc-300 bg-white px-4 text-sm font-medium hover:bg-zinc-50 disabled:opacity-40";

  return <>
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div><h1 className="text-2xl font-semibold tracking-tight">Moderation</h1><p className="mt-2 text-sm text-zinc-600">Private reports. Every request gets a human decision.</p></div>
      {authenticated && <div className="flex gap-2">
        <button className={button} disabled={busy} onClick={() => void run(refresh)}>Refresh</button>
        <button className={button} disabled={busy} onClick={() => void run(async () => { await post("logout", {}); setAuthenticated(false); setEntries([]); setNotice(""); })}>Sign out</button>
      </div>}
    </div>
    {error && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-800">{error}</p>}
    {notice && authenticated && <p role="status" className="mb-4 rounded-lg bg-green-50 p-4 text-sm text-green-900">{notice}</p>}
    {authenticated === null && <p role="status" className="text-sm text-zinc-500">{busy ? "Loading…" : "Unable to connect."}{!busy && <button className={`${button} ml-3`} onClick={() => void run(refresh)}>Retry</button>}</p>}
    {authenticated === false && <form className="max-w-sm space-y-4 rounded-2xl border border-zinc-200 bg-white p-6" onSubmit={(event) => {
      event.preventDefault(); void run(async () => { await post("login", { password }); setPassword(""); await refresh(); });
    }}>
      <label className="block text-sm font-medium" htmlFor="admin-password">Admin password</label>
      <input id="admin-password" type="password" autoComplete="current-password" required value={password} maxLength={256}
        onChange={(event) => setPassword(event.target.value)} className="min-h-11 w-full rounded-lg border border-zinc-300 px-3" />
      <button disabled={busy} className={`${button} w-full`}>{busy ? "Signing in…" : "Sign in"}</button>
    </form>}
    {authenticated && <>
      <p className="mb-4 text-sm text-zinc-600">{total === 0 ? "No reports awaiting review." : `${total} ${total === 1 ? "post" : "posts"} awaiting review${total > entries.length ? ` · showing the oldest ${entries.length}` : ""}`}</p>
      <div className="space-y-6">{entries.map((entry) => <article key={entry.id} className="rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6">
        <header className="mb-4 flex flex-wrap items-center gap-3"><a href={`/p/${encodeURIComponent(entry.page)}?view=chrono#e-${entry.id}`} target="_blank" rel="noreferrer" className="font-medium">/{entry.page} · #{entry.seq}</a>{entry.withheld && <span className="rounded-full bg-amber-100 px-3 py-1 text-xs text-amber-900">Already withheld</span>}</header>
        {entry.parent_body !== null && <details className="mb-4 rounded-lg bg-zinc-50 p-3 text-sm"><summary className="cursor-pointer text-zinc-600">Replying to #{entry.parent_seq}</summary><p className="mt-3 whitespace-pre-wrap break-words">{entry.parent_body}</p></details>}
        <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{entry.body}</p>
        <div className="mt-5 space-y-3 border-t border-zinc-100 pt-4">{entry.reports.map((report) => <div key={report.id} className="rounded-lg bg-zinc-50 p-3 text-sm">
          <p className="font-medium">{reportReasons[report.reason]}</p>
          {report.details && <p className="mt-2 whitespace-pre-wrap break-words text-zinc-700">{report.details}</p>}
          <time className="mt-2 block text-xs text-zinc-500" dateTime={report.created_at}>{new Date(report.created_at).toLocaleString()}</time>
        </div>)}</div>
        {entry.reports.length === 100 && <p className="mt-3 text-xs text-zinc-500">Showing 100 reports. Any additional reports remain in the queue.</p>}
        {confirm === entry.id ? <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm">
          <p>Hide this post from the site and future exports? Its original text will be retained privately. Existing downloaded copies cannot be recalled.</p>
          <p className="mt-2">Public record: “Content withheld following moderation review.”</p>
          <div className="mt-4 flex flex-wrap gap-2"><button disabled={busy} onClick={() => decide(entry, "withhold")} className="min-h-11 rounded-lg bg-zinc-900 px-4 font-medium text-white disabled:opacity-40">Confirm withholding</button><button disabled={busy} onClick={() => setConfirm(null)} className={button}>Cancel</button></div>
        </div> : <div className="mt-5 flex flex-wrap gap-2">
          <button disabled={busy} onClick={() => decide(entry, "keep")} className={button}>{entry.withheld ? "Close reports" : "Keep visible"}</button>
          {!entry.withheld && <button disabled={busy} onClick={() => setConfirm(entry.id)} className={button}>Withhold content…</button>}
        </div>}
      </article>)}</div>
    </>}
  </>;
}
