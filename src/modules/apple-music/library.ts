import { fetchAppleLibrarySongs } from "@/modules/apple-music/client";
import { ingestLibrary } from "@/modules/library/ingest";
import type { AppleApiCredentials } from "@/modules/apple-music/types";

export async function syncAppleLibrary(credentials?: AppleApiCredentials) {
  const rawTracks = await fetchAppleLibrarySongs(credentials);
  return ingestLibrary(rawTracks);
}
