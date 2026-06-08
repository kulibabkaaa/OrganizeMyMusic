import type { SupabaseClient } from "@supabase/supabase-js";

import type { JobEvent, PaymentStatus, SortRunState } from "@/types/domain";

export interface AdminSortRunSummary {
  id: string;
  userId: string;
  userEmail: string | null;
  state: SortRunState;
  paymentStatus: PaymentStatus;
  playlistCount: number;
  createdAt: string;
  updatedAt: string;
}

export type AdminSortRunRow = {
  id: string;
  user_id: string;
  state: SortRunState;
  payment_status: PaymentStatus;
  created_at: string;
  updated_at: string;
};

export type AdminProfileRow = {
  id: string;
  email: string | null;
};

type SortPlaylistRow = {
  sort_run_id: string;
};

export type AdminJobEventRow = {
  id: string;
  sort_run_id: string | null;
  stage: string;
  level: JobEvent["level"];
  message: string;
  created_at: string;
};

export async function listAdminSortRuns(supabase: SupabaseClient, limit = 50) {
  const { data: sortRuns, error: sortRunsError } = await supabase
    .from("sort_runs")
    .select("id,user_id,state,payment_status,created_at,updated_at")
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (sortRunsError || !sortRuns) {
    throw new Error(sortRunsError?.message ?? "Unable to load admin Sort runs.");
  }

  const rows = sortRuns as AdminSortRunRow[];

  return mapAdminSortRuns(rows, {
    profiles: await listProfilesForSortRuns(supabase, rows),
    playlistCounts: await countSortPlaylists(
      supabase,
      rows.map((run) => run.id)
    )
  });
}

export async function getAdminSortRun(supabase: SupabaseClient, sortRunId: string) {
  const { data: sortRun, error: sortRunError } = await supabase
    .from("sort_runs")
    .select("id,user_id,state,payment_status,created_at,updated_at")
    .eq("id", sortRunId)
    .maybeSingle();

  if (sortRunError) {
    throw new Error(sortRunError.message);
  }

  if (!sortRun) {
    return {
      run: null,
      events: []
    };
  }

  const [profiles, playlistCounts, events] = await Promise.all([
    listProfilesForSortRuns(supabase, [sortRun as AdminSortRunRow]),
    countSortPlaylists(supabase, [sortRunId]),
    listJobEventsForSortRun(supabase, sortRunId)
  ]);

  return {
    run: mapAdminSortRuns([sortRun as AdminSortRunRow], { profiles, playlistCounts })[0] ?? null,
    events
  };
}

export function mapAdminSortRuns(
  sortRuns: AdminSortRunRow[],
  input: { profiles: AdminProfileRow[]; playlistCounts: Map<string, number> }
): AdminSortRunSummary[] {
  const emailByUserId = new Map(input.profiles.map((profile) => [profile.id, profile.email]));

  return sortRuns.map((run) => ({
    id: run.id,
    userId: run.user_id,
    userEmail: emailByUserId.get(run.user_id) ?? null,
    state: run.state,
    paymentStatus: run.payment_status,
    playlistCount: input.playlistCounts.get(run.id) ?? 0,
    createdAt: run.created_at,
    updatedAt: run.updated_at
  }));
}

export function mapAdminJobEvent(row: AdminJobEventRow): JobEvent {
  return {
    id: row.id,
    sortRunId: row.sort_run_id ?? "",
    stage: row.stage,
    level: row.level,
    message: row.message,
    createdAt: row.created_at
  };
}

async function listProfilesForSortRuns(supabase: SupabaseClient, sortRuns: AdminSortRunRow[]) {
  const userIds = Array.from(new Set(sortRuns.map((run) => run.user_id)));

  if (userIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase.from("profiles").select("id,email").in("id", userIds);

  if (error || !data) {
    throw new Error(error?.message ?? "Unable to load Sort run profile owners.");
  }

  return data as AdminProfileRow[];
}

async function countSortPlaylists(supabase: SupabaseClient, sortRunIds: string[]) {
  const counts = new Map<string, number>();

  if (sortRunIds.length === 0) {
    return counts;
  }

  const { data, error } = await supabase
    .from("sort_playlists")
    .select("sort_run_id")
    .in("sort_run_id", sortRunIds);

  if (error || !data) {
    throw new Error(error?.message ?? "Unable to load Sort playlist counts.");
  }

  for (const playlist of data as SortPlaylistRow[]) {
    counts.set(playlist.sort_run_id, (counts.get(playlist.sort_run_id) ?? 0) + 1);
  }

  return counts;
}

async function listJobEventsForSortRun(supabase: SupabaseClient, sortRunId: string) {
  const { data, error } = await supabase
    .from("job_events")
    .select("id,sort_run_id,stage,level,message,created_at")
    .eq("sort_run_id", sortRunId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error || !data) {
    throw new Error(error?.message ?? "Unable to load Sort run job events.");
  }

  return (data as AdminJobEventRow[]).map(mapAdminJobEvent);
}
