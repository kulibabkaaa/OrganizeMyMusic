import type { SupabaseClient } from "@supabase/supabase-js";

import { createSupabasePlaylistRecipeStore } from "@/modules/playlist-recipes/store";
import {
  createSupabasePreviewSnapshotStore,
  isPreviewImmutable,
  saveSortRunPreviewSnapshotOnly,
  type PreviewSnapshotStore,
  type PreviewSortRun,
  type PreviewTrackClassification
} from "@/modules/sorts/preview-snapshot";
import { generateRecipePlaylists } from "@/modules/sorts/playlist-rules";
import type {
  GeneratedPlaylist,
  GeneratedPlaylistTrack,
  NormalizedTrack,
  PlaylistRecipe,
  PlaylistRecipeTag
} from "@/types/domain";

export interface LightweightPreviewTrackSample {
  fingerprint: string;
  normalizedTrackId?: string;
  appleSongId?: string;
  name?: string;
  artistName?: string;
  albumName?: string;
  position: number;
  score: number;
  reason: string;
}

export interface LightweightPreviewPlaylist {
  id: string;
  recipeId: string;
  playlistName: string;
  tags: PlaylistRecipeTag[];
  estimatedTrackCount: number;
  confidenceLabel: GeneratedPlaylist["confidenceLabel"];
  fitLabel: "strong" | "limited" | "none";
  sampleTracks: LightweightPreviewTrackSample[];
  lockedTrackCount: number;
  qualityWarnings?: string[];
}

export interface LightweightPreviewSnapshot {
  sortRunId: string;
  librarySyncId: string;
  generatedAt: string;
  playlists: LightweightPreviewPlaylist[];
}

export interface LightweightPreviewStore {
  getSortRunForPreview: PreviewSnapshotStore["getSortRunForPreview"];
  listRecipesForSort(input: { userId: string; sortRunId: string }): Promise<PlaylistRecipe[]>;
  listTracksForPreview(input: {
    librarySyncId: string;
    userId: string;
  }): Promise<NormalizedTrack[]>;
  listClassificationsForPreview(input: {
    normalizedTrackIds: string[];
  }): Promise<PreviewTrackClassification[]>;
  saveLightweightPreviewSnapshot(input: {
    sortRun: PreviewSortRun;
    snapshot: LightweightPreviewSnapshot;
  }): Promise<LightweightPreviewSnapshot>;
}

export type LightweightPreviewResult =
  | {
      status: "created";
      snapshot: LightweightPreviewSnapshot;
    }
  | {
      status: "existing";
      snapshot: LightweightPreviewSnapshot;
    }
  | {
      status: "immutable";
      snapshot: LightweightPreviewSnapshot | null;
    }
  | {
      status: "not_found" | "missing_library_sync" | "empty_recipes";
    };

const SAMPLE_TRACK_LIMIT = 3;
const STRONG_FIT_TRACK_COUNT = 10;
const LIMITED_FIT_TRACK_COUNT = 1;

export async function generateAndStoreLightweightPreview(input: {
  store: LightweightPreviewStore;
  sortRunId: string;
  userId: string;
  now?: () => string;
}): Promise<LightweightPreviewResult> {
  const sortRun = await input.store.getSortRunForPreview({
    sortRunId: input.sortRunId,
    userId: input.userId
  });

  if (!sortRun) {
    return { status: "not_found" };
  }

  if (isPreviewImmutable(sortRun)) {
    return {
      status: "immutable",
      snapshot: isLightweightPreviewSnapshot(sortRun.previewSnapshot)
        ? sortRun.previewSnapshot
        : null
    };
  }

  if (isLightweightPreviewSnapshot(sortRun.previewSnapshot) && sortRun.state === "preview_ready") {
    return {
      status: "existing",
      snapshot: sortRun.previewSnapshot
    };
  }

  if (!sortRun.librarySyncId) {
    return { status: "missing_library_sync" };
  }

  const recipes = await input.store.listRecipesForSort({
    userId: sortRun.userId,
    sortRunId: sortRun.id
  });

  if (recipes.length === 0) {
    return { status: "empty_recipes" };
  }

  const tracks = await input.store.listTracksForPreview({
    librarySyncId: sortRun.librarySyncId,
    userId: sortRun.userId
  });
  const classifications = await input.store.listClassificationsForPreview({
    normalizedTrackIds: tracks.map((track) => track.id)
  });
  const fingerprintByNormalizedTrackId = new Map(
    tracks.map((track) => [track.id, track.fingerprint])
  );
  const classificationsWithFingerprints = classifications.map((classification) => ({
    ...classification,
    fingerprint:
      classification.fingerprint ||
      fingerprintByNormalizedTrackId.get(classification.normalizedTrackId) ||
      classification.fingerprint
  }));
  const generatedPlaylists = generateRecipePlaylists({
    recipes,
    tracks,
    classifications: classificationsWithFingerprints
  });
  const snapshot: LightweightPreviewSnapshot = {
    sortRunId: sortRun.id,
    librarySyncId: sortRun.librarySyncId,
    generatedAt: input.now?.() ?? new Date().toISOString(),
    playlists: recipes.map((recipe, index) =>
      createLightweightPreviewPlaylist(recipe, generatedPlaylists[index], tracks, index)
    )
  };

  return {
    status: "created",
    snapshot: await input.store.saveLightweightPreviewSnapshot({
      sortRun,
      snapshot
    })
  };
}

