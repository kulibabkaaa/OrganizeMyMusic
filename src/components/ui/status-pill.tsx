import React from "react";

import { cn } from "@/lib/utils";

export function StatusPill({
  label,
  tone = "neutral"
}: {
  label: string;
  tone?: "neutral" | "pink" | "success" | "warning" | "danger" | "muted" | "inverse" | "accent";
}) {
  const resolvedTone = tone === "accent" ? "pink" : tone === "inverse" ? "muted" : tone;

  return (
    <span
      className={cn(
        "inline-flex max-w-full rounded-full border px-3 py-1 text-left text-xs font-medium uppercase leading-4 tracking-[0.2em]",
        resolvedTone === "neutral" && "border-white/10 bg-white/[0.08] text-white/80",
        resolvedTone === "pink" &&
          "border-[rgba(255,45,85,0.25)] bg-[rgba(255,45,85,0.15)] text-platform-pink",
        resolvedTone === "success" &&
          "border-[rgba(57,217,138,0.25)] bg-[rgba(57,217,138,0.10)] text-platform-success",
        resolvedTone === "warning" &&
          "border-[rgba(255,176,32,0.25)] bg-[rgba(255,176,32,0.10)] text-platform-warning",
        resolvedTone === "danger" &&
          "border-[rgba(255,77,109,0.25)] bg-[rgba(255,77,109,0.10)] text-platform-danger",
        resolvedTone === "muted" && "border-white/10 bg-white/10 text-platform-secondary"
      )}
    >
      {label}
    </span>
  );
}
