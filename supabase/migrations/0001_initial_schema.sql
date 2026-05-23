create extension if not exists "pgcrypto";

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  is_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists apple_music_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  storefront text not null,
  encrypted_user_token text not null,
  token_encryption_version integer not null default 1,
  status text not null default 'connected',
  last_validated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint apple_music_connections_status_check
    check (status in ('connected', 'expired', 'revoked', 'error'))
);

create table if not exists library_syncs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  status text not null,
  raw_track_count integer not null default 0,
  normalized_track_count integer not null default 0,
  duplicate_count integer not null default 0,
  error_summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint library_syncs_status_check
    check (status in ('queued', 'syncing', 'normalizing', 'completed', 'failed')),
  constraint library_syncs_counts_check
    check (raw_track_count >= 0 and normalized_track_count >= 0 and duplicate_count >= 0)
);

create table if not exists library_tracks_raw (
  id uuid primary key default gen_random_uuid(),
  sync_id uuid not null references library_syncs(id) on delete cascade,
  apple_song_id text,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists tracks_normalized (
  id uuid primary key default gen_random_uuid(),
  fingerprint text not null unique,
  apple_song_id text,
  isrc text,
  name text not null,
  artist_name text not null,
  album_name text,
  normalized_name text not null,
  normalized_artist text not null,
  normalized_album text,
  duration_in_millis integer,
  genre_names text[] not null default '{}',
  content_rating text,
  created_at timestamptz not null default now(),
  constraint tracks_normalized_duration_check
    check (duration_in_millis is null or duration_in_millis >= 0)
);

create table if not exists track_ownership (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  sync_id uuid not null references library_syncs(id) on delete cascade,
  normalized_track_id uuid not null references tracks_normalized(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (sync_id, normalized_track_id)
);

create table if not exists track_classifications (
  id uuid primary key default gen_random_uuid(),
  normalized_track_id uuid not null references tracks_normalized(id) on delete cascade,
  version integer not null,
  metadata_hash text not null,
  language text not null,
  genre text not null,
  subgenres text[] not null default '{}',
  moods text[] not null default '{}',
  energy numeric(4, 3),
  confidence numeric(4, 3) not null,
  source text not null,
  created_at timestamptz not null default now(),
  unique (normalized_track_id, version, metadata_hash),
  constraint track_classifications_confidence_check
    check (confidence >= 0 and confidence <= 1),
  constraint track_classifications_energy_check
    check (energy is null or (energy >= 0 and energy <= 1)),
  constraint track_classifications_source_check
    check (source in ('metadata', 'heuristic', 'openai'))
);

create table if not exists sort_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  library_sync_id uuid references library_syncs(id) on delete set null,
  state text not null,
  payment_status text not null default 'pending',
  preview_snapshot jsonb,
  stripe_checkout_session_id text,
  price_cents integer not null default 1900,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sort_runs_state_check
    check (state in (
      'draft',
      'syncing',
      'classifying',
      'preview_ready',
      'awaiting_payment',
      'paid',
      'creating_playlists',
      'completed',
      'failed'
    )),
  constraint sort_runs_payment_status_check
    check (payment_status in ('pending', 'paid', 'failed', 'refunded')),
  constraint sort_runs_price_check
    check (price_cents >= 0)
);

create table if not exists playlist_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  sort_run_id uuid not null references sort_runs(id) on delete cascade,
  user_prompt text not null,
  parsed_rules jsonb,
  created_at timestamptz not null default now()
);

create table if not exists sort_playlists (
  id uuid primary key default gen_random_uuid(),
  sort_run_id uuid not null references sort_runs(id) on delete cascade,
  dimension text not null,
  title text not null,
  description text not null,
  confidence_label text not null,
  playlist_rules jsonb,
  selected boolean not null default true,
  apple_playlist_id text,
  created_at timestamptz not null default now(),
  constraint sort_playlists_confidence_label_check
    check (confidence_label in ('high', 'medium', 'low'))
);

create table if not exists sort_playlist_tracks (
  id uuid primary key default gen_random_uuid(),
  sort_playlist_id uuid not null references sort_playlists(id) on delete cascade,
  normalized_track_id uuid not null references tracks_normalized(id) on delete cascade,
  position integer not null,
  score numeric(4, 3),
  reason text,
  removed_by_user boolean not null default false,
  created_at timestamptz not null default now(),
  unique (sort_playlist_id, normalized_track_id),
  constraint sort_playlist_tracks_position_check
    check (position >= 0),
  constraint sort_playlist_tracks_score_check
    check (score is null or (score >= 0 and score <= 1))
);

