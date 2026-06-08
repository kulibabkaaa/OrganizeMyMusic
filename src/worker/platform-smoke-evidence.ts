import { Client, type QueryResultRow } from "pg";

import { loadRuntimeEnv } from "@/lib/load-runtime-env";

loadRuntimeEnv();

type CheckStatus = "pass" | "warn" | "fail";

interface CheckResult {
  name: string;
  status: CheckStatus;
  detail: string;
}

interface ProfileRow {
  id: string;
  email: string | null;
}

interface ConnectionSummaryRow {
  total: number;
  connected_count: number;
  latest_updated_at: string | null;
}

interface LibrarySyncRow {
  id: string;
  status: string;
  raw_track_count: number;
  normalized_track_count: number;
  duplicate_count: number;
  created_at: string;
  updated_at: string;
}

interface LibrarySyncSummaryRow {
  completed_count: number;
}

interface CountRow {
  count: number;
}

interface PlaylistSummaryRow {
  total: number;
  active_count: number;
  sort_created_count: number;
  standalone_count: number;
  exported_count: number;
  processed_new_music_count: number;
}

interface RecipeSummaryRow {
  playlist_recipe_count: number;
  sort_created_playlist_recipe_count: number;
  standalone_playlist_recipe_count: number;
  sort_recipe_count: number;
}

interface GenerationSummaryRow {
  total: number;
  ready_for_review_count: number;
  reviewed_count: number;
  exported_count: number;
  sort_generation_count: number;
  standalone_generation_count: number;
  new_music_generation_count: number;
}

interface GenerationTrackSummaryRow {
  total: number;
  reviewed_total: number;
  kept_count: number;
  removed_count: number;
}

interface ExportSummaryRow {
  total: number;
  queued_count: number;
  exported_count: number;
  failed_count: number;
  apple_playlist_count: number;
  sort_exported_count: number;
  standalone_exported_count: number;
  new_music_exported_count: number;
  selected_track_count: number;
}

interface SortSummaryRow {
  total: number;
  completed_count: number;
  failed_count: number;
}

interface DuplicateNewMusicQueueRow {
  count: number;
}

interface SortCreatedPlaylistProofRow {
  playlist_with_recipe_count: number;
}

interface OneOffFlowProofRow {
  complete_playlist_count: number;
}

interface NewMusicProofRow {
  generation_count: number;
  exported_count: number;
}

const requiredEnvKeys = ["DATABASE_URL", "SMOKE_USER_EMAIL"] as const;

function result(name: string, status: CheckStatus, detail: string): CheckResult {
  return { name, status, detail };
}

