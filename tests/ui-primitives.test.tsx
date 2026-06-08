import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { MetricCard } from "@/components/ui/metric-card";
import { PageHeader } from "@/components/ui/page-header";
import { Progress } from "@/components/ui/progress";
import { StatusPill } from "@/components/ui/status-pill";
import { TagChip } from "@/components/ui/tag-chip";
import { TrackTable } from "@/components/ui/track-table";

describe("UI primitives", () => {
  it("renders accessible button variants without breaking form actions", () => {
    const markup = renderToStaticMarkup(
      <div>
        <Button>Default</Button>
        <Button variant="glass">Glass</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="danger">Danger</Button>
        <Button variant="disabled" disabled>
          Disabled
        </Button>
        <Button formAction={() => undefined}>Submit action</Button>
      </div>
    );

    expect(markup).toContain('type="button"');
    expect(markup).toContain("bg-accent-sweep");
    expect(markup).toContain("bg-white/10");
    expect(markup).toContain("text-platform-danger");
    expect(markup).toContain("disabled");
    expect(markup).toContain("Submit action");
    expect(markup).not.toContain('type="button">Submit action');
  });

  it("renders status pills with the platform tone set and legacy aliases", () => {
    const markup = renderToStaticMarkup(
      <div>
        <StatusPill label="Neutral" tone="neutral" />
        <StatusPill label="Pink" tone="pink" />
        <StatusPill label="Success" tone="success" />
        <StatusPill label="Warning" tone="warning" />
        <StatusPill label="Danger" tone="danger" />
        <StatusPill label="Muted" tone="muted" />
        <StatusPill label="Accent" tone="accent" />
        <StatusPill label="Inverse" tone="inverse" />
      </div>
    );

    expect(markup).toContain("Neutral");
    expect(markup).toContain("text-platform-pink");
    expect(markup).toContain("text-platform-success");
    expect(markup).toContain("text-platform-warning");
    expect(markup).toContain("text-platform-danger");
    expect(markup).toContain("text-platform-secondary");
  });

  it("renders shared cards, headers, metrics, progress, tags, empty states, and track tables", () => {
    const markup = renderToStaticMarkup(
      <div>
        <PageHeader
          eyebrow="Library"
          title="Your music workspace"
          description="Create Sorts from your Apple Music library."
          actions={<Button>Create Sort</Button>}
        />
        <Card>
          <MetricCard label="Tracks" value="542" helper="Synced from Apple Music" />
          <Progress label="Sync progress" value={42} max={100} />
          <TagChip label="Sad" tone="pink" noteLabel="Has note" onRemoveLabel="Remove Sad" />
          <EmptyState title="No Sorts yet" description="Create your first Sort." action={<Button>Create Sort</Button>} />
          <TrackTable
            caption="Preview tracks"
            tracks={[
              {
                id: "track_1",
                name: "Song",
                artistName: "Artist",
                albumName: "Album",
                meta: "3:12"
              }
            ]}
          />
        </Card>
      </div>
    );

    expect(markup).toContain("Your music workspace");
    expect(markup).toContain("Tracks");
    expect(markup).toContain('role="progressbar"');
    expect(markup).toContain('aria-valuenow="42"');
    expect(markup).toContain("Has note");
    expect(markup).toContain("No Sorts yet");
    expect(markup).toContain("<table");
    expect(markup).toContain("Preview tracks");
    expect(markup).toContain("Song");
  });
});
