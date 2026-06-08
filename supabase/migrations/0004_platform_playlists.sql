create table if not exists playlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  source_provider text not null default 'apple_music',
  name text not null,
  description text,
  status text not null default 'draft',
  apple_playlist_id text,
  created_from_sort_run_id uuid references sort_runs(id) on delete set null,
  latest_library_sync_id uuid references library_syncs(id) on delete set null,
  last_generated_at timestamptz,
  last_exported_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  constraint playlists_source_provider_check
    check (source_provider in ('apple_music')),
  constraint playlists_status_check
    check (status in ('draft', 'active', 'archived')),
  constraint playlists_name_check
    check (length(btrim(name)) > 0)
);

create index if not exists idx_playlists_user on playlists (user_id, updated_at desc);
create index if not exists idx_playlists_apple_playlist on playlists (user_id, apple_playlist_id)
where apple_playlist_id is not null;
create index if not exists idx_playlists_created_from_sort on playlists (created_from_sort_run_id)
where created_from_sort_run_id is not null;

alter table playlist_recipes
add column if not exists playlist_id uuid references playlists(id) on delete cascade;

alter table playlist_recipes
alter column sort_run_id drop not null;

alter table playlist_recipes
add constraint playlist_recipes_scope_check
check (playlist_id is not null or sort_run_id is not null);

create index if not exists idx_playlist_recipes_playlist on playlist_recipes (playlist_id, position)
where playlist_id is not null;

alter table sort_playlists
add column if not exists playlist_id uuid references playlists(id) on delete set null;

create index if not exists idx_sort_playlists_playlist on sort_playlists (playlist_id)
where playlist_id is not null;

create table if not exists playlist_generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  playlist_id uuid not null references playlists(id) on delete cascade,
  recipe_id uuid references playlist_recipes(id) on delete set null,
  sort_run_id uuid references sort_runs(id) on delete set null,
  library_sync_id uuid references library_syncs(id) on delete set null,
  status text not null default 'generating',
  recipe_snapshot jsonb not null default '{}',
  error_summary text,
  generated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint playlist_generations_status_check
    check (status in (
      'generating',
      'ready_for_review',
      'reviewed',
      'exporting',
      'exported',
      'failed'
    )),
  constraint playlist_generations_recipe_snapshot_object_check
    check (jsonb_typeof(recipe_snapshot) = 'object')
);

create index if not exists idx_playlist_generations_user on playlist_generations (user_id, created_at desc);
create index if not exists idx_playlist_generations_playlist on playlist_generations (playlist_id, created_at desc);
create index if not exists idx_playlist_generations_sort_run on playlist_generations (sort_run_id)
where sort_run_id is not null;

create table if not exists playlist_generation_tracks (
  id uuid primary key default gen_random_uuid(),
  generation_id uuid not null references playlist_generations(id) on delete cascade,
  normalized_track_id uuid not null references tracks_normalized(id) on delete cascade,
  position integer not null,
  score numeric(4, 3),
  reason text,
  decision text not null default 'keep',
  created_at timestamptz not null default now(),
  unique (generation_id, normalized_track_id),
  constraint playlist_generation_tracks_position_check
    check (position >= 0),
  constraint playlist_generation_tracks_score_check
    check (score is null or (score >= 0 and score <= 1)),
  constraint playlist_generation_tracks_decision_check
    check (decision in ('keep', 'remove'))
);

create index if not exists idx_playlist_generation_tracks_generation
on playlist_generation_tracks (generation_id, position);

create table if not exists playlist_exports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  playlist_id uuid not null references playlists(id) on delete cascade,
  generation_id uuid references playlist_generations(id) on delete set null,
  sort_run_id uuid references sort_runs(id) on delete set null,
  apple_playlist_id text,
  status text not null default 'queued',
  selected_track_count integer not null default 0,
  error_summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint playlist_exports_status_check
    check (status in ('queued', 'exporting', 'exported', 'failed')),
  constraint playlist_exports_selected_track_count_check
    check (selected_track_count >= 0)
);

