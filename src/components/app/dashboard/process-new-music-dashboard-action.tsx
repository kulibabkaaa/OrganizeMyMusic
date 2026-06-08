"use client";

import React from "react";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import type { ProcessNewMusicResult } from "@/modules/library-syncs/new-music";

export function ProcessNewMusicDashboardAction() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const messageId = "dashboard-process-new-music-message";

  function processNewMusic() {
    setMessage("Processing new music...");
    startTransition(async () => {
      try {
        const response = await fetch("/api/app/new-music/process", {
          method: "POST"
        });
        const payload = (await response.json()) as ProcessNewMusicResult | { error?: string };

        if (!response.ok) {
          throw new Error(
            "error" in payload
              ? payload.error
              : "message" in payload
                ? payload.message
                : "Unable to process new music."
          );
        }

        if ("status" in payload && payload.status === "processed") {
          setMessage(
            `${payload.recommendations.length} playlist recommendation${payload.recommendations.length === 1 ? "" : "s"} ready for review.`
          );
          router.push("/app/playlists?focus=review");
          router.refresh();
          return;
        }

        setMessage(
          "message" in payload ? payload.message : "No new playlist recommendations were created."
        );
        router.refresh();
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Unable to process new music.");
      }
    });
  }

  return (
    <div className="mt-4">
      <Button
        disabled={isPending}
        aria-describedby={messageId}
        className="min-h-11 min-w-44"
        onClick={processNewMusic}
        variant="glass"
      >
        {isPending ? "Processing..." : "Process New Music"}
      </Button>
      <p id={messageId} className="mt-2 text-sm leading-6 text-platform-secondary" aria-live="polite">
        {message ?? "Creates review-only playlist queues. Nothing is exported automatically."}
      </p>
    </div>
  );
}
