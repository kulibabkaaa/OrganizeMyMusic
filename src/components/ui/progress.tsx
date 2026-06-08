import React from "react";

import { cn } from "@/lib/utils";

export function Progress({
  label,
  value,
  max = 100,
  helper,
  className
}: {
  label: string;
  value: number;
  max?: number;
  helper?: string;
  className?: string;
}) {
  const safeMax = max > 0 ? max : 100;
  const safeValue = Math.min(Math.max(value, 0), safeMax);
  const percent = Math.round((safeValue / safeMax) * 100);

  return (
    <div className={cn("grid gap-2", className)}>
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-medium text-white">{label}</span>
        <span className="text-platform-secondary">{percent}%</span>
      </div>
      <div
        aria-label={label}
        aria-valuemax={safeMax}
        aria-valuemin={0}
        aria-valuenow={safeValue}
        className="h-2 overflow-hidden rounded-full border border-white/10 bg-white/10"
        role="progressbar"
      >
        <div
          className="h-full rounded-full bg-accent-sweep"
          style={{ width: `${percent}%` }}
        />
      </div>
      {helper ? <p className="text-xs leading-5 text-platform-muted">{helper}</p> : null}
    </div>
  );
}
