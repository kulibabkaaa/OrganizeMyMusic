"use client";

import React, { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/status-pill";
import type {
  NewMusicPlaylistRecommendation,
  NewMusicSummary,
  ProcessNewMusicResult
} from "@/modules/library-syncs/new-music";

export function NewMusicCard({ summary }: { summary: NewMusicSummary | null }) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<NewMusicPlaylistRecommendation[]>([]);
  const newTrackCount = summary?.newTrackCount ?? 0;
  const canProcess = Boolean(summary?.canProcess);
  const disabledReasonId = "process-new-music-disabled-reason";

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

        if ("recommendations" in payload) {
          setRecommendations(payload.recommendations);
          setMessage(
            payload.status === "processed"
              ? `${payload.recommendations.length} playlist recommendation${payload.recommendations.length === 1 ? "" : "s"} ready for review.`
              : payload.message
          );
        }
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Unable to process new music.");
      }
    });
  }

  return (
    <Card as="section" className="mt-6">
      <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <StatusPill label="User triggered" tone={canProcess ? "success" : "muted"} />
          <h2 className="mt-4 font-display text-2xl font-semibold tracking-[0em] text-white">
            Process New Music
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-platform-secondary">
            {summary?.message ?? "New-song detection is unavailable in this environment."}
          </p>
          <p className="mt-3 font-mono text-sm text-white">
            {newTrackCount} new {newTrackCount === 1 ? "song" : "songs"}
          </p>
        </div>
        <div className="max-w-sm lg:text-right">
          <Button
            disabled={!canProcess || isPending}
            variant={canProcess ? "glass" : "disabled"}
            aria-describedby={disabledReasonId}
            className="min-w-44"
            onClick={processNewMusic}
          >
            {isPending ? "Processing..." : "Process New Music"}
          </Button>
          <p id={disabledReasonId} className="mt-2 text-sm leading-6 text-platform-secondary">
            {canProcess
              ? "Returns review-only playlist recommendations. Nothing is exported automatically."
              : "Run another library sync to detect songs that were added later."}
          </p>
        </div>
      </div>

      {message ? (
        <p className="mt-5 text-sm leading-6 text-platform-secondary" aria-live="polite">
          {message}
        </p>
      ) : null}

      {recommendations.length > 0 ? (
        <div className="mt-5 grid gap-3">
          {recommendations.map((recommendation) => (
            <article
              key={recommendation.playlistId}
              className="rounded-[1.25rem] border border-white/10 bg-black/18 p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-white">{recommendation.playlistName}</p>
                  <p className="mt-1 text-sm text-platform-secondary">
                    {recommendation.trackCount} suggested{" "}
                    {recommendation.trackCount === 1 ? "track" : "tracks"}
                  </p>
                </div>
                <StatusPill label="Review only" tone="warning" />
              </div>
              <ul className="mt-3 grid gap-2">
                {recommendation.tracks.slice(0, 5).map((track) => (
                  <li
                    key={track.normalizedTrackId}
                    className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2"
                  >
                    <p className="text-sm font-medium text-white">
                      {track.name} - {track.artistName}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-platform-secondary">{track.reason}</p>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      ) : null}
    </Card>
  );
}
