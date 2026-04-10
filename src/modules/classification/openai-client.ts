import OpenAI from "openai";

import { env, requireServerEnv } from "@/lib/env";
import type { MoodLabel, NormalizedTrack, TrackClassification, TrackLanguage } from "@/types/domain";
import { buildMetadataHash } from "@/modules/classification/heuristics";
import { CLASSIFICATION_VERSION, supportedMoods } from "@/modules/classification/taxonomies";

const model = "gpt-4.1-mini";

function getClient() {
  if (!env.OPENAI_API_KEY) {
    return null;
  }

  return new OpenAI({
    apiKey: requireServerEnv("OPENAI_API_KEY")
  });
}

export async function classifyAmbiguousTrackWithOpenAI(
  track: NormalizedTrack
): Promise<TrackClassification | null> {
  const client = getClient();

  if (!client) {
    return null;
  }

  const response = await client.responses.create({
    model,
    input: [
      {
        role: "system",
        content:
          "You classify music tracks into a fixed taxonomy. Return concise JSON only."
      },
      {
        role: "user",
        content: JSON.stringify({
          task: "Classify this Apple Music library track",
          taxonomy: {
            language: ["english", "spanish", "french", "german", "japanese", "korean", "portuguese", "instrumental", "unknown"],
            mood: supportedMoods
          },
          track
        })
      }
    ],
    text: {
      format: {
        type: "json_schema",
        name: "track_classification",
        schema: {
          type: "object",
          properties: {
            language: {
              type: "string"
            },
            moods: {
              type: "array",
              items: {
                type: "string"
              }
            },
            confidence: {
              type: "number"
            }
          },
          required: ["language", "moods", "confidence"],
          additionalProperties: false
        }
      }
    }
  });

  const output = response.output_text;

  if (!output) {
    return null;
  }

  const parsed = JSON.parse(output) as {
    language: TrackLanguage;
    moods: MoodLabel[];
    confidence: number;
  };

  return {
    fingerprint: track.fingerprint,
    language: parsed.language,
    genre: "Other",
    moods: parsed.moods,
    confidence: parsed.confidence,
    source: "openai",
    version: CLASSIFICATION_VERSION,
    metadataHash: buildMetadataHash(track)
  };
}

