import React from "react";

import { AppShell } from "@/components/app/app-shell";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface AppRouteLoadingProps {
  title?: string;
  subtitle?: string;
  rows?: number;
}

export function AppRouteLoading({
  title = "Loading workspace",
  subtitle = "Preparing your Apple Music workspace.",
  rows = 3
}: AppRouteLoadingProps) {
  return (
    <AppShell title={title} subtitle={subtitle}>
      <section aria-busy="true" aria-label="Loading app content" role="status">
        <div className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
          <Card className="min-h-[18rem]">
            <SkeletonBlock className="h-5 w-36" />
            <SkeletonBlock className="mt-5 h-10 w-3/4 max-w-lg" />
            <SkeletonBlock className="mt-4 h-4 w-full max-w-2xl" />
            <SkeletonBlock className="mt-3 h-4 w-5/6 max-w-xl" />
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {Array.from({ length: rows }, (_, index) => (
                <SkeletonBlock key={index} className="h-24" />
              ))}
            </div>
          </Card>
          <Card className="min-h-[18rem]">
            <SkeletonBlock className="h-5 w-28" />
            <div className="mt-6 space-y-3">
              {Array.from({ length: rows }, (_, index) => (
                <SkeletonBlock key={index} className="h-14" />
              ))}
            </div>
          </Card>
        </div>
        <span className="sr-only">Loading app content</span>
      </section>
    </AppShell>
  );
}

function SkeletonBlock({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-xl border border-white/10 bg-white/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]",
        className
      )}
    />
  );
}
