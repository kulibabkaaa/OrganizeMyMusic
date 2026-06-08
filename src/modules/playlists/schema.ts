import { z } from "zod";

import type { PlaylistStatus, SortSourceProvider } from "@/types/domain";

const playlistStatuses = ["draft", "active", "archived"] as const satisfies readonly PlaylistStatus[];
const sourceProviders = ["apple_music"] as const satisfies readonly SortSourceProvider[];

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
const optionalIsoDate = z.string().datetime().optional().nullable();

export const playlistCreateSchema = z.object({
  name: trimmedText(120),
  description: nullableText(1000),
  sourceProvider: z.enum(sourceProviders).default("apple_music"),
  createdFromSortRunId: z.string().uuid().optional().nullable(),
  latestLibrarySyncId: z.string().uuid().optional().nullable()
});

export const playlistUpdateSchema = z.object({
  name: trimmedText(120).optional(),
  description: optionalNullableText(1000),
  status: z.enum(playlistStatuses).optional(),
  applePlaylistId: optionalNullableText(200),
  latestLibrarySyncId: z.string().uuid().optional().nullable(),
  lastGeneratedAt: optionalIsoDate,
  lastExportedAt: optionalIsoDate
});

export type PlaylistCreateInput = z.infer<typeof playlistCreateSchema>;
export type PlaylistUpdateInput = z.infer<typeof playlistUpdateSchema>;
