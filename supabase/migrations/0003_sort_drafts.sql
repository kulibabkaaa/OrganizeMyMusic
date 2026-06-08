alter table sort_runs
add column if not exists name text,
add column if not exists source_provider text not null default 'apple_music';

alter table sort_runs
add constraint sort_runs_source_provider_check
check (source_provider in ('apple_music'));

create index if not exists idx_sort_runs_source_provider on sort_runs (source_provider);
