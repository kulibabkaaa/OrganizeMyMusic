import { describe, expect, it } from "vitest";

import { normalizeTrack } from "@/modules/library/normalize";
import { parsePlaylistRequestLines } from "@/modules/playlist-requests/parser";
import { generatePlaylists, generateRequestedPlaylists } from "@/modules/sorts/playlist-rules";
import type { GenreLabel, MoodLabel, TrackClassification, TrackLanguage } from "@/types/domain";

describe("generatePlaylists", () => {
  it("skips buckets below the minimum track threshold", () => {
    const tracks = Array.from({ length: 11 }, (_, index) =>
      normalizeTrack({
        id: `track_${index}`,
        name: `Song ${index}`,
        artistName: "Artist",
        albumName: "Album",
        genreNames: ["Pop"]
      })
    );

    const classifications: TrackClassification[] = tracks.map((track) => ({
      fingerprint: track.fingerprint,
      language: "english",
      genre: "Pop",
      subgenres: [],
      moods: ["Feel-Good"],
      energy: null,
      confidence: 0.8,
      source: "heuristic",
      version: 1,
      metadataHash: "hash"
    }));

    expect(generatePlaylists(tracks, classifications)).toHaveLength(0);
  });

  it("generates playlists once a bucket is large enough", () => {
    const tracks = Array.from({ length: 12 }, (_, index) =>
      normalizeTrack({
        id: `track_${index}`,
        name: `Song ${index}`,
        artistName: "Artist",
        albumName: "Album",
        genreNames: ["Pop"]
      })
    );

    const classifications: TrackClassification[] = tracks.map((track) => ({
      fingerprint: track.fingerprint,
      language: "english",
      genre: "Pop",
      subgenres: [],
      moods: ["Feel-Good"],
      energy: null,
      confidence: 0.8,
      source: "heuristic",
      version: 1,
      metadataHash: "hash"
    }));

    const playlists = generatePlaylists(tracks, classifications);

    expect(playlists.some((playlist) => playlist.dimension === "genre")).toBe(true);
  });
});

