import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const initialMigration = readFileSync(
  join(process.cwd(), "supabase/migrations/0001_initial_schema.sql"),
  "utf8"
);
const restrictedGrantMigration = readFileSync(
  join(process.cwd(), "supabase/migrations/20260522192233_restrict_authenticated_table_grants.sql"),
  "utf8"
);
const foreignKeyIndexMigration = readFileSync(
  join(process.cwd(), "supabase/migrations/20260522192411_add_missing_foreign_key_indexes.sql"),
  "utf8"
);
const uniqueAppleMusicConnectionMigration = readFileSync(
  join(
    process.cwd(),
    "supabase/migrations/20260522193959_unique_apple_music_connections_user.sql"
  ),
  "utf8"
);
const migration = `${initialMigration}\n${restrictedGrantMigration}\n${foreignKeyIndexMigration}\n${uniqueAppleMusicConnectionMigration}`;

const userOwnedTables = [
  "profiles",
  "apple_music_connections",
  "library_syncs",
  "library_tracks_raw",
  "tracks_normalized",
  "track_ownership",
  "track_classifications",
  "sort_runs",
  "playlist_requests",
  "sort_playlists",
  "sort_playlist_tracks",
  "payments",
  "job_events"
];

describe("initial Supabase migration", () => {
  it("creates the MVP user-data tables", () => {
    for (const table of userOwnedTables) {
      expect(migration).toMatch(new RegExp(`create table if not exists ${table}\\b`, "i"));
    }
  });

  it("enables RLS on every user-data table", () => {
    for (const table of userOwnedTables) {
      expect(migration).toMatch(new RegExp(`alter table ${table} enable row level security`, "i"));
    }
  });

  it("keeps browser access row-scoped and avoids destructive statements", () => {
    expect(migration).toContain("token_encryption_version integer not null default 1");
    expect(migration).toContain("create policy apple_music_connections_select_own");
    expect(migration).toContain("create policy job_events_select_own");
    expect(migration).toContain("grant all privileges on all tables in schema public to service_role");
    expect(restrictedGrantMigration).toContain("revoke all on apple_music_connections from authenticated");
    expect(restrictedGrantMigration).toContain("revoke all on library_tracks_raw from authenticated");
    expect(foreignKeyIndexMigration).toContain("idx_sort_runs_library_sync");
    expect(foreignKeyIndexMigration).toContain("idx_track_ownership_normalized_track");
    expect(uniqueAppleMusicConnectionMigration).toContain(
      "idx_apple_music_connections_unique_user"
    );
    expect(migration).not.toMatch(/\bdrop\s+table\b/i);
    expect(migration).not.toMatch(/\bdisable\s+row\s+level\s+security\b/i);
  });
});
