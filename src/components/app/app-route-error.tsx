"use client";

import React from "react";

import { AppShell } from "@/components/app/app-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface AppRouteErrorProps {
  reset: () => void;
  title?: string;
  subtitle?: string;
  heading?: string;
  description?: string;
}

export function AppRouteError({
  reset,
  title = "Something went wrong",
  subtitle = "This app route could not load.",
  heading = "The page could not load",
  description = "Try again, return to the dashboard, or view all Sorts."
}: AppRouteErrorProps) {
  return (
    <AppShell title={title} subtitle={subtitle}>
      <Card className="max-w-3xl" role="alert">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-platform-warning">
          Route error
        </p>
        <h2 className="mt-4 font-display text-3xl font-semibold tracking-[0em] text-white">
          {heading}
        </h2>
        <p className="mt-3 text-sm leading-7 text-platform-secondary">{description}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button onClick={reset}>Try again</Button>
          <button
            type="button"
            onClick={() => window.location.assign("/app")}
            className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition duration-200 hover:-translate-y-0.5 hover:bg-white/[0.14] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-platform-pink"
          >
            Back to dashboard
          </button>
          <button
            type="button"
            onClick={() => window.location.assign("/app/sorts")}
            className="inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-semibold text-platform-secondary transition duration-200 hover:bg-white/5 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-platform-pink"
          >
            View all Sorts
          </button>
        </div>
      </Card>
    </AppShell>
  );
}
