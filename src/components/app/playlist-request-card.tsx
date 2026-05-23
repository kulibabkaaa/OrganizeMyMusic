"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import type { StoredPlaylistRequest } from "@/modules/playlist-requests/parser";

type CreateSortRunResponse = {
  error?: string;
  sortRunId?: string;
  state?: string;
  playlistRequests?: StoredPlaylistRequest[];
};

const defaultRequestText = ["Ukrainian rap", "Gym rap", "Sad Slavic songs"].join("\n");

export function PlaylistRequestCard({
  canRequest,
  librarySyncId,
  disabledReason
}: {
  canRequest: boolean;
  librarySyncId?: string;
  disabledReason?: string;
}) {
  const [requestText, setRequestText] = useState(defaultRequestText);
  const [requests, setRequests] = useState<StoredPlaylistRequest[]>([]);
  const [sortRunId, setSortRunId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submitRequests() {
    setMessage("Saving playlist requests...");

    startTransition(async () => {
      try {
        const playlistRequests = requestText
          .split(/\r?\n|,/)
          .map((request) => request.trim())
          .filter(Boolean);
        const response = await fetch("/api/sort-runs", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            librarySyncId,
            playlistRequests
          })
        });
        const payload = (await response.json()) as CreateSortRunResponse;

        if (!response.ok) {
          throw new Error(payload.error ?? "Unable to save playlist requests.");
        }

        setSortRunId(payload.sortRunId ?? null);
        setRequests(payload.playlistRequests ?? []);
        setMessage("Playlist requests saved and preview snapshot generated.");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Unable to save playlist requests.");
      }
    });
  }

  return (
    <section className="rounded-[2rem] border border-white/10 bg-white/[0.08] p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.18em] text-white/42">Playlist requests</p>
          <h2 className="mt-3 font-display text-3xl tracking-[-0.04em]">
            Define the playlists you want.
          </h2>
        </div>
        <StatusPill label={sortRunId ? "Requests saved" : "Parser ready"} tone={sortRunId ? "success" : "inverse"} />
      </div>

      <p className="mt-3 max-w-2xl text-sm leading-7 text-white/62">
        Add at least three playlist ideas. This saves structured rules only; Apple Music write-back
        remains blocked until preview and confirmation.
      </p>

      <label className="mt-5 block text-sm font-medium text-white/72" htmlFor="playlist-requests">
        Requested playlists
      </label>
      <textarea
        id="playlist-requests"
        value={requestText}
        onChange={(event) => setRequestText(event.target.value)}
        rows={5}
        className="mt-2 w-full resize-y rounded-3xl border border-white/10 bg-black/24 px-4 py-3 text-sm leading-6 text-white outline-none transition focus:border-white/30"
      />

      {message ? (
        <p className="mt-3 text-sm leading-6 text-white/68" aria-live="polite">
          {message}
        </p>
      ) : null}
      {!canRequest && disabledReason ? (
        <p className="mt-3 text-sm leading-6 text-amber-100">{disabledReason}</p>
      ) : null}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Button disabled={!canRequest || isPending} onClick={submitRequests} className="min-w-48">
          {isPending ? "Saving..." : "Save requests"}
        </Button>
        {sortRunId ? <span className="text-sm text-white/48">Sort run: {sortRunId}</span> : null}
      </div>

      {requests.length > 0 ? (
        <div className="mt-6 grid gap-3 lg:grid-cols-3">
          {requests.map((request) => (
            <article key={request.id} className="rounded-3xl border border-white/10 bg-black/24 p-4">
              <p className="font-semibold text-white/86">{request.parsedRules.title}</p>
              <p className="mt-1 text-sm text-white/50">{request.userPrompt}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {[
                  ...request.parsedRules.languages,
                  ...request.parsedRules.genres,
                  ...request.parsedRules.moods
                ].map((label) => (
                  <StatusPill key={label} label={label} tone="inverse" />
                ))}
                {request.parsedRules.excludeExplicit ? (
                  <StatusPill label="clean" tone="warning" />
                ) : null}
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