async function run() {
  const missingEnv = requiredEnvKeys.filter((key) => !process.env[key]);
  const strictEvidence = parseBoolean(process.env.SMOKE_EVIDENCE_STRICT);

  if (missingEnv.length > 0) {
    printAndExit(
      [result("required env", "fail", `missing: ${missingEnv.join(", ")}`)],
      strictEvidence
    );
  }

  const databaseUrl = process.env.DATABASE_URL;
  const smokeUserEmail = process.env.SMOKE_USER_EMAIL?.trim().toLowerCase();

  if (!databaseUrl || !smokeUserEmail) {
    printAndExit(
      [result("required env", "fail", "missing database URL or smoke user email")],
      strictEvidence
    );
  }

  const client = new Client({
    connectionString: databaseUrl,
    ssl: databaseUrl.includes("localhost") ? false : { rejectUnauthorized: false }
  });

  await client.connect();

  try {
    const profile = await getProfile(client, smokeUserEmail);

    if (!profile) {
      printAndExit(
        [result("smoke user", "fail", `no profile found for ${maskEmail(smokeUserEmail)}`)],
        strictEvidence
      );
    }

    const [
      connectionSummary,
      recentSyncs,
      librarySyncSummary,
      latestOwnership,
      playlistSummary,
      recipeSummary,
      generationSummary,
      generationTrackSummary,
      exportSummary,
      sortSummary,
      duplicateNewMusicQueues,
      sortCreatedPlaylistProof,
      oneOffFlowProof,
      newMusicProof
    ] = await Promise.all([
      getConnectionSummary(client, profile.id),
      getRecentSyncs(client, profile.id),
      getLibrarySyncSummary(client, profile.id),
      getLatestOwnershipCount(client, profile.id),
      getPlaylistSummary(client, profile.id),
      getRecipeSummary(client, profile.id),
      getGenerationSummary(client, profile.id),
      getGenerationTrackSummary(client, profile.id),
      getExportSummary(client, profile.id),
      getSortSummary(client, profile.id),
      getDuplicateNewMusicQueueCount(client, profile.id),
      getSortCreatedPlaylistProof(client, profile.id),
      getOneOffFlowProof(client, profile.id),
      getNewMusicProof(client, profile.id)
    ]);
    const latestSync = recentSyncs[0] ?? null;
    const completedSyncs = recentSyncs.filter((sync) => sync.status === "completed");

    const checks = [
      result(
        "smoke user",
        "pass",
        `profile=${profile.id}, email=${maskEmail(profile.email ?? smokeUserEmail)}`
      ),
      result(
        "Apple Music connection",
        connectionSummary.connected_count > 0 ? "pass" : "fail",
        `connected=${connectionSummary.connected_count}, total=${connectionSummary.total}, latest=${connectionSummary.latest_updated_at ?? "none"}`
      ),
      result(
        "library sync",
        completedSyncs.length > 0 && latestOwnership > 0 ? "pass" : "fail",
        latestSync
          ? `latest=${latestSync.id}, status=${latestSync.status}, completed=${librarySyncSummary.completed_count}, raw=${latestSync.raw_track_count}, normalized=${latestSync.normalized_track_count}, duplicates=${latestSync.duplicate_count}, owned=${latestOwnership}`
          : "no syncs found"
      ),
      result(
        "Sort organization",
        sortSummary.completed_count > 0 ? "pass" : "warn",
        `sorts=${sortSummary.total}, completed=${sortSummary.completed_count}, failed=${sortSummary.failed_count}`
      ),
      result(
        "persistent playlists",
        sortCreatedPlaylistProof.playlist_with_recipe_count >= 3
          ? "pass"
          : "warn",
        `playlists=${playlistSummary.total}, active=${playlistSummary.active_count}, sort_created=${playlistSummary.sort_created_count}, sort_created_with_recipes=${sortCreatedPlaylistProof.playlist_with_recipe_count}, playlist_recipes=${recipeSummary.playlist_recipe_count}`
      ),
      result(
        "playlist generations",
        generationSummary.total > 0 ? "pass" : "warn",
        `generations=${generationSummary.total}, ready=${generationSummary.ready_for_review_count}, reviewed=${generationSummary.reviewed_count}, exported=${generationSummary.exported_count}, sort=${generationSummary.sort_generation_count}, standalone=${generationSummary.standalone_generation_count}, new_music=${generationSummary.new_music_generation_count}`
      ),
      result(
        "track review decisions",
        generationTrackSummary.reviewed_total > 0 ? "pass" : "warn",
        `tracks=${generationTrackSummary.total}, reviewed_tracks=${generationTrackSummary.reviewed_total}, kept=${generationTrackSummary.kept_count}, removed=${generationTrackSummary.removed_count}`
      ),
      result(
        "Apple Music exports",
        exportSummary.sort_exported_count > 0 && exportSummary.apple_playlist_count > 0
          ? "pass"
          : "warn",
        `exports=${exportSummary.total}, queued=${exportSummary.queued_count}, exported=${exportSummary.exported_count}, failed=${exportSummary.failed_count}, apple_playlist_ids=${exportSummary.apple_playlist_count}, sort_exported=${exportSummary.sort_exported_count}, standalone_exported=${exportSummary.standalone_exported_count}, new_music_exported=${exportSummary.new_music_exported_count}, selected_tracks=${exportSummary.selected_track_count}`
      ),
      result(
        "one-off playlist flow",
        oneOffFlowProof.complete_playlist_count > 0 ? "pass" : "warn",
        `complete_one_off_playlists=${oneOffFlowProof.complete_playlist_count}, standalone_playlists=${playlistSummary.standalone_count}, standalone_recipes=${recipeSummary.standalone_playlist_recipe_count}, standalone_generations=${generationSummary.standalone_generation_count}, standalone_exported=${exportSummary.standalone_exported_count}`
      ),
      result(
        "new music processing",
        librarySyncSummary.completed_count >= 2 &&
          playlistSummary.processed_new_music_count > 0 &&
          newMusicProof.generation_count > 0 &&
          newMusicProof.exported_count === 0
          ? "pass"
          : "warn",
        `completed_syncs=${librarySyncSummary.completed_count}, processed_playlists=${playlistSummary.processed_new_music_count}, new_music_generations=${newMusicProof.generation_count}, new_music_exported=${newMusicProof.exported_count}, duplicate_queue_groups=${duplicateNewMusicQueues.count}`
      ),
      result(
        "duplicate new-music queues",
        duplicateNewMusicQueues.count === 0 ? "pass" : "fail",
        `duplicate_queue_groups=${duplicateNewMusicQueues.count}`
      )
    ];

    printAndExit(checks, strictEvidence);
  } finally {
    await client.end();
  }
}

