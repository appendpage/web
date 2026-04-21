import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-24 text-center">
      <h1 className="text-3xl font-semibold tracking-tight mb-3">
        Page not found
      </h1>
      <p className="text-zinc-600 mb-6">
        Nothing here. Yet.
      </p>
      <div className="flex justify-center gap-3">
        <Link
          href="/"
          className="rounded-full border border-zinc-300 bg-white px-4 py-2 text-zinc-900 no-underline hover:bg-zinc-50"
        >
          Home
        </Link>
        <Link
          href="/new"
          className="rounded-full bg-zinc-900 px-4 py-2 text-white no-underline hover:bg-zinc-700"
        >
          Start a page
        </Link>
      </div>
    </main>
  );
}
