import React from "react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("grid gap-5 md:grid-cols-[1fr_auto] md:items-end", className)}>
      <div>
        {eyebrow ? (
          <p className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-platform-muted">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="font-display text-4xl font-semibold tracking-[0em] text-white md:text-5xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-3 max-w-2xl text-sm leading-7 text-platform-secondary">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
    </header>
  );
}
