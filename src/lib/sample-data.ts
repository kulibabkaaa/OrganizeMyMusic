import type { JobEvent, SortRunSummary } from "@/types/domain";

export const demoSortRun: SortRunSummary = {
  id: "sort_demo_001",
  state: "preview_ready",
  paymentStatus: "pending",
  previewPrice: 1900,
  createdAt: "2026-04-06T16:00:00.000Z",
  updatedAt: "2026-04-06T16:10:00.000Z",
  selectedPlaylistIds: ["lang_en", "genre_pop", "mood_chill", "mood_hype"],
  playlists: [
    {
      id: "lang_en",
      dimension: "language",
      title: "English Favorites",
      description: "The biggest language cluster in the library with clean duplicates removed.",
      confidenceLabel: "high",
      trackCount: 124,
      trackFingerprints: ["fp_1", "fp_2", "fp_3"],
      appleSongIds: ["track_1", "track_2", "track_3"]
    },
    {
      id: "genre_pop",
      dimension: "genre",
      title: "Pop Essentials",
      description: "Apple metadata normalized into a tighter genre playlist.",
      confidenceLabel: "high",
      trackCount: 88,
      trackFingerprints: ["fp_1", "fp_4", "fp_5"],
      appleSongIds: ["track_1", "track_4", "track_5"]
    },
    {
      id: "mood_chill",
      dimension: "mood",
      title: "Late Night Chill",
      description: "Low-friction, repeatable mood picks built from confidence-scored classification.",
      confidenceLabel: "medium",
      trackCount: 47,
      trackFingerprints: ["fp_2", "fp_6", "fp_7"],
      appleSongIds: ["track_2", "track_6", "track_7"]
    },
    {
      id: "mood_hype",
      dimension: "mood",
      title: "Immediate Hype",
      description: "The sharpest energy spikes in the library, curated for instant momentum.",
      confidenceLabel: "medium",
      trackCount: 33,
      trackFingerprints: ["fp_8", "fp_9", "fp_10"],
      appleSongIds: ["track_8", "track_9", "track_10"]
    }
  ]
};

export const demoJobEvents: JobEvent[] = [
  {
    id: "evt_1",
    sortRunId: demoSortRun.id,
    stage: "library_sync",
    level: "info",
    message: "Synced 312 library songs from Apple Music.",
    createdAt: "2026-04-06T16:01:00.000Z"
  },
  {
    id: "evt_2",
    sortRunId: demoSortRun.id,
    stage: "dedupe",
    level: "info",
    message: "Collapsed 27 duplicates into canonical track records.",
    createdAt: "2026-04-06T16:04:00.000Z"
  },
  {
    id: "evt_3",
    sortRunId: demoSortRun.id,
    stage: "classification",
    level: "warn",
    message: "19 tracks required AI fallback for ambiguous mood labeling.",
    createdAt: "2026-04-06T16:08:00.000Z"
  }
];
