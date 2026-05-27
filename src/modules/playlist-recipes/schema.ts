import { z } from "zod";

import type {
  PlaylistRecipeDuplicatePolicy,
  PlaylistRecipeTagCategory
} from "@/types/domain";

const playlistRecipeTagCategories = [
  "mood",
  "genre",
  "language",
  "era",
  "region",
  "energy",
  "activity",
  "artist_style",
  "custom"
] as const satisfies readonly PlaylistRecipeTagCategory[];

const duplicatePolicies = [
  "avoid_duplicates",
  "allow_duplicates"
] as const satisfies readonly PlaylistRecipeDuplicatePolicy[];

const trimmedText = (max: number) => z.string().trim().min(1).max(max);
const nullableText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((value) => (value ? value : null));
const optionalNullableText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((value) => {
      if (value === undefined) {
        return undefined;
      }

      return value ? value : null;
    });
const optionalTagNote = z
  .string()
  .trim()
  .max(500)
  .optional()
  .transform((value) => (value ? value : undefined));
const targetTrackCount = z.number().int().min(1).max(500).optional().nullable();

export const playlistRecipeTagSchema = z.object({
  id: trimmedText(120),
  category: z.enum(playlistRecipeTagCategories),
  value: trimmedText(120),
  note: optionalTagNote
});

const targetRangeValidation = {
  message: "targetTrackMin must be less than or equal to targetTrackMax",
  path: ["targetTrackMax"]
};

export const playlistRecipeCreateSchema = z
  .object({
    sortRunId: z.string().uuid(),
    position: z.number().int().min(0),
    name: trimmedText(120),
    playlistNote: nullableText(1000),
    targetTrackMin: targetTrackCount,
    targetTrackMax: targetTrackCount,
    duplicatePolicy: z.enum(duplicatePolicies).default("avoid_duplicates"),
    allowExplicit: z.boolean().default(true),
    includeLibraryOnly: z.boolean().default(true),
    tags: z.array(playlistRecipeTagSchema).max(30).default([])
  })
  .refine(
    (value) =>
      value.targetTrackMin == null ||
      value.targetTrackMax == null ||
      value.targetTrackMin <= value.targetTrackMax,
    targetRangeValidation
  );

export const playlistRecipeUpdateSchema = z
  .object({
    position: z.number().int().min(0).optional(),
    name: trimmedText(120).optional(),
    playlistNote: optionalNullableText(1000),
    targetTrackMin: targetTrackCount,
    targetTrackMax: targetTrackCount,
    duplicatePolicy: z.enum(duplicatePolicies).optional(),
    allowExplicit: z.boolean().optional(),
    includeLibraryOnly: z.boolean().optional(),
    tags: z.array(playlistRecipeTagSchema).max(30).optional()
  })
  .refine(
    (value) =>
      value.targetTrackMin == null ||
      value.targetTrackMax == null ||
      value.targetTrackMin <= value.targetTrackMax,
    targetRangeValidation
  );

export type PlaylistRecipeCreateInput = z.infer<typeof playlistRecipeCreateSchema>;
export type PlaylistRecipeUpdateInput = z.infer<typeof playlistRecipeUpdateSchema>;
