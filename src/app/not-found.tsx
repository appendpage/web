import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-32 text-center">
      <p className="text-xs uppercase tracking-wide text-zinc-500 font-medium mb-3">
        404
      </p>
      <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 mb-3">
        Page not found
      </h1>
      <p className="text-zinc-500 mb-8">
        Nothing here. Yet.
      </p>
      <div className="flex justify-center gap-3">
        <Link
          href="/"
          className="rounded-full border border-zinc-200 bg-white px-5 py-2.5 text-zinc-900 text-sm font-medium no-underline hover:border-zinc-900 transition-colors"
        >
          Home
        </Link>
        <Link
          href="/new"
          className="rounded-full bg-zinc-900 px-5 py-2.5 text-white text-sm font-medium no-underline hover:bg-zinc-800 transition-colors"
        >
          Start a page
        </Link>
      </div>
    </main>
  );
}
