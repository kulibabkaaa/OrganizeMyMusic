create index if not exists idx_sort_runs_library_sync on sort_runs (library_sync_id)
where library_sync_id is not null;

create index if not exists idx_track_ownership_normalized_track on track_ownership (normalized_track_id);
