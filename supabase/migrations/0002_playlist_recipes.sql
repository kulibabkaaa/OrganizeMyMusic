create table if not exists playlist_recipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  sort_run_id uuid not null references sort_runs(id) on delete cascade,
  position integer not null,
  name text not null,
  playlist_note text,
  target_track_min integer,
  target_track_max integer,
  duplicate_policy text not null default 'avoid_duplicates',
  allow_explicit boolean not null default true,
  include_library_only boolean not null default true,
  tags jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint playlist_recipes_position_check
    check (position >= 0),
  constraint playlist_recipes_target_track_min_check
    check (target_track_min is null or target_track_min >= 1),
  constraint playlist_recipes_target_track_max_check
    check (target_track_max is null or target_track_max >= 1),
  constraint playlist_recipes_target_track_range_check
    check (
      target_track_min is null
      or target_track_max is null
      or target_track_min <= target_track_max
    ),
  constraint playlist_recipes_duplicate_policy_check
    check (duplicate_policy in ('avoid_duplicates', 'allow_duplicates')),
  constraint playlist_recipes_tags_array_check
    check (jsonb_typeof(tags) = 'array')
);

create index if not exists idx_playlist_recipes_user on playlist_recipes (user_id, updated_at desc);
create index if not exists idx_playlist_recipes_sort_run on playlist_recipes (sort_run_id, position);

alter table playlist_recipes enable row level security;

grant usage on schema public to authenticated, service_role;
grant all privileges on playlist_recipes to service_role;

revoke all on playlist_recipes from anon, authenticated;
grant select, insert, update, delete on playlist_recipes to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'playlist_recipes' and policyname = 'playlist_recipes_select_own'
  ) then
    create policy playlist_recipes_select_own on playlist_recipes
      for select
      using ((select auth.uid()) = user_id);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'playlist_recipes' and policyname = 'playlist_recipes_insert_own'
  ) then
    create policy playlist_recipes_insert_own on playlist_recipes
      for insert
      with check (
        (select auth.uid()) = user_id
        and exists (
          select 1
          from sort_runs
          where sort_runs.id = playlist_recipes.sort_run_id
            and sort_runs.user_id = (select auth.uid())
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'playlist_recipes' and policyname = 'playlist_recipes_update_own'
  ) then
    create policy playlist_recipes_update_own on playlist_recipes
      for update
      using ((select auth.uid()) = user_id)
      with check (
        (select auth.uid()) = user_id
        and exists (
          select 1
          from sort_runs
          where sort_runs.id = playlist_recipes.sort_run_id
            and sort_runs.user_id = (select auth.uid())
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'playlist_recipes' and policyname = 'playlist_recipes_delete_own'
  ) then
    create policy playlist_recipes_delete_own on playlist_recipes
      for delete
      using ((select auth.uid()) = user_id);
  end if;
end $$;