create index if not exists idx_playlist_exports_user on playlist_exports (user_id, created_at desc);
create index if not exists idx_playlist_exports_playlist on playlist_exports (playlist_id, created_at desc);
create index if not exists idx_playlist_exports_generation on playlist_exports (generation_id)
where generation_id is not null;

alter table playlists enable row level security;
alter table playlist_generations enable row level security;
alter table playlist_generation_tracks enable row level security;
alter table playlist_exports enable row level security;

grant usage on schema public to authenticated, service_role;
grant all privileges on playlists to service_role;
grant all privileges on playlist_generations to service_role;
grant all privileges on playlist_generation_tracks to service_role;
grant all privileges on playlist_exports to service_role;

revoke all on playlists from anon, authenticated;
revoke all on playlist_generations from anon, authenticated;
revoke all on playlist_generation_tracks from anon, authenticated;
revoke all on playlist_exports from anon, authenticated;

grant select, insert, update on playlists to authenticated;
grant select on playlist_generations to authenticated;
grant select, update on playlist_generation_tracks to authenticated;
grant select on playlist_exports to authenticated;

drop policy if exists playlist_recipes_select_own on playlist_recipes;
drop policy if exists playlist_recipes_insert_own on playlist_recipes;
drop policy if exists playlist_recipes_update_own on playlist_recipes;
drop policy if exists playlist_recipes_delete_own on playlist_recipes;

create policy playlists_select_own on playlists
  for select
  using ((select auth.uid()) = user_id);

create policy playlists_insert_own on playlists
  for insert
  with check ((select auth.uid()) = user_id);

create policy playlists_update_own on playlists
  for update
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy playlist_recipes_select_own on playlist_recipes
  for select
  using ((select auth.uid()) = user_id);

create policy playlist_recipes_insert_own on playlist_recipes
  for insert
  with check (
    (select auth.uid()) = user_id
    and (
      (
        sort_run_id is not null
        and exists (
          select 1
          from sort_runs
          where sort_runs.id = playlist_recipes.sort_run_id
            and sort_runs.user_id = (select auth.uid())
        )
      )
      or (
        playlist_id is not null
        and exists (
          select 1
          from playlists
          where playlists.id = playlist_recipes.playlist_id
            and playlists.user_id = (select auth.uid())
        )
      )
    )
  );

create policy playlist_recipes_update_own on playlist_recipes
  for update
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and (
      (
        sort_run_id is not null
        and exists (
          select 1
          from sort_runs
          where sort_runs.id = playlist_recipes.sort_run_id
            and sort_runs.user_id = (select auth.uid())
        )
      )
      or (
        playlist_id is not null
        and exists (
          select 1
          from playlists
          where playlists.id = playlist_recipes.playlist_id
            and playlists.user_id = (select auth.uid())
        )
      )
    )
  );

create policy playlist_recipes_delete_own on playlist_recipes
  for delete
  using ((select auth.uid()) = user_id);

create policy playlist_generations_select_own on playlist_generations
  for select
  using ((select auth.uid()) = user_id);

create policy playlist_generation_tracks_select_own on playlist_generation_tracks
  for select
  using (
    exists (
      select 1
      from playlist_generations
      where playlist_generations.id = playlist_generation_tracks.generation_id
        and playlist_generations.user_id = (select auth.uid())
    )
  );

create policy playlist_generation_tracks_update_own on playlist_generation_tracks
  for update
  using (
    exists (
      select 1
      from playlist_generations
      where playlist_generations.id = playlist_generation_tracks.generation_id
        and playlist_generations.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from playlist_generations
      where playlist_generations.id = playlist_generation_tracks.generation_id
        and playlist_generations.user_id = (select auth.uid())
    )
  );

create policy playlist_exports_select_own on playlist_exports
  for select
  using ((select auth.uid()) = user_id);
