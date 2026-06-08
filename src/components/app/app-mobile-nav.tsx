"use client";

import React from "react";
import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";

import { appNavigationItems, isAppNavigationItemActive } from "@/components/app/app-navigation";
import { cn } from "@/lib/utils";

export function AppMobileNav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-black/78 backdrop-blur lg:hidden">
      <div className="px-5 py-4">
        <Link
          href="/"
          className="font-display text-lg font-semibold tracking-[0em] text-white"
        >
          Organize Your Music
        </Link>
        <nav
          className="mt-4 flex gap-1.5 overflow-x-auto pb-1"
          aria-label="Platform navigation"
        >
          {appNavigationItems.map((item) => {
            const isActive = isAppNavigationItemActive(item.href, pathname);

            return (
              <Link
                key={item.href}
                href={item.href as Route}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex min-h-10 shrink-0 items-center rounded-full border px-3 py-2 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-platform-pink",
                  isActive
                    ? "border-[rgba(255,45,85,0.28)] bg-[rgba(255,45,85,0.13)] text-white"
                    : "border-white/10 bg-white/[0.06] text-platform-secondary"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
