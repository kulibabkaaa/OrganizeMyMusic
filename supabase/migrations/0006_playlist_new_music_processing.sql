alter table playlists
add column if not exists last_processed_new_music_sync_id uuid references library_syncs(id) on delete set null;

create index if not exists idx_playlists_last_processed_new_music_sync
on playlists (user_id, last_processed_new_music_sync_id)
where last_processed_new_music_sync_id is not null;
