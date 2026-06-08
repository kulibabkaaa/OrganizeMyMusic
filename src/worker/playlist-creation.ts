import type PgBoss from "pg-boss";

import { createSupabaseServiceRoleClient } from "@/lib/supabase/admin";
import {
  createSupabasePlaylistCreationStore,
  handlePlaylistCreationJob
} from "@/modules/apple-music/playlist-creation";
import {
  PLAYLIST_CREATION_JOB_NAME,
  type PlaylistCreationJobData
} from "@/modules/sorts/playlist-creation-queue";
import {
  createSupabasePlaylistGenerationExportStore,
  exportPlaylistGenerationToAppleMusic,
  PLAYLIST_GENERATION_EXPORT_JOB_NAME,
  type PlaylistGenerationExportJobData
} from "@/modules/playlists/generation-export";

export async function registerPlaylistCreationWorker(boss: PgBoss) {
  await boss.createQueue(PLAYLIST_CREATION_JOB_NAME);
  await boss.createQueue(PLAYLIST_GENERATION_EXPORT_JOB_NAME);

  await boss.work<PlaylistCreationJobData>(PLAYLIST_CREATION_JOB_NAME, async (jobs) => {
    const supabase = createSupabaseServiceRoleClient();

    if (!supabase) {
      throw new Error("Supabase service role client is required for playlist creation jobs.");
    }

    const store = createSupabasePlaylistCreationStore(supabase);

    await Promise.all(
      jobs.map((job) =>
        handlePlaylistCreationJob({
          store,
          data: job.data
        })
      )
    );
  });

  await boss.work<PlaylistGenerationExportJobData>(
    PLAYLIST_GENERATION_EXPORT_JOB_NAME,
    async (jobs) => {
      const supabase = createSupabaseServiceRoleClient();

      if (!supabase) {
        throw new Error("Supabase service role client is required for playlist export jobs.");
      }

      const store = createSupabasePlaylistGenerationExportStore(supabase);

      await Promise.all(
        jobs.map((job) =>
          exportPlaylistGenerationToAppleMusic({
            store,
            userId: job.data.userId,
            playlistId: job.data.playlistId,
            generationId: job.data.generationId,
            exportId: job.data.exportId
          })
        )
      );
    }
  );
}