function parseBoolean(value: string | undefined) {
  return ["1", "true", "yes"].includes(value?.trim().toLowerCase() ?? "");
}

async function getProfile(client: Client, email: string): Promise<ProfileRow | null> {
  const rows = await client.query<ProfileRow>(
    `
    select id, email
    from profiles
    where lower(email) = $1
    limit 1
    `,
    [email]
  );

  return rows.rows[0] ?? null;
}

async function getConnectionSummary(
  client: Client,
  userId: string
): Promise<ConnectionSummaryRow> {
  return oneRow<ConnectionSummaryRow>(
    client,
    `
    select
      count(*)::int as total,
      count(*) filter (where status = 'connected')::int as connected_count,
      max(updated_at)::text as latest_updated_at
    from apple_music_connections
    where user_id = $1
    `,
    [userId]
  );
}

async function getRecentSyncs(client: Client, userId: string): Promise<LibrarySyncRow[]> {
  const rows = await client.query<LibrarySyncRow>(
    `
    select
      id,
      status,
      raw_track_count,
      normalized_track_count,
      duplicate_count,
      created_at::text,
      updated_at::text
    from library_syncs
    where user_id = $1
    order by created_at desc
    limit 3
    `,
    [userId]
  );

  return rows.rows;
}

async function getLibrarySyncSummary(
  client: Client,
  userId: string
): Promise<LibrarySyncSummaryRow> {
  return oneRow<LibrarySyncSummaryRow>(
    client,
    `
    select count(*) filter (where status = 'completed')::int as completed_count
    from library_syncs
    where user_id = $1
    `,
    [userId]
  );
}

async function getLatestOwnershipCount(client: Client, userId: string): Promise<number> {
  const row = await oneRow<CountRow>(
    client,
    `
    with latest_sync as (
      select id
      from library_syncs
      where user_id = $1
      order by created_at desc
      limit 1
    )
    select count(*)::int as count
    from track_ownership
    where user_id = $1
      and sync_id in (select id from latest_sync)
    `,
    [userId]
  );

  return row.count;
}

async function getPlaylistSummary(
  client: Client,
  userId: string
): Promise<PlaylistSummaryRow> {
  return oneRow<PlaylistSummaryRow>(
    client,
    `
    select
      count(*)::int as total,
      count(*) filter (where status != 'archived')::int as active_count,
      count(*) filter (where created_from_sort_run_id is not null)::int as sort_created_count,
      count(*) filter (where created_from_sort_run_id is null and status != 'archived')::int as standalone_count,
      count(*) filter (where apple_playlist_id is not null)::int as exported_count,
      count(*) filter (where last_processed_new_music_sync_id is not null)::int as processed_new_music_count
    from playlists
    where user_id = $1
    `,
    [userId]
  );
}

