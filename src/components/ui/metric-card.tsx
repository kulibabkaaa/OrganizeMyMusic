import React from "react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function MetricCard({
  label,
  value,
  helper,
  className
}: {
  label: string;
  value: ReactNode;
  helper?: ReactNode;
  className?: string;
}) {
  return (
    <article className={cn("rounded-3xl border border-white/10 bg-black/25 p-4", className)}>
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-platform-muted">
        {label}
      </p>
      <div className="mt-3 font-display text-3xl font-semibold tracking-[0em] text-white">
        {value}
      </div>
      {helper ? <p className="mt-2 text-sm leading-6 text-platform-secondary">{helper}</p> : null}
    </article>
  );
}
