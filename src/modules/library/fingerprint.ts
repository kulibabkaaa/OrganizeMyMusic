import { createHash } from "crypto";

export function makeTrackFingerprint(input: {
  normalizedName: string;
  normalizedArtist: string;
  durationInMillis?: number;
}) {
  const durationBucket = input.durationInMillis
    ? String(Math.floor(input.durationInMillis / 10000))
    : "";
  const base = [input.normalizedName, input.normalizedArtist, durationBucket].join("::");
  return createHash("sha1").update(base).digest("hex");
}
