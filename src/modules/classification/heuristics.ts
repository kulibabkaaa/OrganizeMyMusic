import { createHash } from "crypto";

import type { GenreLabel, MoodLabel, NormalizedTrack, TrackClassification, TrackLanguage } from "@/types/domain";

import { CLASSIFICATION_VERSION } from "@/modules/classification/taxonomies";

const genreMap: Record<string, GenreLabel> = {
  pop: "Pop",
  hiphop: "Hip-Hop/Rap",
  "hip-hop": "Hip-Hop/Rap",
  rap: "Hip-Hop/Rap",
  rock: "Rock",
  alternative: "Indie/Alternative",
  indie: "Indie/Alternative",
  electronic: "Electronic",
  dance: "Electronic",
  house: "Electronic",
  soul: "R&B/Soul",
  "r&b": "R&B/Soul",
  latin: "Latin",
  country: "Country",
  jazz: "Jazz",
  classical: "Classical",
  metal: "Metal",
  folk: "Folk/Acoustic",
  acoustic: "Folk/Acoustic",
  kpop: "K-Pop",
  "k-pop": "K-Pop",
  jpop: "J-Pop",
  "j-pop": "J-Pop",
  gospel: "Gospel/Christian",
  christian: "Gospel/Christian",
  reggae: "Reggae",
  soundtrack: "Soundtrack"
};

const upbeatTokens = ["party", "dance", "club", "run", "night", "summer"];
const calmTokens = ["sleep", "calm", "rain", "blue", "moon", "slow"];
const sadTokens = ["cry", "alone", "broken", "goodbye", "tears"];
const romanticTokens = ["love", "heart", "kiss", "forever", "darling"];
const instrumentalGenreTokens = ["instrumental", "classical"];

export function inferLanguage(track: NormalizedTrack): TrackLanguage {
  const text = `${track.name} ${track.artistName}`;
  const genres = track.genreNames.join(" ").toLowerCase();
  const hasLatin = /[a-z]/i.test(text);
  const hasCyrillic = /[\u0400-\u04ff]/.test(text);

  if (instrumentalGenreTokens.some((token) => genres.includes(token))) {
    return "instrumental";
  }

  if (/[ぁ-んァ-ン]/.test(text)) {
    return "japanese";
  }

  if (/[가-힣]/.test(text)) {
    return "korean";
  }

  if (hasLatin && hasCyrillic) {
    return "mixed";
  }

  if (/[іїєґІЇЄҐ]/.test(text)) {
    return "ukrainian";
  }

  if (hasCyrillic) {
    return "russian";
  }

  if (/[ąćęłńóśźż]/i.test(text)) {
    return "polish";
  }

  if (/[áéíóúñ]/i.test(text)) {
    return "spanish";
  }

  if (/[ãõç]/i.test(text)) {
    return "portuguese";
  }

  if (!hasLatin) {
    return "unknown";
  }

  return "english";
}

export function inferGenre(track: NormalizedTrack): GenreLabel {
  const source = track.genreNames.join(" ").toLowerCase();

  for (const [token, genre] of Object.entries(genreMap)) {
    if (source.includes(token)) {
      return genre;
    }
  }

  return "Other";
}

export function inferMoods(track: NormalizedTrack): MoodLabel[] {
  const text = `${track.name} ${track.artistName} ${track.albumName ?? ""}`.toLowerCase();
  const moods = new Set<MoodLabel>();

  if (upbeatTokens.some((token) => text.includes(token))) {
    moods.add("Hype");
    moods.add("Workout");
  }

  if (calmTokens.some((token) => text.includes(token))) {
    moods.add("Chill");
    moods.add("Focus");
  }

  if (sadTokens.some((token) => text.includes(token))) {
    moods.add("Sad");
    moods.add("Melancholy");
  }

  if (romanticTokens.some((token) => text.includes(token))) {
    moods.add("Romantic");
    moods.add("Feel-Good");
  }

  if (moods.size === 0) {
    moods.add("Feel-Good");
  }

  return Array.from(moods);
}

export function buildMetadataHash(track: NormalizedTrack) {
  return createHash("sha1")
    .update(
      JSON.stringify({
        name: track.name,
        artistName: track.artistName,
        albumName: track.albumName,
        genreNames: track.genreNames
      })
    )
    .digest("hex");
}

export function heuristicClassify(track: NormalizedTrack): TrackClassification {
  const genre = inferGenre(track);
  const hasMetadataGenre = genre !== "Other";

  return {
    fingerprint: track.fingerprint,
    language: inferLanguage(track),
    genre,
    subgenres: [],
    moods: inferMoods(track),
    energy: null,
    confidence: hasMetadataGenre ? 0.86 : 0.72,
    source: hasMetadataGenre ? "metadata" : "heuristic",
    version: CLASSIFICATION_VERSION,
    metadataHash: buildMetadataHash(track)
  };
}
