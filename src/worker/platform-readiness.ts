import { Client } from "pg";

import { loadRuntimeEnv } from "@/lib/load-runtime-env";

loadRuntimeEnv();

const requiredEnvKeys = [
  "DATABASE_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "APPLE_TEAM_ID",
  "APPLE_KEY_ID",
  "APPLE_PRIVATE_KEY",
  "APPLE_MUSICKIT_KEY",
  "OPENAI_API_KEY",
  "ENCRYPTION_KEY"
] as const;

const requiredMigrations = [
  "platform_playlists",
  "fix_playlists_updated_at_default",
  "playlist_new_music_processing"
] as const;
const requiredPlatformTables = [
  "playlists",
  "playlist_generations",
  "playlist_generation_tracks",
  "playlist_exports"
] as const;
const requiredQueues = [
  "library-sync",
  "full-sort",
  "playlist-create",
  "playlist-generation-export"
] as const;
const blockingJobStates = ["active", "created", "failed", "retry"] as const;

type CheckStatus = "pass" | "fail";

interface CheckResult {
  name: string;
  status: CheckStatus;
  detail: string;
}

function result(name: string, status: CheckStatus, detail: string): CheckResult {
  return { name, status, detail };
}

async function run() {
  const [{ env }, { getEncryptionKeyValidationError }] = await Promise.all([
    import("@/lib/env"),
    import("@/lib/crypto")
  ]);
  const checks: CheckResult[] = [];

  const missingEnv = requiredEnvKeys.filter((key) => !env[key]);
  checks.push(
    result(
      "required server env",
      missingEnv.length === 0 ? "pass" : "fail",
      missingEnv.length === 0 ? "all required keys are present" : `missing: ${missingEnv.join(", ")}`
    )
  );
  const encryptionKeyError = env.ENCRYPTION_KEY
    ? getEncryptionKeyValidationError(env.ENCRYPTION_KEY)
    : "ENCRYPTION_KEY is missing";
  checks.push(
    result(
      "encryption key strength",
      encryptionKeyError ? "fail" : "pass",
      encryptionKeyError ?? "ENCRYPTION_KEY meets minimum strength"
    )
  );

  if (!env.DATABASE_URL) {
    printAndExit(checks);
  }

  const databaseUrl = env.DATABASE_URL;
  const client = new Client({
    connectionString: databaseUrl,
    ssl: databaseUrl.includes("localhost") ? false : { rejectUnauthorized: false }
  });

  await client.connect();

  try {
    const migrationRows = await client.query<{ name: string }>(
      `
      select name
      from supabase_migrations.schema_migrations
      where name = any($1::text[])
      order by name
      `,
      [[...requiredMigrations]]
    );
    const migrationNames = new Set(migrationRows.rows.map((row) => row.name));
    const missingMigrations = requiredMigrations.filter((name) => !migrationNames.has(name));
    checks.push(
      result(
        "platform migrations",
        missingMigrations.length === 0 ? "pass" : "fail",
        missingMigrations.length === 0
          ? "platform migrations are applied"
          : `missing: ${missingMigrations.join(", ")}`
      )
    );

    const tableRows = await client.query<{ table_name: string; relrowsecurity: boolean }>(
      `
      select c.relname as table_name, c.relrowsecurity
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relkind = 'r'
        and c.relname = any($1::text[])
      order by c.relname
      `,
      [[...requiredPlatformTables]]
    );
    const tableMap = new Map(tableRows.rows.map((row) => [row.table_name, row.relrowsecurity]));
    const missingTables = requiredPlatformTables.filter((table) => !tableMap.has(table));
    const rlsDisabledTables = tableRows.rows
      .filter((row) => !row.relrowsecurity)
      .map((row) => row.table_name);
    checks.push(
      result(
        "platform tables and RLS",
        missingTables.length === 0 && rlsDisabledTables.length === 0 ? "pass" : "fail",
        [
          missingTables.length > 0 ? `missing tables: ${missingTables.join(", ")}` : null,
          rlsDisabledTables.length > 0 ? `RLS disabled: ${rlsDisabledTables.join(", ")}` : null,
          missingTables.length === 0 && rlsDisabledTables.length === 0
            ? "platform tables exist with RLS enabled"
            : null
        ]
          .filter(Boolean)
          .join("; ")
      )
    );

    const columnRows = await client.query<{
      table_name: string;
      column_name: string;
      is_nullable: "YES" | "NO";
      column_default: string | null;
    }>(
      `
      select table_name, column_name, is_nullable, column_default
      from information_schema.columns
      where table_schema = 'public'
        and (
          (table_name = 'playlists' and column_name in ('updated_at', 'last_processed_new_music_sync_id'))
          or (table_name = 'playlist_recipes' and column_name = 'playlist_id')
          or (table_name = 'sort_playlists' and column_name = 'playlist_id')
        )
      order by table_name, column_name
      `
    );
    const columns = new Map(
      columnRows.rows.map((row) => [`${row.table_name}.${row.column_name}`, row])
    );
    const updatedAt = columns.get("playlists.updated_at");
    const columnFailures = [
      updatedAt?.is_nullable === "NO" ? null : "playlists.updated_at must be not null",
      updatedAt?.column_default?.includes("now()")
        ? null
        : "playlists.updated_at must default to now()",
      columns.has("playlists.last_processed_new_music_sync_id")
        ? null
        : "playlists.last_processed_new_music_sync_id missing",
      columns.has("playlist_recipes.playlist_id") ? null : "playlist_recipes.playlist_id missing",
      columns.has("sort_playlists.playlist_id") ? null : "sort_playlists.playlist_id missing"
    ].filter(Boolean);
    checks.push(
      result(
        "platform linking columns",
        columnFailures.length === 0 ? "pass" : "fail",
        columnFailures.length === 0 ? "required platform columns are ready" : columnFailures.join("; ")
      )
    );

    const constraintRows = await client.query<{ conname: string; convalidated: boolean }>(
      `
      select conname, convalidated
      from pg_constraint
      where conname = 'playlist_recipes_scope_check'
      `
    );
    const scopeConstraint = constraintRows.rows[0];
    const unscopedRecipeRows = await client.query<{ count: number }>(
      `
      select count(*)::int as count
      from playlist_recipes
      where playlist_id is null and sort_run_id is null
      `
    );
    const unscopedRecipeCount = unscopedRecipeRows.rows[0]?.count ?? 0;
    checks.push(
      result(
        "playlist recipe scope",
        scopeConstraint?.convalidated === true && unscopedRecipeCount === 0 ? "pass" : "fail",
        scopeConstraint?.convalidated === true && unscopedRecipeCount === 0
          ? "scope constraint is valid and no recipes are unscoped"
          : `constraint valid: ${String(scopeConstraint?.convalidated ?? false)}, unscoped recipes: ${unscopedRecipeCount}`
      )
    );

    const queueRows = await client.query<{ name: string }>(
      `
      select name
      from pgboss.queue
      where name = any($1::text[])
      order by name
      `,
      [[...requiredQueues]]
    );
    const queueNames = new Set(queueRows.rows.map((row) => row.name));
    const missingQueues = requiredQueues.filter((name) => !queueNames.has(name));
    checks.push(
      result(
        "worker queues",
        missingQueues.length === 0 ? "pass" : "fail",
        missingQueues.length === 0
          ? "all MVP worker queues are registered"
          : `missing: ${missingQueues.join(", ")}`
      )
    );

    const jobRows = await client.query<{ name: string; state: string; count: number }>(
      `
      select name, state, count(*)::int as count
      from pgboss.job
      where name = any($1::text[])
      group by name, state
      order by name, state
      `,
      [[...requiredQueues]]
    );
    const blockingJobs = jobRows.rows.filter((row) =>
      blockingJobStates.includes(row.state as (typeof blockingJobStates)[number])
    );
    checks.push(
      result(
        "worker job backlog",
        blockingJobs.length === 0 ? "pass" : "fail",
        blockingJobs.length === 0
          ? "no active, queued, retrying, or failed jobs for MVP worker queues"
          : blockingJobs.map((row) => `${row.name}:${row.state}=${row.count}`).join(", ")
      )
    );
  } finally {
    await client.end();
  }

  printAndExit(checks);
}

function printAndExit(checks: CheckResult[]): never {
  for (const check of checks) {
    const marker = check.status === "pass" ? "PASS" : "FAIL";
    console.log(`${marker} ${check.name}: ${check.detail}`);
  }

  if (checks.some((check) => check.status === "fail")) {
    process.exit(1);
  }

  process.exit(0);
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
