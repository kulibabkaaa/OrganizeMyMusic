import React from "react";
import Link from "next/link";
import type { PropsWithChildren } from "react";

import { AppMobileNav } from "@/components/app/app-mobile-nav";
import { AppSidebar } from "@/components/app/app-sidebar";

export function AppShell({
  title,
  subtitle,
  children
}: PropsWithChildren<{ title: string; subtitle: string }>) {
  return (
    <div className="min-h-screen bg-platform-bg text-white">
      <Link
        href="#app-main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-black"
      >
        Skip to main content
      </Link>
      <div className="pointer-events-none fixed inset-0 bg-hero-bloom opacity-70" />
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(115deg,rgba(0,0,0,0)_52%,rgba(255,4,54,0.08)_100%)]" />
      <AppSidebar />
      <AppMobileNav />

      <main
        id="app-main"
        tabIndex={-1}
        aria-label="Main app content"
        className="relative mx-auto max-w-7xl px-5 py-8 outline-none lg:ml-72 lg:px-10 lg:py-10"
      >
        <div className="mb-10">
          <h1 className="font-display text-4xl font-semibold tracking-[0em] md:text-5xl">
            {title}
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-platform-secondary">{subtitle}</p>
        </div>
        {children}
      </main>
    </div>
  );
}
