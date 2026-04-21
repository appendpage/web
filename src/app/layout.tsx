import type { Metadata } from "next";
import type { ReactNode } from "react";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";

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
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable}`}
    >
      <body
        className="min-h-screen flex flex-col font-sans"
        style={{
          fontFamily: `${GeistSans.style.fontFamily}, ui-sans-serif, system-ui, sans-serif`,
        }}
      >
        <div className="flex-1">{children}</div>
        <SiteFooter />
      </body>
    </html>
  );
}

function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-zinc-200/80 bg-white/40 backdrop-blur-sm">
      <div className="mx-auto max-w-5xl px-6 py-10 text-sm text-zinc-500 flex flex-wrap gap-x-6 gap-y-3 justify-between items-center">
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          <a href="/AGENTS.md" className="no-underline hover:text-zinc-900">AGENTS.md</a>
          <a href="/api/spec.json" className="no-underline hover:text-zinc-900">API</a>
          <a href="/notes" className="no-underline hover:text-zinc-900">About</a>
          <a href="/status" className="no-underline hover:text-zinc-900">Status</a>
        </div>
        <div className="text-xs">
          Run by{" "}
          <a href="https://github.com/da03" className="no-underline hover:text-zinc-900">
            @da03
          </a>
          {" · "}
          <a
            href="https://github.com/appendpage"
            className="no-underline hover:text-zinc-900"
          >
            Open source (MIT)
          </a>
        </div>
      </div>
    </footer>
  );
}
