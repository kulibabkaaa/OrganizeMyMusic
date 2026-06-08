"use client";

import { useRouter } from "next/navigation";
import React, { useEffect } from "react";

const DEFAULT_POLL_INTERVAL_MS = 3000;

export function WorkflowStatusPoller({
  isActive,
  label = "Status updates",
  intervalMs = DEFAULT_POLL_INTERVAL_MS
}: {
  isActive: boolean;
  label?: string;
  intervalMs?: number;
}) {
  const router = useRouter();

  useEffect(() => {
    if (!isActive) {
      return;
    }

    const intervalId = window.setInterval(() => {
      router.refresh();
    }, intervalMs);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [intervalMs, isActive, router]);

  if (!isActive) {
    return (
      <p className="text-sm leading-6 text-platform-muted" aria-live="polite">
        {label} stopped.
      </p>
    );
  }

  return (
    <p className="text-sm leading-6 text-platform-secondary" aria-live="polite">
      {label} auto-refresh every {Math.round(intervalMs / 1000)} seconds.
    </p>
  );
}
