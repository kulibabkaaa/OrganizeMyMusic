update playlists
set updated_at = now()
where updated_at is null;

alter table playlists
alter column updated_at set default now();

alter table playlists
alter column updated_at set not null;
