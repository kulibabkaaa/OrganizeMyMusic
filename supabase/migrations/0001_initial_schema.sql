create extension if not exists "pgcrypto";

create table if not exists profiles (
  id uuid primary key,
  email text unique,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists apple_music_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  storefront text not null,
  encrypted_user_token text not null,
  status text not null default 'connected',
  last_validated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
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
  updated_at timestamptz not null default now()
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
  created_at timestamptz not null default now()
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
  moods text[] not null default '{}',
  confidence numeric(4, 3) not null,
  source text not null,
  created_at timestamptz not null default now(),
  unique (normalized_track_id, version, metadata_hash)
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
  updated_at timestamptz not null default now()
);

create table if not exists sort_playlists (
  id uuid primary key default gen_random_uuid(),
  sort_run_id uuid not null references sort_runs(id) on delete cascade,
  dimension text not null,
  title text not null,
  description text not null,
  confidence_label text not null,
  apple_playlist_id text,
  created_at timestamptz not null default now()
);

create table if not exists sort_playlist_tracks (
  id uuid primary key default gen_random_uuid(),
  sort_playlist_id uuid not null references sort_playlists(id) on delete cascade,
  normalized_track_id uuid not null references tracks_normalized(id) on delete cascade,
  position integer not null,
  created_at timestamptz not null default now(),
  unique (sort_playlist_id, normalized_track_id)
);

create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  sort_run_id uuid not null references sort_runs(id) on delete cascade,
  stripe_checkout_session_id text,
  stripe_payment_intent_id text,
  status text not null default 'pending',
  amount_cents integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists job_events (
  id uuid primary key default gen_random_uuid(),
  sort_run_id uuid references sort_runs(id) on delete cascade,
  stage text not null,
  level text not null,
  message text not null,
  details jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_tracks_normalized_fingerprint on tracks_normalized (fingerprint);
create index if not exists idx_track_classifications_track on track_classifications (normalized_track_id);
create index if not exists idx_sort_runs_user on sort_runs (user_id, created_at desc);
create index if not exists idx_job_events_sort_run on job_events (sort_run_id, created_at desc);

