import React from "react";

import { Card } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/status-pill";
import { cn } from "@/lib/utils";

export function ProviderCard({
  name,
  status,
  className
}: {
  name: string;
  status: string;
  className?: string;
}) {
  return (
    <Card
      as="article"
      className={cn(
        "flex min-h-24 min-w-0 items-center justify-between gap-4 p-5",
        className
      )}
    >
      <div className="min-w-0">
        <h3 className="break-words font-display text-xl font-semibold tracking-[0em] text-white">{name}</h3>
        <p className="mt-1 text-sm text-platform-secondary">{status}</p>
      </div>
      <StatusPill
        label="Ready"
        tone="success"
      />
    </Card>
  );
}
