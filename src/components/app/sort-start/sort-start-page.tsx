import React from "react";

import { SortStartAction } from "@/components/app/sort-start/sort-start-action";
import { WorkflowEscapeActions } from "@/components/app/workflow-escape-actions";
import { Card } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/status-pill";
import type {
  CheckoutMode,
  CheckoutSummary,
  SortStartReadiness
} from "@/modules/payments/checkout";

export function SortStartPage({
  sortId,
  mode,
  summary,
  readiness = { status: "ready" }
}: {
  sortId: string;
  mode: CheckoutMode;
  summary: CheckoutSummary;
  readiness?: SortStartReadiness;
}) {
  const isStartBlocked = readiness.status === "not_ready";
  const isDisabled = mode === "disabled" || isStartBlocked;
  const startDisabledReasonId = isDisabled ? "sort-start-disabled-reason" : undefined;
  const statusLabel = getStartStatusLabel({ isStartBlocked, mode });
  const statusTone = getStartStatusTone({ isStartBlocked, mode });

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
      <Card elevated className="space-y-6">
        <div>
          <StatusPill label={statusLabel} tone={statusTone} />
          <h2 className="mt-4 font-display text-3xl font-semibold tracking-[0em] text-white">
            {summary.title}
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-platform-secondary">
            {summary.description}
          </p>
        </div>

        <dl className="grid gap-3 md:grid-cols-2">
          <SummaryItem label="Sort" value={summary.sortName} />
          <SummaryItem label="Playlist Recipes" value={String(summary.recipeCount)} />
          <SummaryItem label="Connected library" value={summary.connectedLibrary} />
          <SummaryItem label="Estimated output" value={summary.estimatedOutput} />
        </dl>
      </Card>

      <Card className="space-y-5">
        <div>
          <p className="text-sm text-platform-secondary">Access</p>
          <p className="mt-2 font-display text-3xl font-semibold text-white">
            {summary.priceLabel}
          </p>
        </div>

        <ul className="space-y-3 text-sm text-platform-secondary">
          {summary.included.map((item) => (
            <li key={item} className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
              {item}
            </li>
          ))}
        </ul>

        {isDisabled ? (
          <p
            id={startDisabledReasonId}
            className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm leading-6 text-platform-secondary"
          >
            {readiness.status === "not_ready"
              ? readiness.message
              : "Full organization processing is paused in this environment."}
          </p>
        ) : null}
        {mode === "deferred" ? (
          <p className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm leading-6 text-platform-secondary">
            Billing is deferred for the MVP. Starting full organization queues playlist
            generation; Apple Music export still requires track review and explicit confirmation.
          </p>
        ) : null}

        <SortStartAction
          sortId={sortId}
          ctaLabel={summary.ctaLabel}
          disabled={isDisabled}
          disabledReasonId={startDisabledReasonId}
        />
        <WorkflowEscapeActions sortId={sortId} showBuilderLink />
      </Card>
    </div>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
      <dt className="text-xs uppercase tracking-[0.16em] text-platform-muted">{label}</dt>
      <dd className="mt-2 text-sm font-semibold text-white">{value}</dd>
    </div>
  );
}

function getStartStatusLabel({
  isStartBlocked,
  mode
}: {
  isStartBlocked: boolean;
  mode: CheckoutMode;
}) {
  if (isStartBlocked) return "Start blocked";
  if (mode === "deferred") return "MVP access";
  if (mode === "dev_bypass") return "Dev bypass approved";
  if (mode === "disabled") return "Full organization paused";
  return "Billing";
}

function getStartStatusTone({
  isStartBlocked,
  mode
}: {
  isStartBlocked: boolean;
  mode: CheckoutMode;
}): React.ComponentProps<typeof StatusPill>["tone"] {
  if (isStartBlocked || mode === "disabled") return "muted";
  if (mode === "deferred") return "success";
  if (mode === "dev_bypass") return "warning";
  return "pink";
}
