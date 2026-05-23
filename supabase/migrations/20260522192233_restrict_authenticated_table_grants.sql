revoke all on profiles from authenticated;
revoke all on apple_music_connections from authenticated;
revoke all on library_syncs from authenticated;
revoke all on library_tracks_raw from authenticated;
revoke all on tracks_normalized from authenticated;
revoke all on track_ownership from authenticated;
revoke all on track_classifications from authenticated;
revoke all on sort_runs from authenticated;
revoke all on playlist_requests from authenticated;
revoke all on sort_playlists from authenticated;
revoke all on sort_playlist_tracks from authenticated;
revoke all on payments from authenticated;
revoke all on job_events from authenticated;

grant usage on schema public to authenticated, service_role;
grant all privileges on all tables in schema public to service_role;
