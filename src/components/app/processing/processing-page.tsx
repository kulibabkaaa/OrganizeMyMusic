import React from "react";
import Link from "next/link";
import type { Route } from "next";

import { ProcessingSteps } from "@/components/app/processing/processing-steps";
import { WorkflowStatusPoller } from "@/components/app/workflow-status-poller";
import { WorkflowEscapeActions } from "@/components/app/workflow-escape-actions";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { StatusPill } from "@/components/ui/status-pill";
import type { SortProcessingProgress } from "@/modules/sorts/progress";

export function ProcessingPage({
  sortId,
  sortName,
  progress
}: {
  sortId: string;
  sortName: string;
  progress: SortProcessingProgress;
}) {
  return (
    <div className="space-y-6">
      <section className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-platform-muted">
            Processing
          </p>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-[0em] text-white md:text-4xl">
            Sorting your library
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-platform-secondary">
            You can leave and return later. Processing jobs stay attached to this Sort.
          </p>
        </div>
        <StatusPill
          label={progress.status === "ready" ? "Ready for review" : `${progress.percent}%`}
          tone={
            progress.status === "failed"
              ? "danger"
              : progress.status === "ready"
                ? "success"
                : "pink"
          }
        />
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <Card className="space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-2xl font-semibold tracking-[0em] text-white">
                {sortName}
              </h2>
              <p className="mt-2 text-sm text-platform-secondary">
                Current step: {progress.currentStep}
              </p>
            </div>
            {progress.estimatedTimeRemaining ? (
              <span className="font-mono text-sm text-platform-secondary">
                {progress.estimatedTimeRemaining}
              </span>
            ) : null}
          </div>

          <Progress
            label="Full Sort progress"
            value={progress.percent}
            helper={`${progress.recipeCount} Playlist Recipes · ${formatCount(progress.trackCountProcessed)} tracks processed`}
          />

          <ProcessingSteps steps={progress.steps} />
        </Card>

        <Card elevated className="space-y-5 self-start">
          <StatusPill
            label={progress.status === "failed" ? "Needs attention" : "Payment confirmed"}
            tone={progress.status === "failed" ? "danger" : "success"}
          />
          <div>
            <h2 className="font-display text-2xl font-semibold tracking-[0em] text-white">
              Sort summary
            </h2>
            <dl className="mt-4 grid gap-3 text-sm">
              <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
                <dt className="text-platform-secondary">Recipes</dt>
                <dd className="font-semibold text-white">
                  {progress.recipeCount} Playlist Recipes
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
                <dt className="text-platform-secondary">Tracks</dt>
                <dd className="font-semibold text-white">
                  {formatCount(progress.trackCountProcessed)} tracks processed
                </dd>
              </div>
            </dl>
          </div>
          <p className="text-sm leading-7 text-platform-secondary">
            Apple Music export will wait for your review.
          </p>
          <WorkflowStatusPoller
            isActive={progress.status === "running"}
            label="Processing status"
          />
          <div className="space-y-3">
            <WorkflowEscapeActions />
            {progress.status === "ready" ? (
              <Link
                href={`/app/sorts/${encodeURIComponent(sortId)}/review` as Route}
                className="inline-flex items-center justify-center rounded-full bg-accent-sweep px-5 py-3 text-sm font-semibold text-white shadow-pulse transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-platform-pink"
              >
                Review playlists
              </Link>
            ) : null}
            {progress.recoveryActionLabel ? (
              <Link
                href={`/app/sorts/${encodeURIComponent(sortId)}/review` as Route}
                className="inline-flex items-center justify-center rounded-full border border-[rgba(255,77,109,0.35)] bg-[rgba(255,77,109,0.10)] px-5 py-3 text-sm font-semibold text-platform-danger transition hover:-translate-y-0.5 hover:bg-[rgba(255,77,109,0.15)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-platform-pink"
              >
                {progress.recoveryActionLabel}
              </Link>
            ) : null}
          </div>
        </Card>
      </section>
    </div>
  );
}

function formatCount(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}