describe("generateRequestedPlaylists", () => {
  const ukrainianRap = normalizeTrack({
    id: "uk_rap",
    name: "Rap Track",
    artistName: "Artist",
    genreNames: ["Hip-Hop/Rap"],
    contentRating: "explicit"
  });
  const gymRap = normalizeTrack({
    id: "gym_rap",
    name: "Gym Track",
    artistName: "Artist",
    genreNames: ["Hip-Hop/Rap"]
  });
  const sadPop = normalizeTrack({
    id: "sad_pop",
    name: "Sad Song",
    artistName: "Artist",
    genreNames: ["Pop"]
  });
  const tracks = [ukrainianRap, gymRap, sadPop];
  const classifications: TrackClassification[] = [
    {
      fingerprint: ukrainianRap.fingerprint,
      language: "ukrainian",
      genre: "Hip-Hop/Rap",
      subgenres: ["rap"],
      moods: ["Hype"],
      energy: 0.74,
      confidence: 0.9,
      source: "metadata",
      version: 1,
      metadataHash: "hash_uk"
    },
    {
      fingerprint: gymRap.fingerprint,
      language: "english",
      genre: "Hip-Hop/Rap",
      subgenres: ["rap"],
      moods: ["Workout", "Hype"],
      energy: 0.88,
      confidence: 0.86,
      source: "metadata",
      version: 1,
      metadataHash: "hash_gym"
    },
    {
      fingerprint: sadPop.fingerprint,
      language: "english",
      genre: "Pop",
      subgenres: [],
      moods: ["Sad", "Melancholy"],
      energy: 0.35,
      confidence: 0.8,
      source: "heuristic",
      version: 1,
      metadataHash: "hash_sad"
    }
  ];

  it("matches Ukrainian rap with score and reasons", () => {
    const [request] = parsePlaylistRequestLines(["Ukrainian rap"]);
    const playlists = generateRequestedPlaylists({
      requests: [request],
      tracks,
      classifications
    });

    expect(playlists).toHaveLength(1);
    expect(playlists[0]).toMatchObject({
      title: "Ukrainian Rap",
      trackCount: 1,
      confidenceLabel: "high"
    });
    expect(playlists[0]?.tracks).toEqual([
      expect.objectContaining({
        fingerprint: ukrainianRap.fingerprint,
        score: expect.any(Number),
        reason: expect.stringContaining("language")
      })
    ]);
  });

  it("allows a track to appear in multiple requested playlists when it matches both", () => {
    const requests = parsePlaylistRequestLines(["Ukrainian rap", "Gym rap"]);
    const playlists = generateRequestedPlaylists({ requests, tracks, classifications });

    expect(playlists).toHaveLength(2);
    expect(
      playlists.every((playlist) =>
        playlist.tracks.some((track) => track.fingerprint === ukrainianRap.fingerprint)
      )
    ).toBe(true);
  });

  it("matches mood and energy playlists", () => {
    const [request] = parsePlaylistRequestLines(["Gym rap"]);
    const playlists = generateRequestedPlaylists({ requests: [request], tracks, classifications });

    expect(playlists[0]?.tracks[0]).toMatchObject({
      fingerprint: gymRap.fingerprint,
      reason: expect.stringContaining("energy")
    });
  });

  it("returns no playlist for empty-result requests", () => {
    const [request] = parsePlaylistRequestLines(["Late night electronic"]);
    const playlists = generateRequestedPlaylists({ requests: [request], tracks, classifications });

    expect(playlists).toEqual([
      expect.objectContaining({
        title: "Late Night Electronic",
        trackCount: 0,
        tracks: [],
        qualityWarnings: expect.arrayContaining([
          expect.stringContaining("No tracks matched")
        ]),
        matchStats: expect.objectContaining({
          matchedTrackCount: 0,
          rejectedLanguageCount: 0,
          belowScoreCount: expect.any(Number)
        })
      })
    ]);
  });

  it("adds low-match diagnostics without exposing non-matching track names", () => {
    const [request] = parsePlaylistRequestLines(["Ukrainian rap"]);
    const playlists = generateRequestedPlaylists({ requests: [request], tracks, classifications });

    expect(playlists[0]).toMatchObject({
      trackCount: 1,
      qualityWarnings: expect.arrayContaining([
        expect.stringContaining("Only 1 track matched")
      ]),
      matchStats: expect.objectContaining({
        totalTrackCount: 3,
        matchedTrackCount: 1,
        rejectedLanguageCount: 2
      })
    });
    expect(JSON.stringify(playlists[0]?.matchStats)).not.toContain("Sad Song");
    expect(JSON.stringify(playlists[0]?.matchStats)).not.toContain("Gym Track");
  });

  it("covers required MVP languages in request diagnostics", () => {
    const requiredTrackInputs: Array<{
      id: string;
      language: TrackLanguage;
      genre: GenreLabel;
      moods: MoodLabel[];
    }> = [
      { id: "uk", language: "ukrainian", genre: "Hip-Hop/Rap", moods: ["Sad", "Melancholy"] },
      { id: "ru", language: "russian", genre: "Pop", moods: ["Sad"] },
      { id: "pl", language: "polish", genre: "Rock", moods: ["Melancholy"] },
      { id: "en", language: "english", genre: "Pop", moods: ["Sad"] },
      { id: "mix", language: "mixed", genre: "Hip-Hop/Rap", moods: ["Hype"] },
      { id: "inst", language: "instrumental", genre: "Electronic", moods: ["Focus"] },
      { id: "unknown", language: "unknown", genre: "Other", moods: ["Chill"] }
    ];
    const requiredTracks = requiredTrackInputs.map((item) => {
      const track = normalizeTrack({
        id: item.id,
        name: `Track ${item.id}`,
        artistName: "Artist",
        genreNames: [item.genre]
      });

      return {
        track,
        classification: {
          fingerprint: track.fingerprint,
          language: item.language,
          genre: item.genre,
          subgenres: [],
          moods: item.moods,
          energy: 0.35,
          confidence: 0.9,
          source: "heuristic",
          version: 1,
          metadataHash: `hash_${item.id}`
        } satisfies TrackClassification
      };
    });
    const [request] = parsePlaylistRequestLines(["Sad Slavic songs"]);
    const playlists = generateRequestedPlaylists({
      requests: [request],
      tracks: requiredTracks.map((item) => item.track),
      classifications: requiredTracks.map((item) => item.classification)
    });

    expect(playlists[0]).toMatchObject({
      title: "Sad Slavic Songs",
      trackCount: 3,
      matchStats: expect.objectContaining({
        totalTrackCount: 7,
        matchedTrackCount: 3,
        rejectedLanguageCount: 4
      })
    });
  });

  it("keeps genre matches for workout requests when mood and energy metadata are sparse", () => {
    const definiteWorkoutRap = normalizeTrack({
      id: "definite_workout_rap",
      name: "Definite Workout Rap",
      artistName: "Artist",
      genreNames: ["Hip-Hop/Rap"]
    });
    const sparseRap = normalizeTrack({
      id: "sparse_rap",
      name: "Sparse Rap",
      artistName: "Artist",
      genreNames: ["Hip-Hop/Rap"]
    });
    const unrelatedPop = normalizeTrack({
      id: "unrelated_pop",
      name: "Unrelated Pop",
      artistName: "Artist",
      genreNames: ["Pop"]
    });
    const [request] = parsePlaylistRequestLines(["Gym rap"]);
    const playlists = generateRequestedPlaylists({
      requests: [request],
      tracks: [definiteWorkoutRap, sparseRap, unrelatedPop],
      classifications: [
        {
          fingerprint: definiteWorkoutRap.fingerprint,
          language: "english",
          genre: "Hip-Hop/Rap",
          subgenres: ["rap"],
          moods: ["Workout", "Hype"],
          energy: 0.9,
          confidence: 0.9,
          source: "openai",
          version: 1,
          metadataHash: "hash_definite"
        },
        {
          fingerprint: sparseRap.fingerprint,
          language: "english",
          genre: "Hip-Hop/Rap",
          subgenres: [],
          moods: ["Feel-Good"],
          energy: null,
          confidence: 0.82,
          source: "metadata",
          version: 1,
          metadataHash: "hash_sparse"
        },
        {
          fingerprint: unrelatedPop.fingerprint,
          language: "english",
          genre: "Pop",
          subgenres: [],
          moods: ["Workout"],
          energy: 0.88,
          confidence: 0.9,
          source: "openai",
          version: 1,
          metadataHash: "hash_pop"
        }
      ]
    });

    expect(playlists[0]?.tracks.map((track) => track.fingerprint)).toEqual([
      definiteWorkoutRap.fingerprint,
      sparseRap.fingerprint
    ]);
    expect(playlists[0]?.tracks[1]).toMatchObject({
      reason: expect.stringContaining("genre Hip-Hop/Rap")
    });
    expect(playlists[0]?.matchStats).toMatchObject({
      matchedTrackCount: 2,
      rejectedGenreCount: 1
    });
  });

  it("keeps language matches for sad Slavic requests when mood metadata is sparse", () => {
    const russianRap = normalizeTrack({
      id: "russian_rap",
      name: "Russian Rap",
      artistName: "Artist",
      genreNames: ["Hip-Hop/Rap"]
    });
    const polishRock = normalizeTrack({
      id: "polish_rock",
      name: "Polish Rock",
      artistName: "Artist",
      genreNames: ["Rock"]
    });
    const englishSad = normalizeTrack({
      id: "english_sad",
      name: "English Sad",
      artistName: "Artist",
      genreNames: ["Pop"]
    });
    const [request] = parsePlaylistRequestLines(["Sad Slavic songs"]);
    const playlists = generateRequestedPlaylists({
      requests: [request],
      tracks: [russianRap, polishRock, englishSad],
      classifications: [
        {
          fingerprint: russianRap.fingerprint,
          language: "russian",
          genre: "Hip-Hop/Rap",
          subgenres: ["rap"],
          moods: ["Feel-Good"],
          energy: null,
          confidence: 0.84,
          source: "metadata",
          version: 1,
          metadataHash: "hash_ru"
        },
        {
          fingerprint: polishRock.fingerprint,
          language: "polish",
          genre: "Rock",
          subgenres: [],
          moods: ["Sad"],
          energy: 0.42,
          confidence: 0.88,
          source: "openai",
          version: 1,
          metadataHash: "hash_pl"
        },
        {
          fingerprint: englishSad.fingerprint,
          language: "english",
          genre: "Pop",
          subgenres: [],
          moods: ["Sad", "Melancholy"],
          energy: 0.34,
          confidence: 0.9,
          source: "openai",
          version: 1,
          metadataHash: "hash_en"
        }
      ]
    });

    expect(playlists[0]?.tracks.map((track) => track.fingerprint)).toEqual([
      polishRock.fingerprint,
      russianRap.fingerprint
    ]);
    expect(playlists[0]?.tracks[1]).toMatchObject({
      reason: expect.stringContaining("language russian")
    });
    expect(playlists[0]?.matchStats).toMatchObject({
      matchedTrackCount: 2,
      rejectedLanguageCount: 1
    });
  });

  it("covers electronic, chill, driving, and mixed-language tuned scoring", () => {
    const mixedDrivingRap = normalizeTrack({
      id: "mixed_driving_rap",
      name: "Mixed Driving Rap",
      artistName: "Artist",
      genreNames: ["Hip-Hop/Rap"]
    });
    const chillElectronic = normalizeTrack({
      id: "chill_electronic",
      name: "Chill Electronic",
      artistName: "Artist",
      genreNames: ["Electronic"]
    });
    const [drivingRequest, chillRequest] = parsePlaylistRequestLines([
      "Mixed language driving rap",
      "Chill electronic"
    ]);
    const playlists = generateRequestedPlaylists({
      requests: [drivingRequest, chillRequest],
      tracks: [mixedDrivingRap, chillElectronic],
      classifications: [
        {
          fingerprint: mixedDrivingRap.fingerprint,
          language: "mixed",
          genre: "Hip-Hop/Rap",
          subgenres: ["rap"],
          moods: ["Driving"],
          energy: 0.62,
          confidence: 0.9,
          source: "openai",
          version: 1,
          metadataHash: "hash_drive"
        },
        {
          fingerprint: chillElectronic.fingerprint,
          language: "instrumental",
          genre: "Electronic",
          subgenres: [],
          moods: ["Chill", "Focus"],
          energy: 0.4,
          confidence: 0.9,
          source: "openai",
          version: 1,
          metadataHash: "hash_chill"
        }
      ]
    });

    expect(playlists).toEqual([
      expect.objectContaining({
        title: "Mixed Language Driving Rap",
        trackFingerprints: [mixedDrivingRap.fingerprint]
      }),
      expect.objectContaining({
        title: "Chill Electronic",
        trackFingerprints: [chillElectronic.fingerprint]
      })
    ]);
  });
});
