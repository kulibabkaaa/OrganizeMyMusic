import { describe, expect, it } from "vitest";

import { createSupabasePlaylistGenerationStore } from "@/modules/playlists/generation-store";

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
});

function createReviewStateSupabase() {
  const state = {
    trackDecisionUpdates: [] as Array<Record<string, unknown>>,
    generationStatusUpdates: [] as Array<Record<string, unknown>>,
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
  }
) {
  const query = {
    action: "select",
    eqCount: 0,
    values: null as Record<string, unknown> | null,
    select() {
      query.action = "select";
      return query;
    },
    update(values: Record<string, unknown>) {
      query.action = "update";
      query.values = values;
      return query;
    },
    eq() {
      query.eqCount += 1;

      if (query.action === "update" && table === "playlist_generation_tracks") {
        return query.eqCount >= 2 ? Promise.resolve({ data: null, error: null }) : query;
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
