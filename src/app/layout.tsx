import type { Metadata } from "next";
import type { ReactNode } from "react";

import "./globals.css";

const baseUrl =
  process.env.NEXT_PUBLIC_BASE_URL ?? "https://append.page";

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: "append.page",
    template: "%s · append.page",
  },
  description:
    "A place to write things that can't be silently deleted. Anyone can post. No one can edit or delete a post.",
  openGraph: {
    title: "append.page",
    description:
      "A place to write things that can't be silently deleted. Anyone can post. No one can edit or delete a post.",
    url: baseUrl,
    siteName: "append.page",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "append.page",
    description:
      "A place to write things that can't be silently deleted.",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col">
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}

function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-zinc-200 bg-white">
      <div className="mx-auto max-w-3xl px-6 py-6 text-sm text-zinc-500 flex flex-wrap gap-x-4 gap-y-2 justify-between">
        <div className="flex flex-wrap gap-x-4">
          <a href="/AGENTS.md" className="no-underline hover:underline">AGENTS.md</a>
          <a href="/api/spec.json" className="no-underline hover:underline">API</a>
          <a href="/privacy" className="no-underline hover:underline">Privacy</a>
          <a href="/terms" className="no-underline hover:underline">Terms</a>
          <a href="/contact" className="no-underline hover:underline">Contact</a>
          <a href="/status" className="no-underline hover:underline">Status</a>
        </div>
        <div>
          Run by{" "}
          <a
            href="https://github.com/da03"
            className="no-underline hover:underline"
          >
            @da03
          </a>
          {" · "}
          <a
            href="https://github.com/appendpage"
            className="no-underline hover:underline"
          >
            Open source (MIT)
          </a>
        </div>
      </div>
    </footer>
  );
}
