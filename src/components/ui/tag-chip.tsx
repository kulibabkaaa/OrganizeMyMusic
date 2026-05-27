import React from "react";
import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type TagTone = "neutral" | "pink" | "success" | "warning" | "danger" | "muted";

const toneClasses: Record<TagTone, string> = {
  neutral: "border-white/10 bg-white/[0.08] text-white",
  pink: "border-[rgba(255,45,85,0.25)] bg-[rgba(255,45,85,0.15)] text-platform-pink",
  success:
    "border-[rgba(57,217,138,0.25)] bg-[rgba(57,217,138,0.10)] text-platform-success",
  warning:
    "border-[rgba(255,176,32,0.25)] bg-[rgba(255,176,32,0.10)] text-platform-warning",
  danger:
    "border-[rgba(255,77,109,0.25)] bg-[rgba(255,77,109,0.10)] text-platform-danger",
  muted: "border-white/10 bg-white/10 text-platform-secondary"
};

export function TagChip({
  label,
  tone = "neutral",
  noteLabel,
  onRemove,
  onRemoveLabel,
  className,
  ...props
}: {
  label: string;
  tone?: TagTone;
  noteLabel?: string;
  onRemove?: ButtonHTMLAttributes<HTMLButtonElement>["onClick"];
  onRemoveLabel?: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex min-h-8 items-center gap-2 rounded-full border px-3 text-sm font-medium",
        toneClasses[tone],
        className
      )}
      {...props}
    >
      <span>{label}</span>
      {noteLabel ? (
        <span className="h-1.5 w-1.5 rounded-full bg-current" aria-label={noteLabel} />
      ) : null}
      {onRemove ? (
        <button
          type="button"
          aria-label={onRemoveLabel ?? `Remove ${label}`}
          className="rounded-full text-current/70 transition hover:text-current focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-platform-pink"
          onClick={onRemove}
        >
          x
        </button>
      ) : null}
    </span>
  );
}