create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  sort_run_id uuid not null references sort_runs(id) on delete cascade,
  stripe_checkout_session_id text,
  stripe_payment_intent_id text,
  status text not null default 'pending',
  amount_cents integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payments_status_check
    check (status in ('pending', 'paid', 'failed', 'refunded')),
  constraint payments_amount_check
    check (amount_cents >= 0)
);

create table if not exists job_events (
  id uuid primary key default gen_random_uuid(),
  sort_run_id uuid references sort_runs(id) on delete cascade,
  library_sync_id uuid references library_syncs(id) on delete cascade,
  stage text not null,
  level text not null,
  message text not null,
  details jsonb,
  created_at timestamptz not null default now(),
  constraint job_events_level_check
    check (level in ('info', 'warn', 'error'))
);

create index if not exists idx_profiles_email on profiles (email);
create index if not exists idx_apple_music_connections_user on apple_music_connections (user_id);
create index if not exists idx_library_syncs_user on library_syncs (user_id, created_at desc);
create index if not exists idx_library_tracks_raw_sync on library_tracks_raw (sync_id, created_at desc);
create index if not exists idx_library_tracks_raw_apple_song on library_tracks_raw (apple_song_id);
create index if not exists idx_tracks_normalized_fingerprint on tracks_normalized (fingerprint);
create index if not exists idx_tracks_normalized_isrc on tracks_normalized (isrc) where isrc is not null;
create index if not exists idx_track_ownership_user on track_ownership (user_id, normalized_track_id);
create index if not exists idx_track_ownership_sync on track_ownership (sync_id);
create index if not exists idx_track_classifications_track on track_classifications (normalized_track_id);
create index if not exists idx_sort_runs_user on sort_runs (user_id, created_at desc);
create index if not exists idx_playlist_requests_user on playlist_requests (user_id, created_at desc);
create index if not exists idx_playlist_requests_sort_run on playlist_requests (sort_run_id);
create index if not exists idx_sort_playlists_sort_run on sort_playlists (sort_run_id);
create index if not exists idx_sort_playlist_tracks_playlist on sort_playlist_tracks (sort_playlist_id, position);
create index if not exists idx_sort_playlist_tracks_track on sort_playlist_tracks (normalized_track_id);
create index if not exists idx_payments_sort_run on payments (sort_run_id);
create index if not exists idx_job_events_sort_run on job_events (sort_run_id, created_at desc);
create index if not exists idx_job_events_library_sync on job_events (library_sync_id, created_at desc);

alter table profiles enable row level security;
alter table apple_music_connections enable row level security;
alter table library_syncs enable row level security;
alter table library_tracks_raw enable row level security;
alter table tracks_normalized enable row level security;
alter table track_ownership enable row level security;
alter table track_classifications enable row level security;
alter table sort_runs enable row level security;
alter table playlist_requests enable row level security;
alter table sort_playlists enable row level security;
alter table sort_playlist_tracks enable row level security;
alter table payments enable row level security;
alter table job_events enable row level security;

grant usage on schema public to authenticated, service_role;
grant all privileges on all tables in schema public to service_role;

revoke all on profiles from anon, authenticated;
revoke all on apple_music_connections from anon, authenticated;
revoke all on library_syncs from anon, authenticated;
revoke all on library_tracks_raw from anon, authenticated;
revoke all on tracks_normalized from anon, authenticated;
revoke all on track_ownership from anon, authenticated;
revoke all on track_classifications from anon, authenticated;
revoke all on sort_runs from anon, authenticated;
revoke all on playlist_requests from anon, authenticated;
revoke all on sort_playlists from anon, authenticated;
revoke all on sort_playlist_tracks from anon, authenticated;
revoke all on payments from anon, authenticated;
revoke all on job_events from anon, authenticated;

grant select (id, email, is_admin, created_at, updated_at) on profiles to authenticated;
grant insert (id, email) on profiles to authenticated;
grant update (email, updated_at) on profiles to authenticated;

grant select (
  id,
  user_id,
  storefront,
  status,
  last_validated_at,
  created_at,
  updated_at
) on apple_music_connections to authenticated;

