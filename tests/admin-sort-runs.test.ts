import { describe, expect, it } from "vitest";

import {
  mapAdminJobEvent,
  mapAdminSortRuns,
  type AdminJobEventRow,
  type AdminSortRunRow
} from "@/modules/admin/queries";

describe("admin Sort run queries", () => {
  it("maps Sort runs without exposing track-level data", () => {
    const runs: AdminSortRunRow[] = [
      {
        id: "sort_1",
        user_id: "user_1",
        state: "preview_ready",
        payment_status: "paid",
        created_at: "2026-06-08T09:00:00.000Z",
        updated_at: "2026-06-08T09:10:00.000Z"
      },
      {
        id: "sort_2",
        user_id: "user_2",
        state: "completed",
        payment_status: "pending",
        created_at: "2026-06-08T10:00:00.000Z",
        updated_at: "2026-06-08T10:12:00.000Z"
      }
    ];

    const summaries = mapAdminSortRuns(runs, {
      profiles: [{ id: "user_1", email: "listener@example.com" }],
      playlistCounts: new Map([["sort_1", 4]])
    });

    expect(summaries).toEqual([
      {
        id: "sort_1",
        userId: "user_1",
        userEmail: "listener@example.com",
        state: "preview_ready",
        paymentStatus: "paid",
        playlistCount: 4,
        createdAt: "2026-06-08T09:00:00.000Z",
        updatedAt: "2026-06-08T09:10:00.000Z"
      },
      {
        id: "sort_2",
        userId: "user_2",
        userEmail: null,
        state: "completed",
        paymentStatus: "pending",
        playlistCount: 0,
        createdAt: "2026-06-08T10:00:00.000Z",
        updatedAt: "2026-06-08T10:12:00.000Z"
      }
    ]);
    expect(JSON.stringify(summaries)).not.toContain("track");
  });

  it("maps job event rows for admin diagnostics", () => {
    const row: AdminJobEventRow = {
      id: "event_1",
      sort_run_id: "sort_1",
      stage: "apple_music_export",
      level: "info",
      message: "Created 4 playlists.",
      created_at: "2026-06-08T11:00:00.000Z"
    };

    expect(mapAdminJobEvent(row)).toEqual({
      id: "event_1",
      sortRunId: "sort_1",
      stage: "apple_music_export",
      level: "info",
      message: "Created 4 playlists.",
      createdAt: "2026-06-08T11:00:00.000Z"
    });
  });
});