async function getRecipeSummary(client: Client, userId: string): Promise<RecipeSummaryRow> {
  return oneRow<RecipeSummaryRow>(
    client,
    `
    select
      count(*) filter (where pr.playlist_id is not null)::int as playlist_recipe_count,
      count(*) filter (
        where pr.playlist_id is not null
          and p.created_from_sort_run_id is not null
      )::int as sort_created_playlist_recipe_count,
      count(*) filter (
        where pr.playlist_id is not null
          and p.created_from_sort_run_id is null
          and p.status != 'archived'
      )::int as standalone_playlist_recipe_count,
      count(*) filter (where pr.sort_run_id is not null)::int as sort_recipe_count
    from playlist_recipes pr
    left join playlists p on p.id = pr.playlist_id
    where pr.user_id = $1
    `,
    [userId]
  );
}

async function getGenerationSummary(
  client: Client,
  userId: string
): Promise<GenerationSummaryRow> {
  return oneRow<GenerationSummaryRow>(
    client,
    `
    select
      count(*)::int as total,
      count(*) filter (where status = 'ready_for_review')::int as ready_for_review_count,
      count(*) filter (where status in ('reviewed', 'exporting', 'exported'))::int as reviewed_count,
      count(*) filter (where status = 'exported')::int as exported_count,
      count(*) filter (where sort_run_id is not null)::int as sort_generation_count,
      count(*) filter (
        where sort_run_id is null
          and not (recipe_snapshot @> '{"source":"new_music"}'::jsonb)
      )::int as standalone_generation_count,
      count(*) filter (where recipe_snapshot @> '{"source":"new_music"}'::jsonb)::int as new_music_generation_count
    from playlist_generations
    where user_id = $1
    `,
    [userId]
  );
}

async function getGenerationTrackSummary(
  client: Client,
  userId: string
): Promise<GenerationTrackSummaryRow> {
  return oneRow<GenerationTrackSummaryRow>(
    client,
    `
    select
      count(*)::int as total,
      count(*) filter (where pg.status in ('reviewed', 'exporting', 'exported'))::int as reviewed_total,
      count(*) filter (where pgt.decision = 'keep')::int as kept_count,
      count(*) filter (where pgt.decision = 'remove')::int as removed_count
    from playlist_generation_tracks pgt
    join playlist_generations pg on pg.id = pgt.generation_id
    where pg.user_id = $1
    `,
    [userId]
  );
}

async function getExportSummary(client: Client, userId: string): Promise<ExportSummaryRow> {
  return oneRow<ExportSummaryRow>(
    client,
    `
    select
      count(*)::int as total,
      count(*) filter (where pe.status = 'queued')::int as queued_count,
      count(*) filter (where pe.status = 'exported')::int as exported_count,
      count(*) filter (where pe.status = 'failed')::int as failed_count,
      count(*) filter (where pe.apple_playlist_id is not null)::int as apple_playlist_count,
      count(*) filter (
        where pe.status = 'exported'
          and pe.sort_run_id is not null
          and pe.apple_playlist_id is not null
      )::int as sort_exported_count,
      count(*) filter (
        where pe.status = 'exported'
          and pe.sort_run_id is null
          and not coalesce(pg.recipe_snapshot @> '{"source":"new_music"}'::jsonb, false)
      )::int as standalone_exported_count,
      count(*) filter (
        where pe.status = 'exported'
          and coalesce(pg.recipe_snapshot @> '{"source":"new_music"}'::jsonb, false)
      )::int as new_music_exported_count,
      coalesce(sum(pe.selected_track_count), 0)::int as selected_track_count
    from playlist_exports pe
    left join playlist_generations pg on pg.id = pe.generation_id
    where pe.user_id = $1
    `,
    [userId]
  );
}

async function getSortSummary(client: Client, userId: string): Promise<SortSummaryRow> {
  return oneRow<SortSummaryRow>(
    client,
    `
    select
      count(*)::int as total,
      count(*) filter (where state = 'completed')::int as completed_count,
      count(*) filter (where state = 'failed')::int as failed_count
    from sort_runs
    where user_id = $1
    `,
    [userId]
  );
}

