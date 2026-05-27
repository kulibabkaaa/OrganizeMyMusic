import React from "react";
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
      <div className="pointer-events-none fixed inset-0 bg-hero-bloom opacity-80" />
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_76%_8%,rgba(255,255,255,0.12),transparent_22%),linear-gradient(115deg,rgba(0,0,0,0)_52%,rgba(255,4,54,0.10)_100%)]" />
      <a
        href="#app-main"
        className="sr-only fixed left-4 top-4 z-[60] rounded-full bg-white px-4 py-2 text-sm font-semibold text-black focus:not-sr-only focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-platform-pink"
      >
        Skip to main content
      </a>
      <AppSidebar />
      <AppMobileNav />

      <main
        id="app-main"
        tabIndex={-1}
        aria-label="Main app content"
        className="relative mx-auto max-w-7xl px-5 py-8 outline-none sm:px-6 sm:py-10 lg:ml-72 lg:px-10"
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
