import { createHash } from "crypto";

export function makeTrackFingerprint(input: {
  normalizedName: string;
  normalizedArtist: string;
  normalizedAlbum?: string;
}) {
  const base = [input.normalizedName, input.normalizedArtist, input.normalizedAlbum ?? ""].join("::");
  return createHash("sha1").update(base).digest("hex");
}

