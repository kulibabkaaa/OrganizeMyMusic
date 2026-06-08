import React from "react";
import type { ReactNode } from "react";

import { AppleMusicConnectAction } from "@/components/app/apple-music-connect-action";
import { ProviderCard } from "@/components/app/library/provider-card";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/status-pill";

const providers = [
  {
    name: "Apple Music",
    status: "Available now",
    availability: "available" as const
  },
  {
    name: "Spotify",
    status: "Coming later",
    availability: "coming_later" as const
  },
  {
    name: "YouTube Music",
    status: "Coming later",
    availability: "coming_later" as const
  }
];

const disabledModules = [
  {
    title: "Saved Playlists",
    description: "Connect Apple Music first."
  },
  {
    title: "Library Status",
    description: "Not connected."
  },
  {
    title: "Organize Library",
    description: "Connect a library first."
  }
];

export function DashboardEmpty({
  connectAction = <AppleMusicConnectAction />
}: {
  connectAction?: ReactNode;
}) {
  return (
    <div className="space-y-6">
      <section className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-platform-muted">
            App workspace
          </p>
          <h2 className="mt-2 font-display text-3xl font-semibold tracking-[0em] text-white md:text-4xl">
            Your music workspace
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-platform-secondary">
            Connect Apple Music so Organize Your Music can read your library and prepare it for
            sorting.
          </p>
        </div>
        <div className="max-w-xs lg:text-right">
          <Button
            disabled
            aria-describedby="create-sort-disabled-reason"
            className="min-w-44 disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:translate-y-0"
          >
            Organize My Library
          </Button>
          <p
            id="create-sort-disabled-reason"
            className="mt-2 text-sm leading-6 text-platform-secondary"
          >
            Connect Apple Music before organizing your library.
          </p>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <Card elevated className="flex min-h-80 min-w-0 flex-col justify-center p-7">
          <StatusPill label="Library not connected" tone="warning" />
          <h2 className="mt-5 font-display text-3xl font-semibold tracking-[0em] text-white">
            Connect your first music library
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-7 text-platform-secondary">
            Connect Apple Music so Organize Your Music can read your library and prepare it for
            sorting.
          </p>
          <div className="mt-6">{connectAction}</div>
        </Card>

        <div className="grid min-w-0 gap-4">
          {providers.map((provider) => (
            <ProviderCard key={provider.name} {...provider} />
          ))}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {disabledModules.map((module) => (
          <Card key={module.title} as="article" aria-disabled className="min-h-32 min-w-0 opacity-55">
            <h3 className="font-display text-xl font-semibold tracking-[0em] text-white">
              {module.title}
            </h3>
            <p className="mt-2 text-sm leading-6 text-platform-secondary">
              {module.description}
            </p>
          </Card>
        ))}
      </section>
    </div>
  );
}
