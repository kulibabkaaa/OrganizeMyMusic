import { describe, expect, it } from "vitest";

import {
  createTrackFeatureProfile,
  createTrackFeatureProfiles
} from "@/modules/sorting/track-profile";
import type { NormalizedTrack, TrackClassification } from "@/types/domain";

const baseTrack: NormalizedTrack = {
  id: "track_1",
  appleSongId: "apple_song_1",
  name: "Midnight Drive",
  artistName: "Nova",
  albumName: "After Hours",
  normalizedName: "midnight drive",
  normalizedArtist: "nova",
  normalizedAlbum: "after hours",
  fingerprint: "fingerprint_1",
  durationInMillis: 210000,
  genreNames: ["Electronic"],
  contentRating: "explicit",
  isrc: "US-AAA-24-00001"
};

const baseClassification: TrackClassification = {
  fingerprint: "fingerprint_1",
  language: "english",
  genre: "Electronic",
  subgenres: ["synthwave"],
  moods: ["Driving", "Late-Night"],
  energy: 0.82,
  confidence: 0.91,
  source: "openai",
  version: 2,
  metadataHash: "metadata_hash_1"
};

describe("track feature profile", () => {
  it("creates a normalized profile from track metadata and classification", () => {
    expect(
      createTrackFeatureProfile({
        track: baseTrack,
        classification: baseClassification
      })
    ).toEqual({
      trackId: "track_1",
      fingerprint: "fingerprint_1",
      appleSongId: "apple_song_1",
      title: "Midnight Drive",
      artist: "Nova",
      album: "After Hours",
      genre: "Electronic",
      language: "english",
      moods: ["Driving", "Late-Night"],
      energy: 0.82,
      explicit: true,
      year: null,
      confidence: 0.91,
      classificationSource: "openai",
      classificationVersion: 2,
      hasClassification: true
    });
  });

  it("represents missing classification safely", () => {
    expect(
      createTrackFeatureProfile({
        track: {
          ...baseTrack,
          appleSongId: undefined,
          albumName: undefined,
          contentRating: undefined
        },
        classification: null
      })
    ).toEqual({
      trackId: "track_1",
      fingerprint: "fingerprint_1",
      appleSongId: null,
      title: "Midnight Drive",
      artist: "Nova",
      album: null,
      genre: null,
      language: null,
      moods: [],
      energy: null,
      explicit: false,
      year: null,
      confidence: 0,
      classificationSource: null,
      classificationVersion: null,
      hasClassification: false
    });
  });

  it("creates profiles for preview and full-sort inputs by fingerprint", () => {
    const profiles = createTrackFeatureProfiles({
      tracks: [
        baseTrack,
        {
          ...baseTrack,
          id: "track_2",
          appleSongId: "apple_song_2",
          fingerprint: "fingerprint_2",
          name: "Quiet Morning",
          contentRating: "clean"
        }
      ],
      classifications: [baseClassification]
    });

    expect(profiles).toHaveLength(2);
    expect(profiles[0]).toMatchObject({
      trackId: "track_1",
      genre: "Electronic",
      hasClassification: true
    });
    expect(profiles[1]).toMatchObject({
      trackId: "track_2",
      genre: null,
      explicit: false,
      hasClassification: false
    });
  });

  it("normalizes out-of-range confidence and energy defensively", () => {
    expect(
      createTrackFeatureProfile({
        track: baseTrack,
        classification: {
          ...baseClassification,
          confidence: 1.4,
          energy: -0.2
        }
      })
    ).toMatchObject({
      confidence: 1,
      energy: 0
    });
  });
});
