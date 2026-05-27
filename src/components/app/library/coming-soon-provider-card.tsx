import React from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/status-pill";

export function ComingSoonProviderCard({ name }: { name: string }) {
  const disabledReasonId = `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-coming-soon-reason`;

  return (
    <Card as="article" aria-disabled className="min-h-64 opacity-55">
      <StatusPill label="Coming later" tone="muted" />
      <h3 className="mt-5 font-display text-2xl font-semibold tracking-[0em] text-white">
        {name}
      </h3>
      <p id={disabledReasonId} className="mt-3 text-sm leading-7 text-platform-secondary">
        Provider support is planned after the Apple Music flow is complete.
      </p>
      <div className="mt-6">
        <Button disabled variant="disabled" aria-describedby={disabledReasonId} className="min-w-36">
          Unavailable
        </Button>
      </div>
    </Card>
  );
}