grant select on library_syncs to authenticated;
grant select on library_tracks_raw to authenticated;
grant select on tracks_normalized to authenticated;
grant select on track_ownership to authenticated;
grant select on track_classifications to authenticated;
grant select on sort_runs to authenticated;
grant select on playlist_requests to authenticated;
grant select on sort_playlists to authenticated;
grant select on sort_playlist_tracks to authenticated;
grant select on payments to authenticated;
grant select on job_events to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'profiles' and policyname = 'profiles_select_own'
  ) then
    create policy profiles_select_own on profiles
      for select
      using ((select auth.uid()) = id);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'profiles' and policyname = 'profiles_insert_own'
  ) then
    create policy profiles_insert_own on profiles
      for insert
      with check ((select auth.uid()) = id);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'profiles' and policyname = 'profiles_update_own'
  ) then
    create policy profiles_update_own on profiles
      for update
      using ((select auth.uid()) = id)
      with check ((select auth.uid()) = id);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'apple_music_connections' and policyname = 'apple_music_connections_select_own'
  ) then
    create policy apple_music_connections_select_own on apple_music_connections
      for select
      using ((select auth.uid()) = user_id);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'library_syncs' and policyname = 'library_syncs_select_own'
  ) then
    create policy library_syncs_select_own on library_syncs
      for select
      using ((select auth.uid()) = user_id);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'library_tracks_raw' and policyname = 'library_tracks_raw_select_own'
  ) then
    create policy library_tracks_raw_select_own on library_tracks_raw
      for select
      using (
        exists (
          select 1
          from library_syncs
          where library_syncs.id = library_tracks_raw.sync_id
            and library_syncs.user_id = (select auth.uid())
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'tracks_normalized' and policyname = 'tracks_normalized_select_owned'
  ) then
    create policy tracks_normalized_select_owned on tracks_normalized
      for select
      using (
        exists (
          select 1
          from track_ownership
          where track_ownership.normalized_track_id = tracks_normalized.id
            and track_ownership.user_id = (select auth.uid())
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'track_ownership' and policyname = 'track_ownership_select_own'
  ) then
    create policy track_ownership_select_own on track_ownership
      for select
      using ((select auth.uid()) = user_id);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'track_classifications' and policyname = 'track_classifications_select_owned'
  ) then
    create policy track_classifications_select_owned on track_classifications
      for select
      using (
        exists (
          select 1
          from track_ownership
          where track_ownership.normalized_track_id = track_classifications.normalized_track_id
            and track_ownership.user_id = (select auth.uid())
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'sort_runs' and policyname = 'sort_runs_select_own'
  ) then
    create policy sort_runs_select_own on sort_runs
      for select
      using ((select auth.uid()) = user_id);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'playlist_requests' and policyname = 'playlist_requests_select_own'
  ) then
    create policy playlist_requests_select_own on playlist_requests
      for select
      using ((select auth.uid()) = user_id);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'sort_playlists' and policyname = 'sort_playlists_select_own'
  ) then
    create policy sort_playlists_select_own on sort_playlists
      for select
      using (
        exists (
          select 1
          from sort_runs
          where sort_runs.id = sort_playlists.sort_run_id
            and sort_runs.user_id = (select auth.uid())
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'sort_playlist_tracks' and policyname = 'sort_playlist_tracks_select_own'
  ) then
    create policy sort_playlist_tracks_select_own on sort_playlist_tracks
      for select
      using (
        exists (
          select 1
          from sort_playlists
          join sort_runs on sort_runs.id = sort_playlists.sort_run_id
          where sort_playlists.id = sort_playlist_tracks.sort_playlist_id
            and sort_runs.user_id = (select auth.uid())
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'payments' and policyname = 'payments_select_own'
  ) then
    create policy payments_select_own on payments
      for select
      using (
        exists (
          select 1
          from sort_runs
          where sort_runs.id = payments.sort_run_id
            and sort_runs.user_id = (select auth.uid())
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'job_events' and policyname = 'job_events_select_own'
  ) then
    create policy job_events_select_own on job_events
      for select
      using (
        (
          sort_run_id is not null
          and exists (
            select 1
            from sort_runs
            where sort_runs.id = job_events.sort_run_id
              and sort_runs.user_id = (select auth.uid())
          )
        )
        or (
          library_sync_id is not null
          and exists (
            select 1
            from library_syncs
            where library_syncs.id = job_events.library_sync_id
              and library_syncs.user_id = (select auth.uid())
          )
        )
      );
  end if;
end $$;
