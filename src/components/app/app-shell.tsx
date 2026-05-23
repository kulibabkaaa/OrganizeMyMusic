import Link from "next/link";
import type { PropsWithChildren } from "react";

import { cn } from "@/lib/utils";

export function AppShell({
  title,
  subtitle,
  children
}: PropsWithChildren<{ title: string; subtitle: string }>) {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="pointer-events-none fixed inset-0 bg-hero-bloom opacity-80" />
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_76%_8%,rgba(255,255,255,0.12),transparent_22%),linear-gradient(115deg,rgba(0,0,0,0)_52%,rgba(255,4,54,0.10)_100%)]" />
      <header className="relative border-b border-white/10 bg-black/72 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 lg:px-10">
          <div>
            <Link href="/" className="font-display text-xl tracking-[-0.03em]">
              Organize Your Music
            </Link>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-white/58">{subtitle}</p>
          </div>
          <nav className="flex items-center gap-5 text-sm text-white/62">
            <Link href="/dashboard" className={cn("hover:text-white")}>
              Dashboard
            </Link>
            <Link href="/admin/sort-runs" className={cn("hover:text-white")}>
              Admin
            </Link>
          </nav>
        </div>
      </header>

      <main className="relative mx-auto max-w-7xl px-6 py-10 lg:px-10">
        <div className="mb-10">
          <h1 className="font-display text-4xl font-semibold tracking-[0em] md:text-5xl">
            {title}
          </h1>
        </div>
        {children}
      </main>
    </div>
  );
}
