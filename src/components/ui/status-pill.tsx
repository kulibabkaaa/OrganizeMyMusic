import { cn } from "@/lib/utils";

export function StatusPill({
  label,
  tone = "neutral"
}: {
  label: string;
  tone?: "neutral" | "accent" | "success" | "warning";
}) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-3 py-1 text-xs font-medium uppercase tracking-[0.2em]",
        tone === "neutral" && "bg-black/5 text-black/70",
        tone === "accent" && "bg-[#ffe5eb] text-[#cf143a]",
        tone === "success" && "bg-emerald-50 text-emerald-700",
        tone === "warning" && "bg-amber-50 text-amber-700"
      )}
    >
      {label}
    </span>
  );
}

