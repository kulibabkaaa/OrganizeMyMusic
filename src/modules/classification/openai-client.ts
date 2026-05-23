import OpenAI from "openai";
import { z } from "zod";

import { env, requireServerEnv } from "@/lib/env";
import type { GenreLabel, MoodLabel, NormalizedTrack, TrackClassification, TrackLanguage } from "@/types/domain";
import { buildMetadataHash } from "@/modules/classification/heuristics";
import {
  CLASSIFICATION_VERSION,
  supportedGenres,
  supportedLanguages,
  supportedMoods
} from "@/modules/classification/taxonomies";

const model = "gpt-4.1-mini";
const classificationBatchSchema = z.object({
  classifications: z.array(
    z.object({
      trackId: z.string().min(1),
      language: z.string().refine((value): value is TrackLanguage =>
        supportedLanguages.includes(value as TrackLanguage)
      ),
      genre: z.string().refine((value): value is GenreLabel =>
        supportedGenres.includes(value as GenreLabel)
      ),
      subgenres: z.array(z.string().min(1)).max(6),
      moods: z.array(
        z.string().refine((value): value is MoodLabel =>
          supportedMoods.includes(value as MoodLabel)
        )
      ).max(6),
      energy: z.number().min(0).max(1),
      confidence: z.number().min(0).max(1)
    })
  )
});

export type OpenAIClassificationPayload = ReturnType<typeof buildOpenAIClassificationPayload>;

type OpenAIResponsesClient = Pick<OpenAI, "responses">;

function getClient() {
  if (!env.OPENAI_API_KEY) {
    return null;
  }

  return new OpenAI({
    apiKey: requireServerEnv("OPENAI_API_KEY")
  });
}

export function buildOpenAIClassificationPayload(tracks: NormalizedTrack[]) {
  return {
    task: "Classify Apple Music library tracks into the fixed OrganizeMyMusic taxonomy.",
    taxonomy: {
      languages: supportedLanguages,
      genres: supportedGenres,
      moods: supportedMoods
    },
    tracks: tracks.map((track) => ({
      trackId: track.fingerprint,
      name: track.name,
      artistName: track.artistName,
      albumName: track.albumName,
      genreNames: track.genreNames,
      contentRating: track.contentRating
    }))
  };
}

export function parseOpenAIClassificationBatchOutput(
  output: string,
  tracks: NormalizedTrack[]
): TrackClassification[] | null {
  let parsedJson: unknown;

  try {
    parsedJson = JSON.parse(output);
  } catch {
    return null;
  }

  const parsed = classificationBatchSchema.safeParse(parsedJson);

  if (!parsed.success) {
    return null;
  }

  const tracksByFingerprint = new Map(tracks.map((track) => [track.fingerprint, track]));
  const seenTrackIds = new Set<string>();

  if (parsed.data.classifications.length !== tracks.length) {
    return null;
  }

  const classifications: TrackClassification[] = [];

  for (const classification of parsed.data.classifications) {
    const track = tracksByFingerprint.get(classification.trackId);

    if (!track || seenTrackIds.has(classification.trackId)) {
      return null;
    }

    seenTrackIds.add(classification.trackId);
    classifications.push({
      fingerprint: track.fingerprint,
      language: classification.language,
      genre: classification.genre,
      subgenres: classification.subgenres,
      moods: classification.moods,
      energy: classification.energy,
      confidence: classification.confidence,
      source: "openai",
      version: CLASSIFICATION_VERSION,
      metadataHash: buildMetadataHash(track)
    });
  }

  return classifications;
}

export async function classifyAmbiguousTracksWithOpenAI(
  tracks: NormalizedTrack[],
  client: OpenAIResponsesClient | null = getClient()
): Promise<TrackClassification[] | null> {
  if (tracks.length === 0) {
    return [];
  }

  if (!client) {
    return null;
  }

  const response = await client.responses.create({
    model,
    input: [
      {
        role: "system",
        content:
          "You classify music tracks into a fixed taxonomy. Return only schema-valid JSON."
      },
      {
        role: "user",
        content: JSON.stringify(buildOpenAIClassificationPayload(tracks))
      }
    ],
    text: {
      format: {
        type: "json_schema",
        name: "track_classification_batch",
        strict: true,
        schema: {
          type: "object",
          properties: {
            classifications: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  trackId: {
                    type: "string"
                  },
                  language: {
                    type: "string",
                    enum: supportedLanguages
                  },
                  genre: {
                    type: "string",
                    enum: supportedGenres
                  },
                  subgenres: {
                    type: "array",
                    items: {
                      type: "string"
                    }
                  },
                  moods: {
                    type: "array",
                    items: {
                      type: "string",
                      enum: supportedMoods
                    }
                  },
                  energy: {
                    type: "number",
                    minimum: 0,
                    maximum: 1
                  },
                  confidence: {
                    type: "number",
                    minimum: 0,
                    maximum: 1
                  }
                },
                required: [
                  "trackId",
                  "language",
                  "genre",
                  "subgenres",
                  "moods",
                  "energy",
                  "confidence"
                ],
                additionalProperties: false
              }
            }
          },
          required: ["classifications"],
          additionalProperties: false
        }
      }
    }
  });

  const output = response.output_text;

  if (!output) {
    return null;
  }

  return parseOpenAIClassificationBatchOutput(output, tracks);
}