export function createSupabaseLightweightPreviewStore(
  supabase: SupabaseClient
): LightweightPreviewStore {
  const previewStore = createSupabasePreviewSnapshotStore(supabase);
  const recipeStore = createSupabasePlaylistRecipeStore(supabase);

  return {
    getSortRunForPreview: previewStore.getSortRunForPreview,
    listRecipesForSort: recipeStore.listRecipesForSort,
    listTracksForPreview: previewStore.listTracksForPreview,
    listClassificationsForPreview: previewStore.listClassificationsForPreview,
    saveLightweightPreviewSnapshot(input) {
      return saveSortRunPreviewSnapshotOnly({
        supabase,
        sortRun: input.sortRun,
        snapshot: input.snapshot
      });
    }
  };
}

function createLightweightPreviewPlaylist(
  recipe: PlaylistRecipe,
  playlist: GeneratedPlaylist | undefined,
  libraryTracks: NormalizedTrack[],
  recipeIndex: number
): LightweightPreviewPlaylist {
  const tracks = playlist?.tracks ?? [];
  const fallbackTracks = tracks.length > 0 ? [] : fallbackSampleTracks(libraryTracks, recipeIndex);
  const sampleTracks =
    tracks.length > 0
      ? tracks.slice(0, SAMPLE_TRACK_LIMIT).map(toTrackSample)
      : fallbackTracks;
  const estimatedTrackCount = playlist?.trackCount && playlist.trackCount > 0
    ? playlist.trackCount
    : sampleTracks.length;

  return {
    id: `preview_${recipe.id}`,
    recipeId: recipe.id,
    playlistName: recipe.name,
    tags: recipe.tags,
    estimatedTrackCount,
    confidenceLabel: playlist?.confidenceLabel ?? "medium",
    fitLabel: fitLabelForTrackCount(estimatedTrackCount),
    sampleTracks,
    lockedTrackCount: Math.max(0, estimatedTrackCount - sampleTracks.length),
    ...(playlist?.qualityWarnings?.length ? { qualityWarnings: playlist.qualityWarnings } : {})
  };
}

function fallbackSampleTracks(
  libraryTracks: NormalizedTrack[],
  recipeIndex: number
): LightweightPreviewTrackSample[] {
  const start = recipeIndex * SAMPLE_TRACK_LIMIT;
  const sample = libraryTracks.slice(start, start + SAMPLE_TRACK_LIMIT);
  const tracks = sample.length > 0 ? sample : libraryTracks.slice(0, SAMPLE_TRACK_LIMIT);

  return tracks.map((track, index) => ({
    fingerprint: track.fingerprint,
    normalizedTrackId: track.id,
    appleSongId: track.appleSongId,
    name: track.name,
    artistName: track.artistName,
    albumName: track.albumName,
    position: index,
    score: 0.5,
    reason: "Sample from your Apple Music library."
  }));
}

function toTrackSample(track: GeneratedPlaylistTrack): LightweightPreviewTrackSample {
  return {
    fingerprint: track.fingerprint,
    normalizedTrackId: track.normalizedTrackId,
    appleSongId: track.appleSongId,
    name: track.name,
    artistName: track.artistName,
    albumName: track.albumName,
    position: track.position,
    score: track.score,
    reason: track.reason
  };
}

function fitLabelForTrackCount(trackCount: number): LightweightPreviewPlaylist["fitLabel"] {
  if (trackCount >= STRONG_FIT_TRACK_COUNT) {
    return "strong";
  }

  if (trackCount >= LIMITED_FIT_TRACK_COUNT) {
    return "limited";
  }

  return "none";
}

function isLightweightPreviewSnapshot(value: unknown): value is LightweightPreviewSnapshot {
  return (
    typeof value === "object" &&
    value !== null &&
    "sortRunId" in value &&
    "librarySyncId" in value &&
    "playlists" in value &&
    Array.isArray((value as { playlists?: unknown }).playlists) &&
    ((value as { playlists: unknown[] }).playlists[0] === undefined ||
      "sampleTracks" in ((value as { playlists: unknown[] }).playlists[0] as object))
  );
}
