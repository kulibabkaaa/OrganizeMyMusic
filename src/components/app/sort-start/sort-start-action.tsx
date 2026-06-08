"use client";

import React, { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";

export function SortStartAction({
  sortId,
  ctaLabel,
  disabled = false,
  disabledReasonId
}: {
  sortId: string;
  ctaLabel: string;
  disabled?: boolean;
  disabledReasonId?: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function startFullOrganization() {
    setError(null);
    startTransition(async () => {
      const response = await fetch(`/api/app/sorts/${encodeURIComponent(sortId)}/checkout`, {
        method: "POST"
      });
      const payload = (await response.json().catch(() => null)) as
        | { error?: string; checkoutUrl?: string; processingUrl?: string }
        | null;

      if (!response.ok) {
        setError(payload?.error ?? "Full organization could not start.");
        return;
      }

      const nextUrl = payload?.checkoutUrl ?? payload?.processingUrl;

      if (nextUrl) {
        window.location.href = nextUrl;
      }
    });
  }

  return (
    <div className="space-y-3">
      <Button
        className="w-full"
        disabled={disabled || isPending}
        aria-describedby={disabled ? disabledReasonId : undefined}
        onClick={startFullOrganization}
      >
        {isPending ? "Starting..." : ctaLabel}
      </Button>
      {error ? <p className="text-sm text-platform-danger">{error}</p> : null}
    </div>
  );
}