async function getDuplicateNewMusicQueueCount(
  client: Client,
  userId: string
): Promise<DuplicateNewMusicQueueRow> {
  return oneRow<DuplicateNewMusicQueueRow>(
    client,
    `
    select count(*)::int as count
    from (
      select playlist_id, library_sync_id, count(*)::int
      from playlist_generations
      where user_id = $1
        and library_sync_id is not null
        and recipe_snapshot @> '{"source":"new_music"}'::jsonb
      group by playlist_id, library_sync_id
      having count(*) > 1
    ) duplicate_new_music_queues
    `,
    [userId]
  );
}

async function getSortCreatedPlaylistProof(
  client: Client,
  userId: string
): Promise<SortCreatedPlaylistProofRow> {
  return oneRow<SortCreatedPlaylistProofRow>(
    client,
    `
    select count(*)::int as playlist_with_recipe_count
    from playlists p
    where p.user_id = $1
      and p.status != 'archived'
      and p.created_from_sort_run_id is not null
      and exists (
        select 1
        from playlist_recipes pr
        where pr.user_id = p.user_id
          and pr.playlist_id = p.id
      )
    `,
    [userId]
  );
}

async function getOneOffFlowProof(client: Client, userId: string): Promise<OneOffFlowProofRow> {
  return oneRow<OneOffFlowProofRow>(
    client,
    `
    select count(*)::int as complete_playlist_count
    from playlists p
    where p.user_id = $1
      and p.status != 'archived'
      and p.created_from_sort_run_id is null
      and exists (
        select 1
        from playlist_recipes pr
        where pr.user_id = p.user_id
          and pr.playlist_id = p.id
      )
      and exists (
        select 1
        from playlist_generations pg
        where pg.user_id = p.user_id
          and pg.playlist_id = p.id
          and pg.sort_run_id is null
          and not (pg.recipe_snapshot @> '{"source":"new_music"}'::jsonb)
      )
      and exists (
        select 1
        from playlist_exports pe
        join playlist_generations pg on pg.id = pe.generation_id
        where pe.user_id = p.user_id
          and pe.playlist_id = p.id
          and pe.status = 'exported'
          and pe.apple_playlist_id is not null
          and pe.sort_run_id is null
          and pg.sort_run_id is null
          and not (pg.recipe_snapshot @> '{"source":"new_music"}'::jsonb)
      )
    `,
    [userId]
  );
}

async function getNewMusicProof(client: Client, userId: string): Promise<NewMusicProofRow> {
  return oneRow<NewMusicProofRow>(
    client,
    `
    select
      count(*)::int as generation_count,
      count(*) filter (
        where exists (
          select 1
          from playlist_exports pe
          where pe.user_id = pg.user_id
            and pe.generation_id = pg.id
            and pe.status = 'exported'
            and pe.apple_playlist_id is not null
        )
      )::int as exported_count
    from playlist_generations pg
    where pg.user_id = $1
      and pg.recipe_snapshot @> '{"source":"new_music"}'::jsonb
    `,
    [userId]
  );
}

async function oneRow<T extends QueryResultRow>(
  client: Client,
  sql: string,
  params: unknown[]
): Promise<T> {
  const result = await client.query<T>(sql, params);
  const row = result.rows[0];

  if (!row) {
    throw new Error("Expected query to return one row.");
  }

  return row;
}

function maskEmail(email: string): string {
  const [localPart, domain] = email.split("@");

  if (!localPart || !domain) {
    return "unknown";
  }

  return `${localPart.slice(0, 2)}***@${domain}`;
}

function printAndExit(checks: CheckResult[], failOnWarn = false): never {
  for (const check of checks) {
    console.log(`${check.status.toUpperCase()} ${check.name}: ${check.detail}`);
  }

  const hasFailure = checks.some((check) => check.status === "fail");
  const hasWarning = failOnWarn && checks.some((check) => check.status === "warn");

  if (hasFailure || hasWarning) {
    if (hasWarning && !hasFailure) {
      console.log("FAIL strict evidence: unresolved warnings remain.");
    }

    process.exit(1);
  }

  process.exit(0);
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
