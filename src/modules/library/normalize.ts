import type { NormalizedTrack, RawAppleTrack } from "@/types/domain";

import { makeTrackFingerprint } from "@/modules/library/fingerprint";

const featuringPattern = /\((feat\.|featuring|with).+?\)|\[(feat\.|featuring|with).+?\]/gi;
const versionPattern = /\b(remaster(ed)?|live|mono|stereo|deluxe|bonus track|version)\b/gi;

export function sanitizeText(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, " ")
    .replace(featuringPattern, " ")
    .replace(versionPattern, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function normalizeTrack(raw: RawAppleTrack): NormalizedTrack {
  const normalizedName = sanitizeText(raw.name);
  const normalizedArtist = sanitizeText(raw.artistName);
  const normalizedAlbum = raw.albumName ? sanitizeText(raw.albumName) : undefined;

  return {
    id: raw.id,
    appleSongId: raw.id,
    name: raw.name,
    artistName: raw.artistName,
    albumName: raw.albumName,
    normalizedName,
    normalizedArtist,
    normalizedAlbum,
    fingerprint: makeTrackFingerprint({
      normalizedName,
      normalizedArtist,
      normalizedAlbum
    }),
    durationInMillis: raw.durationInMillis,
    genreNames: raw.genreNames ?? [],
    contentRating: raw.contentRating,
    isrc: raw.isrc
  };
}

