import React from "react";

import { StatusPill } from "@/components/ui/status-pill";

const pipeline = [
  ["1", "Sign in", "Supabase Auth will protect the dashboard and create a profile row."],
  ["2", "Connect Apple Music", "MusicKit authorization and encrypted token storage."],
  ["3", "Sync library", "Fetch saved songs, store raw JSON, normalize, and dedupe."],
  ["4", "Classify tracks", "Use metadata and heuristics first, with structured AI fallback."],
  ["5", "Preview ready", "Show stable playlist output before any Apple Music export."],
  ["6", "Exported", "Queue export only after explicit user confirmation."]
];

export function PipelineOverview() {
  return (
    <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      <div className="rounded-[2rem] border border-white/10 bg-white/[0.08] p-7 shadow-[0_24px_80px_rgba(0,0,0,0.24)]">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.18em] text-white/45">Library flow</p>
            <h2 className="mt-2 font-display text-3xl tracking-[-0.04em]">Music workspace</h2>
          </div>
          <StatusPill label="MVP flow" tone="accent" />
        </div>

        <div className="mt-8 space-y-5">
          {pipeline.map(([step, title, description]) => (
            <div key={step} className="grid gap-3 border-t border-white/10 pt-5 md:grid-cols-[48px_1fr]">
              <div className="font-display text-3xl tracking-[-0.04em] text-white/25">{step}</div>
              <div>
                <p className="font-medium">{title}</p>
                <p className="mt-1 text-sm leading-6 text-white/58">{description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-[2rem] border border-white/10 bg-black/55 p-7 text-white">
        <p className="text-sm uppercase tracking-[0.18em] text-white/45">Library needs attention</p>
        <h3 className="mt-2 font-display text-3xl tracking-[-0.04em]">
          The dashboard shows state before it performs work.
        </h3>
        <p className="mt-5 text-sm leading-7 text-white/68">
          This ticket keeps every action safe and inert. The page explains the path from sign-in
          through confirmation without loading MusicKit, syncing a library, or writing playlists.
        </p>
      </div>
    </section>
  );
}
