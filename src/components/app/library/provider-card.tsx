import React from "react";

import { Card } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/status-pill";
import { cn } from "@/lib/utils";

export type ProviderAvailability = "available" | "coming_later";

export function ProviderCard({
  name,
  status,
  availability,
  className
}: {
  name: string;
  status: string;
  availability: ProviderAvailability;
  className?: string;
}) {
  const isAvailable = availability === "available";

  return (
    <Card
      as="article"
      aria-disabled={!isAvailable}
      className={cn(
        "flex min-h-24 min-w-0 items-center justify-between gap-4 p-5",
        !isAvailable && "opacity-55",
        className
      )}
    >
      <div className="min-w-0">
        <h3 className="break-words font-display text-xl font-semibold tracking-[0em] text-white">{name}</h3>
        <p className="mt-1 text-sm text-platform-secondary">{status}</p>
      </div>
      <StatusPill
        label={isAvailable ? "Ready" : "Disabled"}
        tone={isAvailable ? "success" : "muted"}
      />
    </Card>
  );
}
