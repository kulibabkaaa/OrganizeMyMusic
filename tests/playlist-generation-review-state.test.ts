import { describe, expect, it } from "vitest";

import {
  createSupabasePlaylistGenerationStore,
  PlaylistGenerationTrackNotFoundError
} from "@/modules/playlists/generation-store";

const generationRow = {
  id: "44444444-4444-4444-8444-444444444444",
  user_id: "user_1",
  playlist_id: "22222222-2222-4222-8222-222222222222",
  recipe_id: "33333333-3333-4333-8333-333333333333",
  sort_run_id: null,
  library_sync_id: "55555555-5555-4555-8555-555555555555",
  status: "ready_for_review",
  recipe_snapshot: {},
  error_summary: null,
  generated_at: "2026-06-08T11:00:00.000Z",
  created_at: "2026-06-08T11:00:00.000Z",
  updated_at: "2026-06-08T11:00:00.000Z"
};

const generationTrackRow = {
  id: "66666666-6666-4666-8666-666666666666",
  generation_id: generationRow.id,
  normalized_track_id: "77777777-7777-4777-8777-777777777777",
  position: 0,
  score: 0.91,
  reason: "Genre matches rap",
  decision: "keep",
  created_at: "2026-06-08T11:00:00.000Z"
};

const normalizedTrackRow = {
  id: generationTrackRow.normalized_track_id,
  apple_song_id: "song_1",
  isrc: null,
  name: "Track One",
  artist_name: "Artist One",
  album_name: null,
  normalized_name: "track one",
  normalized_artist: "artist one",
  normalized_album: null,
  fingerprint: "track-one::artist-one",
  duration_in_millis: null,
  genre_names: ["Hip-Hop/Rap"],
  content_rating: null
};

describe("playlist generation review state", () => {
  it("does not mark a generation reviewed when a single track decision is edited", async () => {
    const supabase = createReviewStateSupabase();
    const store = createSupabasePlaylistGenerationStore(supabase.client);

    await store.updateTrackDecisions({
      userId: "user_1",
      playlistId: generationRow.playlist_id,
      generationId: generationRow.id,
      decisions: [{ trackId: generationTrackRow.id, decision: "remove" }]
    });

    expect(supabase.trackDecisionUpdates).toEqual([
      {
        decision: "remove"
      }
    ]);
    expect(supabase.generationStatusUpdates).toEqual([]);
  });

  it("marks a generation reviewed when review completion is explicit", async () => {
    const supabase = createReviewStateSupabase();
    const store = createSupabasePlaylistGenerationStore(supabase.client);

    await store.updateTrackDecisions({
      userId: "user_1",
      playlistId: generationRow.playlist_id,
      generationId: generationRow.id,
      markReviewed: true,
      decisions: [{ trackId: generationTrackRow.id, decision: "keep" }]
    });

    expect(supabase.generationStatusUpdates).toEqual([
      {
        status: "reviewed",
        updated_at: expect.any(String)
      }
    ]);
  });

  it("marks an empty generation reviewed when review completion is explicit", async () => {
    const supabase = createReviewStateSupabase();
    const store = createSupabasePlaylistGenerationStore(supabase.client);

    await store.updateTrackDecisions({
      userId: "user_1",
      playlistId: generationRow.playlist_id,
      generationId: generationRow.id,
      markReviewed: true,
      decisions: []
    });

    expect(supabase.trackDecisionUpdates).toEqual([]);
    expect(supabase.generationStatusUpdates).toEqual([
      {
        status: "reviewed",
        updated_at: expect.any(String)
      }
    ]);
  });

  it("rejects track decisions that do not match the generation", async () => {
    const supabase = createReviewStateSupabase({
      missingTrackIds: new Set(["99999999-9999-4999-8999-999999999999"])
    });
    const store = createSupabasePlaylistGenerationStore(supabase.client);

    await expect(
      store.updateTrackDecisions({
        userId: "user_1",
        playlistId: generationRow.playlist_id,
        generationId: generationRow.id,
        decisions: [
          {
            trackId: "99999999-9999-4999-8999-999999999999",
            decision: "remove"
          }
        ]
      })
    ).rejects.toBeInstanceOf(PlaylistGenerationTrackNotFoundError);

    expect(supabase.generationStatusUpdates).toEqual([]);
  });
});

function createReviewStateSupabase({
  missingTrackIds = new Set<string>()
}: {
  missingTrackIds?: Set<string>;
} = {}) {
  const state = {
    trackDecisionUpdates: [] as Array<Record<string, unknown>>,
    generationStatusUpdates: [] as Array<Record<string, unknown>>,
    missingTrackIds,
    client: null as never
  };

  state.client = {
    from(table: string) {
      return createQuery(table, state);
    }
  } as never;

  return state;
}

function createQuery(
  table: string,
  state: {
    trackDecisionUpdates: Array<Record<string, unknown>>;
    generationStatusUpdates: Array<Record<string, unknown>>;
    missingTrackIds: Set<string>;
  }
) {
  const query = {
    action: "select",
    eqCount: 0,
    values: null as Record<string, unknown> | null,
    updateTrackId: null as string | null,
    select() {
      if (query.action !== "update") {
        query.action = "select";
      }
      return query;
    },
    update(values: Record<string, unknown>) {
      query.action = "update";
      query.values = values;
      return query;
    },
    eq(field: string, value: string) {
      query.eqCount += 1;

      if (query.action === "update" && table === "playlist_generation_tracks") {
        if (field === "id") {
          query.updateTrackId = value;
        }

        return query;
      }

      if (query.action === "update" && table === "playlist_generations") {
        if (query.eqCount >= 2) {
          state.generationStatusUpdates.push(query.values ?? {});
          return Promise.resolve({ data: null, error: null });
        }

        return query;
      }

      return query;
    },
    order() {
      if (table === "playlist_generation_tracks") {
        return Promise.resolve({ data: [generationTrackRow], error: null });
      }

      return query;
    },
    limit() {
      return query;
    },
    maybeSingle() {
      if (query.action === "update" && table === "playlist_generation_tracks") {
        const matched =
          query.updateTrackId === generationTrackRow.id &&
          !state.missingTrackIds.has(query.updateTrackId);

        return Promise.resolve({
          data: matched ? { id: query.updateTrackId } : null,
          error: null
        });
      }

      return Promise.resolve({ data: generationRow, error: null });
    },
    in() {
      return Promise.resolve({ data: [normalizedTrackRow], error: null });
    }
  };

  if (table === "playlist_generation_tracks") {
    const update = query.update;
    query.update = (values: Record<string, unknown>) => {
      state.trackDecisionUpdates.push(values);
      return update(values);
    };
  }

  return query;
}
