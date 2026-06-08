import React from "react";

import { cn } from "@/lib/utils";

export function StatusPill({
  label,
  tone = "neutral"
}: {
  label: string;
  tone?:
    | "neutral"
    | "inverse"
    | "accent"
    | "pink"
    | "success"
    | "warning"
    | "danger"
    | "muted";
}) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-3 py-1 text-xs font-medium uppercase tracking-[0.2em]",
        tone === "neutral" && "bg-white/[0.08] text-platform-secondary",
        tone === "inverse" && "bg-white/10 text-white/70",
        tone === "accent" && "bg-[#ffe5eb] text-[#cf143a]",
        tone === "pink" && "bg-[rgba(255,45,85,0.12)] text-platform-pink",
        tone === "success" && "bg-[rgba(52,211,153,0.12)] text-platform-success",
        tone === "warning" && "bg-[rgba(251,191,36,0.14)] text-platform-warning",
        tone === "danger" && "bg-[rgba(255,69,99,0.12)] text-platform-danger",
        tone === "muted" && "bg-white/[0.055] text-platform-secondary"
      )}
    >
      {label}
    </span>
  );
}
