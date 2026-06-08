import React from "react";

import { cn } from "@/lib/utils";
import type { ProcessingStep } from "@/modules/sorts/progress";

export function ProcessingSteps({ steps }: { steps: ProcessingStep[] }) {
  return (
    <ol className="grid gap-3" aria-label="Processing steps">
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

function formatStepStatus(status: ProcessingStep["status"]) {
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
