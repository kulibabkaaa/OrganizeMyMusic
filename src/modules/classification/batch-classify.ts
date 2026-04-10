import type { NormalizedTrack, TrackClassification } from "@/types/domain";

import { classificationCache } from "@/modules/classification/cache";
import {
  buildMetadataHash,
  heuristicClassify,
  inferLanguage,
  inferMoods
} from "@/modules/classification/heuristics";
import { classifyAmbiguousTrackWithOpenAI } from "@/modules/classification/openai-client";

function isAmbiguous(track: NormalizedTrack) {
  return inferLanguage(track) === "english" && inferMoods(track).length === 1;
}

export async function classifyTracks(tracks: NormalizedTrack[]) {
  const results: TrackClassification[] = [];

  for (const track of tracks) {
    const metadataHash = buildMetadataHash(track);
    const cacheKey = `${track.fingerprint}:${metadataHash}`;
    const cached = classificationCache.get(cacheKey);

    if (cached) {
      results.push(cached);
      continue;
    }

    let classification = heuristicClassify(track);

    if (isAmbiguous(track)) {
      const aiClassification = await classifyAmbiguousTrackWithOpenAI(track);
      if (aiClassification) {
        classification = {
          ...classification,
          language: aiClassification.language,
          moods: aiClassification.moods,
          confidence: aiClassification.confidence,
          source: aiClassification.source
        };
      }
    }

    classificationCache.set(cacheKey, classification);
    results.push(classification);
  }

  return results;
}

