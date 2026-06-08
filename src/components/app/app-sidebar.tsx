"use client";

import React from "react";
import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";

import { appNavigationItems, isAppNavigationItemActive } from "@/components/app/app-navigation";
import { cn } from "@/lib/utils";

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 border-r border-white/10 bg-black/70 px-4 py-5 text-white shadow-[0_24px_120px_rgba(0,0,0,0.36)] backdrop-blur lg:flex lg:flex-col">
      <Link
        href="/"
        className="rounded-[1.25rem] border border-white/10 bg-white/[0.055] px-4 py-4 transition hover:bg-white/[0.08] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-platform-pink"
      >
        <span className="block font-display text-xl font-semibold tracking-[0em]">
          Organize Your Music
        </span>
        <span className="mt-1 block text-xs uppercase tracking-[0.18em] text-platform-muted">
          Apple Music workspace
        </span>
      </Link>

      <nav className="mt-6 grid gap-2" aria-label="Platform navigation">
        {appNavigationItems.map((item) => {
          const isActive = isAppNavigationItemActive(item.href, pathname);

          return (
            <Link
              key={item.href}
              href={item.href as Route}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "group flex min-h-12 items-center gap-3 rounded-2xl border px-3 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-platform-pink",
                isActive
                  ? "border-[rgba(255,45,85,0.28)] bg-[rgba(255,45,85,0.13)] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                  : "border-transparent text-platform-secondary hover:border-white/10 hover:bg-white/[0.06] hover:text-white"
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "grid h-8 w-8 place-items-center rounded-full border text-xs font-semibold",
                  isActive
                    ? "border-[rgba(255,45,85,0.40)] bg-platform-pink text-white"
                    : "border-white/10 bg-white/[0.06] text-platform-muted group-hover:text-white"
                )}
              >
                {item.marker}
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto rounded-[1.25rem] border border-white/10 bg-white/[0.045] p-4">
        <p className="text-xs uppercase tracking-[0.18em] text-platform-muted">Apple Music</p>
        <p className="mt-2 text-sm leading-6 text-platform-secondary">
          Apple Music only. Review is required before export.
        </p>
      </div>
    </aside>
  );
}
