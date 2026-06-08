import React from "react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function EmptyState({
  title,
  description,
  action,
  className
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-[1.5rem] border border-dashed border-white/12 bg-white/[0.035] p-6 text-center",
        className
      )}
    >
      <h2 className="font-display text-2xl font-semibold tracking-[0em] text-white">{title}</h2>
      {description ? (
        <p className="mx-auto mt-2 max-w-xl text-sm leading-7 text-platform-secondary">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </section>
  );
}
