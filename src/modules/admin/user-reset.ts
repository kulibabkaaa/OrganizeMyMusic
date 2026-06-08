import type PgBoss from "pg-boss";
import type { SupabaseClient } from "@supabase/supabase-js";

export const USER_RESET_CONFIRMATION_PREFIX = "RESET ";

export interface UserResetProfile {
  id: string;
  email: string | null;
  isAdmin: boolean;
}

export interface UserDataResetCounts {
  profileCount: number;
  appleMusicConnectionCount: number;
  librarySyncCount: number;
  rawLibraryTrackCount: number;
  trackOwnershipCount: number;
  sortRunCount: number;
  playlistRequestCount: number;
  playlistRecipeCount: number;
  sortPlaylistCount: number;
  sortPlaylistTrackCount: number;
  paymentCount: number;
  jobEventCount: number;
  pgBossJobCount: number | null;
}

export interface UserResetStore {
  getProfileById(userId: string): Promise<UserResetProfile | null>;
  getProfileByEmail(email: string): Promise<UserResetProfile | null>;
  countUserData(userId: string): Promise<Omit<UserDataResetCounts, "pgBossJobCount">>;
  deleteAuthUser(userId: string): Promise<void>;
}

export interface PgBossUserJobStore {
  countJobsForUser(userId: string): Promise<number>;
  deleteJobsForUser(userId: string): Promise<number>;
}

export type UserResetPreviewResult =
  | { status: "invalid_email" }
  | { status: "forbidden" }
  | { status: "target_not_found"; email: string }
  | {
      status: "ready" | "pg_boss_unavailable" | "self_reset_blocked";
      target: UserResetProfile;
      counts: UserDataResetCounts;
      confirmationText: string;
    };

export type UserResetExecutionResult =
  | Exclude<UserResetPreviewResult, { status: "ready" }>
  | {
      status: "confirmation_required";
      target: UserResetProfile;
      counts: UserDataResetCounts;
      confirmationText: string;
    }
  | {
      status: "deleted";
      targetEmail: string;
      counts: UserDataResetCounts;
      deletedPgBossJobCount: number;
    };

export async function previewUserDataReset(input: {
  store: UserResetStore;
  pgBossJobs?: PgBossUserJobStore | null;
  requesterUserId: string;
  email: string;
}): Promise<UserResetPreviewResult> {
  const email = normalizeResetEmail(input.email);

  if (!email) {
    return { status: "invalid_email" };
  }

  const requester = await input.store.getProfileById(input.requesterUserId);

  if (!requester?.isAdmin) {
    return { status: "forbidden" };
  }

  const target = await input.store.getProfileByEmail(email);

  if (!target) {
    return { status: "target_not_found", email };
  }

  const appCounts = await input.store.countUserData(target.id);
  const pgBossJobCount = input.pgBossJobs
    ? await input.pgBossJobs.countJobsForUser(target.id)
    : null;
  const counts = {
    ...appCounts,
    pgBossJobCount
  };

  if (target.id === input.requesterUserId) {
    return {
      status: "self_reset_blocked",
      target,
      counts,
      confirmationText: getUserResetConfirmationText(email)
    };
  }

  return {
    status: pgBossJobCount === null ? "pg_boss_unavailable" : "ready",
    target,
    counts,
    confirmationText: getUserResetConfirmationText(email)
  };
}

export async function executeUserDataReset(input: {
  store: UserResetStore;
  pgBossJobs?: PgBossUserJobStore | null;
  requesterUserId: string;
  email: string;
  confirmation: string;
}): Promise<UserResetExecutionResult> {
  const preview = await previewUserDataReset(input);

  if (preview.status !== "ready") {
    return preview;
  }

  if (input.confirmation.trim() !== preview.confirmationText) {
    return {
      status: "confirmation_required",
      target: preview.target,
      counts: preview.counts,
      confirmationText: preview.confirmationText
    };
  }

  if (!input.pgBossJobs) {
    return {
      ...preview,
      status: "pg_boss_unavailable"
    };
  }

  const deletedPgBossJobCount = await input.pgBossJobs.deleteJobsForUser(preview.target.id);

  await input.store.deleteAuthUser(preview.target.id);

  return {
    status: "deleted",
    targetEmail: preview.target.email ?? normalizeResetEmail(input.email) ?? input.email,
    counts: preview.counts,
    deletedPgBossJobCount
  };
}

export function getUserResetConfirmationText(email: string) {
  return `${USER_RESET_CONFIRMATION_PREFIX}${normalizeResetEmail(email) ?? email.trim()}`;
}

export function getUserDataResetTotalCount(counts: UserDataResetCounts) {
  return (
    counts.profileCount +
    counts.appleMusicConnectionCount +
    counts.librarySyncCount +
    counts.rawLibraryTrackCount +
    counts.trackOwnershipCount +
    counts.sortRunCount +
    counts.playlistRequestCount +
    counts.playlistRecipeCount +
    counts.sortPlaylistCount +
    counts.sortPlaylistTrackCount +
    counts.paymentCount +
    counts.jobEventCount +
    (counts.pgBossJobCount ?? 0)
  );
}

