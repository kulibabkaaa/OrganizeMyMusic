import React from "react";

import { WorkflowStatusPoller } from "@/components/app/workflow-status-poller";
import { WorkflowEscapeActions } from "@/components/app/workflow-escape-actions";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { StatusPill } from "@/components/ui/status-pill";
import { cn } from "@/lib/utils";
import {
  getExportProgress,
  type ExportProgressStep,
  type SortExportSummary
} from "@/modules/sorts/export-progress";

export function ExportingPage({ summary }: { summary: SortExportSummary }) {
  const progress = getExportProgress(summary);

  return (
    <div className="space-y-6">
      <section className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-platform-muted">
            Apple Music export
          </p>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-[0em] text-white md:text-4xl">
            Exporting to Apple Music
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-platform-secondary">
            You can leave and return later. This page can be refreshed while your reviewed playlists are created.
          </p>
        </div>
        <StatusPill label={`${progress.percent}%`} tone={summary.state === "failed" ? "danger" : "pink"} />
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <Card className="space-y-6">
          <div>
            <h2 className="font-display text-2xl font-semibold tracking-[0em] text-white">
              {summary.sortName}
            </h2>
            <p className="mt-2 text-sm text-platform-secondary">
              Current step: {progress.currentStep}
            </p>
          </div>
          <Progress
            label="Apple Music export progress"
            value={progress.percent}
            helper={`${summary.playlists.length} reviewed playlists queued`}
          />
          <ExportSteps steps={progress.steps} />
        </Card>

        <Card elevated className="space-y-5 self-start">
          <StatusPill label="Exporting" tone="pink" />
          <div>
            <h2 className="font-display text-2xl font-semibold tracking-[0em] text-white">
              Reviewed playlists
            </h2>
            <div className="mt-4 grid gap-3">
              {summary.playlists.map((playlist) => (
                <div
                  key={playlist.id}
                  className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3"
                >
                  <p className="text-sm font-semibold text-white">{playlist.title}</p>
                  <p className="mt-1 text-xs text-platform-secondary">
                    {playlist.trackCount} {playlist.trackCount === 1 ? "track" : "tracks"}
                  </p>
                </div>
              ))}
            </div>
          </div>
          <WorkflowStatusPoller
            isActive={summary.state === "creating_playlists"}
            label="Export status"
          />
          <WorkflowEscapeActions />
        </Card>
      </section>
    </div>
  );
}

function ExportSteps({ steps }: { steps: ExportProgressStep[] }) {
  return (
    <ol className="grid gap-3" aria-label="Export steps">
      {steps.map((step) => (
        <li
          key={step.id}
          className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3"
        >
          <span className="flex items-center gap-3 text-sm font-semibold text-white">
            <span
              className={cn(
                "h-2.5 w-2.5 rounded-full border",
                step.status === "done" && "border-platform-success bg-platform-success",
                step.status === "live" && "border-platform-pink bg-platform-pink shadow-pulse",
                step.status === "failed" && "border-platform-danger bg-platform-danger",
                step.status === "pending" && "border-white/20 bg-white/10"
              )}
              aria-hidden="true"
            />
            {step.label}
          </span>
          <span className="text-xs font-medium uppercase tracking-[0.18em] text-platform-muted">
            {formatStepStatus(step.status)}
          </span>
        </li>
      ))}
    </ol>
  );
}

function formatStepStatus(status: ExportProgressStep["status"]) {
  if (status === "live") {
    return "Current";
  }

  if (status === "done") {
    return "Done";
  }

  if (status === "failed") {
    return "Needs attention";
  }

  return "Pending";
}
