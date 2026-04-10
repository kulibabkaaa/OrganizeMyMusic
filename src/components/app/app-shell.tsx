import Link from "next/link";
import type { PropsWithChildren } from "react";

import { cn } from "@/lib/utils";

export function AppShell({
  title,
  subtitle,
  children
}: PropsWithChildren<{ title: string; subtitle: string }>) {
  return (
    <div className="min-h-screen bg-[#fafafa] text-black">
      <header className="border-b border-black/8 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 lg:px-10">
          <div>
            <Link href="/" className="font-display text-xl tracking-[-0.03em]">
              Organize Your Music
            </Link>
            <p className="mt-1 text-sm text-black/55">{subtitle}</p>
          </div>
          <nav className="flex items-center gap-5 text-sm text-black/62">
            <Link href="/dashboard" className={cn("hover:text-black")}>
              Dashboard
            </Link>
            <Link href="/admin/sort-runs" className={cn("hover:text-black")}>
              Admin
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-10 lg:px-10">
        <div className="mb-10">
          <h1 className="font-display text-4xl tracking-[-0.04em]">{title}</h1>
        </div>
        {children}
      </main>
    </div>
  );
}