export function createSupabaseUserResetStore(supabase: SupabaseClient): UserResetStore {
  return {
    async getProfileById(userId) {
      const { data, error } = await supabase
        .from("profiles")
        .select("id,email,is_admin")
        .eq("id", userId)
        .maybeSingle();

      if (error) {
        throw new Error(error.message);
      }

      return data ? mapResetProfile(data as ProfileRow) : null;
    },

    async getProfileByEmail(email) {
      const { data, error } = await supabase
        .from("profiles")
        .select("id,email,is_admin")
        .eq("email", email)
        .maybeSingle();

      if (error) {
        throw new Error(error.message);
      }

      return data ? mapResetProfile(data as ProfileRow) : null;
    },

    async countUserData(userId) {
      const librarySyncIds = await listIdsByEq(supabase, "library_syncs", "user_id", userId);
      const sortRunIds = await listIdsByEq(supabase, "sort_runs", "user_id", userId);
      const sortPlaylistIds = await listIdsByIn(
        supabase,
        "sort_playlists",
        "sort_run_id",
        sortRunIds
      );
      const sortJobEventIds = await listIdsByIn(supabase, "job_events", "sort_run_id", sortRunIds);
      const syncJobEventIds = await listIdsByIn(
        supabase,
        "job_events",
        "library_sync_id",
        librarySyncIds
      );

      return {
        profileCount: await countByEq(supabase, "profiles", "id", userId),
        appleMusicConnectionCount: await countByEq(
          supabase,
          "apple_music_connections",
          "user_id",
          userId
        ),
        librarySyncCount: librarySyncIds.length,
        rawLibraryTrackCount: await countByIn(
          supabase,
          "library_tracks_raw",
          "sync_id",
          librarySyncIds
        ),
        trackOwnershipCount: await countByEq(supabase, "track_ownership", "user_id", userId),
        sortRunCount: sortRunIds.length,
        playlistRequestCount: await countByEq(supabase, "playlist_requests", "user_id", userId),
        playlistRecipeCount: await countByEq(supabase, "playlist_recipes", "user_id", userId),
        sortPlaylistCount: sortPlaylistIds.length,
        sortPlaylistTrackCount: await countByIn(
          supabase,
          "sort_playlist_tracks",
          "sort_playlist_id",
          sortPlaylistIds
        ),
        paymentCount: await countByIn(supabase, "payments", "sort_run_id", sortRunIds),
        jobEventCount: new Set([...sortJobEventIds, ...syncJobEventIds]).size
      };
    },

    async deleteAuthUser(userId) {
      const { error } = await supabase.auth.admin.deleteUser(userId);

      if (error) {
        throw new Error(error.message);
      }
    }
  };
}

export function createPgBossUserJobStore(boss: PgBoss): PgBossUserJobStore {
  const db = (
    boss as unknown as {
      getDb(): { executeSql(query: string, values?: unknown[]): Promise<{ rows: unknown[] }> };
    }
  ).getDb();

  return {
    async countJobsForUser(userId) {
      const result = await db.executeSql(countPgBossJobsForUserSql, [userId]);
      const row = result.rows[0] as { count?: string | number } | undefined;

      return Number(row?.count ?? 0);
    },

    async deleteJobsForUser(userId) {
      const result = await db.executeSql(deletePgBossJobsForUserSql, [userId]);
      const row = result.rows[0] as { count?: string | number } | undefined;

      return Number(row?.count ?? 0);
    }
  };
}

const countPgBossJobsForUserSql = `
  select count(*)::int as count
  from pgboss.job
  where data->>'userId' = $1
    or data->>'user_id' = $1
`;

const deletePgBossJobsForUserSql = `
  with deleted_jobs as (
    delete from pgboss.job
    where data->>'userId' = $1
      or data->>'user_id' = $1
    returning 1
  )
  select count(*)::int as count from deleted_jobs
`;

type ProfileRow = {
  id: string;
  email: string | null;
  is_admin: boolean;
};

type IdRow = {
  id: string;
};

function normalizeResetEmail(email: string) {
  const normalized = email.trim().toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    return null;
  }

  return normalized;
}

function mapResetProfile(row: ProfileRow): UserResetProfile {
  return {
    id: row.id,
    email: row.email,
    isAdmin: row.is_admin
  };
}

async function countByEq(
  supabase: SupabaseClient,
  table: string,
  column: string,
  value: string
) {
  const { count, error } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq(column, value);

  if (error) {
    throw new Error(error.message);
  }

  return count ?? 0;
}

async function countByIn(
  supabase: SupabaseClient,
  table: string,
  column: string,
  values: string[]
) {
  if (values.length === 0) {
    return 0;
  }

  const { count, error } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true })
    .in(column, values);

  if (error) {
    throw new Error(error.message);
  }

  return count ?? 0;
}

async function listIdsByEq(
  supabase: SupabaseClient,
  table: string,
  column: string,
  value: string
) {
  const { data, error } = await supabase.from(table).select("id").eq(column, value);

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as IdRow[]).map((row) => row.id);
}

async function listIdsByIn(
  supabase: SupabaseClient,
  table: string,
  column: string,
  values: string[]
) {
  if (values.length === 0) {
    return [];
  }

  const { data, error } = await supabase.from(table).select("id").in(column, values);

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as IdRow[]).map((row) => row.id);
}
