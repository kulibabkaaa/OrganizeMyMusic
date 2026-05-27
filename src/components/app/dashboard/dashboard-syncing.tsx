import React from "react";
import Link from "next/link";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { StatusPill } from "@/components/ui/status-pill";
import type { LibrarySyncSummary } from "@/modules/library-syncs/queue";

const syncSteps = [
  "Importing songs",
  "Reading metadata",
  "Preparing library index",
  "Ready to sort"
] as const;

export function DashboardSyncing({
  latestSync,
  syncFallbackAction
}: {
  latestSync: LibrarySyncSummary | null;
  syncFallbackAction: ReactNode;
}) {
  const display = getDashboardSyncDisplay(latestSync);

  return (
    <div className="space-y-6">
      <section className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-platform-muted">
            Apple Music connected
          </p>
          <h2 className="mt-2 font-display text-3xl font-semibold tracking-[0em] text-white md:text-4xl">
            Your music workspace
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-platform-secondary">
            Syncing your library so you can create your first Sort. Drafts are available while
            the index finishes.
          </p>
        </div>
        <Link href="/app/sorts/new" className="inline-flex">
          <Button className="min-w-44">Create Sort Draft</Button>
        </Link>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.08fr_0.92fr]">
        <Card elevated className="p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="font-display text-3xl font-semibold tracking-[0em] text-white">
                Apple Music connected
              </h2>
              <p className="mt-2 text-sm leading-7 text-platform-secondary">
                {display.summary}
              </p>
            </div>
            <StatusPill label={`${display.progressPercent}%`} tone="pink" />
          </div>

          <Progress
            label={display.currentStep}
            value={display.progressPercent}
            helper={display.estimatedRemaining}
            className="mt-6"
          />

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="font-mono text-sm text-white/72">{display.trackCountLabel}</p>
            <p className="text-sm text-platform-secondary">{display.estimatedRemaining}</p>
          </div>

          <ol className="mt-6 grid gap-3">
            {syncSteps.map((step, index) => {
              const tone = index < display.currentStepIndex ? "done" : index === display.currentStepIndex ? "live" : "idle";

              return (
                <li key={step} className="flex items-center gap-3 text-sm text-platform-secondary">
                  <span
                    aria-hidden="true"
                    className={
                      tone === "done"
                        ? "h-2.5 w-2.5 rounded-full bg-platform-success"
                        : tone === "live"
                          ? "h-2.5 w-2.5 rounded-full bg-platform-pink shadow-[0_0_24px_rgba(255,45,85,0.55)]"
                          : "h-2.5 w-2.5 rounded-full bg-white/18"
                    }
                  />
                  <span className={tone === "live" ? "text-white" : undefined}>{step}</span>
                </li>
              );
            })}
          </ol>
        </Card>

        <Card className="p-7">
          <StatusPill label={latestSync ? "Background sync" : "Sync fallback"} tone={latestSync ? "warning" : "danger"} />
          <h3 className="mt-5 font-display text-2xl font-semibold tracking-[0em] text-white">
            {latestSync ? "Sync status" : "Library sync is ready to start."}
          </h3>
          <p className="mt-3 text-sm leading-7 text-platform-secondary">
            You can name a Sort and draft Playlist Recipes now. Preview stays locked until the
            library index is ready.
          </p>
          <dl className="mt-5 grid gap-3">
            <StatusRow label="Latest status" value={formatSyncStatus(latestSync)} />
            <StatusRow label="Tracks read" value={formatNumber(latestSync?.rawTrackCount ?? 0)} />
            <StatusRow
              label="Songs indexed"
              value={formatNumber(latestSync?.normalizedTrackCount ?? 0)}
            />
            {latestSync?.errorSummary ? (
              <div className="rounded-2xl border border-[rgba(255,77,109,0.35)] bg-[rgba(255,77,109,0.10)] px-4 py-3">
                <dt className="text-xs uppercase tracking-[0.16em] text-platform-danger">
                  Last error
                </dt>
                <dd className="mt-2 text-sm leading-6 text-white">{latestSync.errorSummary}</dd>
              </div>
            ) : null}
          </dl>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/app/sorts/new" className="inline-flex">
              <Button variant="glass" className="min-w-44">
                Create Sort Draft
              </Button>
            </Link>
            {syncFallbackAction}
          </div>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <ActivityCard title="Recent Activity" description="Apple Music authorization is complete." />
        <ActivityCard title="Library Status" description={display.activityDescription} />
        <ActivityCard title="Recent Sorts" description="No completed Sorts yet." />
      </section>
    </div>
  );
}

function StatusRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
      <dt className="text-xs uppercase tracking-[0.16em] text-platform-muted">{label}</dt>
      <dd className="text-sm font-semibold text-white">{value}</dd>
    </div>
  );
}

function ActivityCard({ title, description }: { title: string; description: string }) {
  return (
    <Card as="article" className="min-h-32">
      <h3 className="font-display text-xl font-semibold tracking-[0em] text-white">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-platform-secondary">{description}</p>
    </Card>
  );
}

function getDashboardSyncDisplay(sync: LibrarySyncSummary | null) {
  if (!sync) {
    return {
      progressPercent: 0,
      currentStep: "Importing songs",
      currentStepIndex: 0,
      trackCountLabel: "0 tracks read",
      estimatedRemaining: "Estimated time appears after progress starts.",
      summary: "Library sync is ready to start.",
      activityDescription: "Waiting for sync to start."
    };
  }

  if (sync.status === "queued") {
    return {
      progressPercent: 12,
      currentStep: "Importing songs",
      currentStepIndex: 0,
      trackCountLabel: `${formatNumber(sync.rawTrackCount)} tracks queued`,
      estimatedRemaining: "Estimated time appears after progress starts.",
      summary: "Library sync is waiting to start.",
      activityDescription: "Sync is queued."
    };
  }

  if (sync.status === "normalizing") {
    return {
      progressPercent: 72,
      currentStep: "Preparing library index",
      currentStepIndex: 2,
      trackCountLabel: `${formatNumber(sync.rawTrackCount)} tracks read`,
      estimatedRemaining: "Estimated time appears after progress starts.",
      summary: "Library sync is building a searchable music index.",
      activityDescription: "Preparing library index."
    };
  }

  if (sync.status === "failed") {
    return {
      progressPercent: 0,
      currentStep: "Importing songs",
      currentStepIndex: 0,
      trackCountLabel: `${formatNumber(sync.rawTrackCount)} tracks read`,
      estimatedRemaining: "Estimated time appears after progress starts.",
      summary: sync.errorSummary ?? "Library sync needs attention.",
      activityDescription: "Sync needs attention."
    };
  }

  return {
    progressPercent: 42,
    currentStep: "Reading metadata",
    currentStepIndex: 1,
    trackCountLabel: `${formatNumber(sync.rawTrackCount)} tracks read`,
    estimatedRemaining: "Estimated time appears after progress starts.",
    summary: "Library sync is building a searchable music index.",
    activityDescription: "Metadata sync in progress."
  };
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatSyncStatus(sync: LibrarySyncSummary | null) {
  if (!sync) {
    return "Not started";
  }

  if (sync.status === "queued") {
    return "Sync queued";
  }

  if (sync.status === "syncing" || sync.status === "normalizing") {
    return "Sync running";
  }

  if (sync.status === "failed") {
    return "Sync failed";
  }

  return "Sync complete";
}
