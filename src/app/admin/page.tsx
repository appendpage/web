import type { Metadata } from "next";
import { ModerationQueue } from "@/components/ModerationQueue";

export const metadata: Metadata = {
  title: "Moderation · append.page",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return <main className="mx-auto max-w-3xl px-4 py-10"><ModerationQueue /></main>;
}
