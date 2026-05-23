import type { NormalizedTrack, TrackClassification } from "@/types/domain";

import { classificationCache } from "@/modules/classification/cache";
import {
  buildMetadataHash,
  heuristicClassify,
  inferLanguage,
  inferMoods
} from "@/modules/classification/heuristics";
import { classifyAmbiguousTracksWithOpenAI } from "@/modules/classification/openai-client";

function isAmbiguous(track: NormalizedTrack) {
  return inferLanguage(track) === "english" && inferMoods(track).length === 1;
}

export async function classifyTracks(
  tracks: NormalizedTrack[],
  options: {
    classifyAmbiguousTracksWithOpenAI?: (
      tracksToClassify: NormalizedTrack[]
    ) => Promise<TrackClassification[] | null>;
  } = {}
) {
  const results = new Map<string, TrackClassification>();
  const uncachedTracks: NormalizedTrack[] = [];
  const classifyWithOpenAI =
    options.classifyAmbiguousTracksWithOpenAI ?? classifyAmbiguousTracksWithOpenAI;

  for (const track of tracks) {
    const metadataHash = buildMetadataHash(track);
    const cacheKey = `${track.fingerprint}:${metadataHash}`;
    const cached = classificationCache.get(cacheKey);

    if (cached) {
      results.set(track.fingerprint, cached);
      continue;
    }

    const classification = heuristicClassify(track);
    results.set(track.fingerprint, classification);
    uncachedTracks.push(track);
  }

  const ambiguousTracks = uncachedTracks.filter(isAmbiguous);

  if (ambiguousTracks.length > 0) {
    const aiClassifications = await classifyWithOpenAI(ambiguousTracks);

    if (aiClassifications) {
      for (const classification of aiClassifications) {
        results.set(classification.fingerprint, classification);
      }
    }
  }

  for (const track of uncachedTracks) {
    const metadataHash = buildMetadataHash(track);
    const cacheKey = `${track.fingerprint}:${metadataHash}`;
    const classification = results.get(track.fingerprint);

    if (classification) {
      classificationCache.set(cacheKey, classification);
    }
  }

  return tracks.flatMap((track) => {
    const classification = results.get(track.fingerprint);

    return classification ? [classification] : [];
  });
}
