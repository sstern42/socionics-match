-- This project applies migrations via the SQL editor / scripts rather than the
-- Supabase CLI, so the CLI-managed bookkeeping schema was never created. As a
-- result, the Supabase Studio dashboard's "Migrations" tab fails with:
--   relation "supabase_migrations.schema_migrations" does not exist
-- Creating the schema/table here (matching what `supabase db push` would set
-- up) fixes the dashboard error. We also backfill one row per migration file
-- already present in this repo so the history shown in the dashboard is
-- accurate going forward.

create schema if not exists supabase_migrations;

create table if not exists supabase_migrations.schema_migrations (
  version text not null primary key,
  statements text[],
  name text
);

create table if not exists supabase_migrations.seed_files (
  path text not null primary key,
  hash text not null
);

insert into supabase_migrations.schema_migrations (version, name)
values
  ('20260527120000', 'add_premium_subscription_support'),
  ('20260529000000', 'archive_settings'),
  ('20260602000000', 'quadra_rooms'),
  ('20260602000001', 'reactions'),
  ('20260602000002', 'room_messages_reply'),
  ('20260602000003', 'room_push_debounce'),
  ('20260606000000', 'profile_views'),
  ('20260606000001', 'relation_stats'),
  ('20260606000002', 'users_realtime'),
  ('20260613000000', 'add_room_message_image_url'),
  ('20260613000001', 'add_room_message_reply_to'),
  ('20260614000000', 'dev_account_free_tier'),
  ('20260614000001', 'fix_connection_cap_count'),
  ('20260617120000', 'add_referral_programme_support'),
  ('20260617130000', 'add_referral_attribution_rpc'),
  ('20260617140000', 'add_referral_frontend_rpcs'),
  ('20260617150000', 'fix_referral_reward_days_granted_for_premium_referrers'),
  ('20260617160000', 'fix_referrals_delete_account_fk'),
  ('20260618000000', 'boards'),
  ('20260618000001', 'enforce_connection_cap_both_parties'),
  ('20260618130000', 'enforce_connection_cap_on_revive_match'),
  ('20260618150000', 'announce_boards'),
  ('20260618160000', 'board_post_views'),
  ('20260619000000', 'board_founder_pinning'),
  ('20260619000001', 'socion_room'),
  ('20260619130000', 'board_grants_fix'),
  ('20260619140000', 'board_comment_replies'),
  ('20260619140001', 'fix_board_anon_check'),
  ('20260619150000', 'add_site_banner_columns'),
  ('20260619150001', 'room_grants_fix'),
  ('20260619160000', 'room_users_select_grant'),
  ('20260619160001', 'stats_founder_update_policy'),
  ('20260619170000', 'fix_room_anon_check'),
  ('20260620000000', 'add_banned_emails'),
  ('20260620000001', 'board_reports_admin'),
  ('20260620120000', 'user_reports'),
  ('20260620130000', 'get_admin_stats_user_reports'),
  ('20260623120000', 'get_admin_stats_role_check'),
  ('20260623121000', 'users_protect_sensitive_columns'),
  ('20260623122000', 'protect_matches_blocks_columns'),
  ('20260623123000', 'referral_rpcs_derive_caller'),
  ('20260623124000', 'profile_view_relation_stats_derive_caller'),
  ('20260623125000', 'can_add_connection_row_lock'),
  ('20260623126000', 'increment_ai_message_count'),
  ('20260629120000', 'account_deletions_log'),
  ('20260629121000', 'referral_deletions_log'),
  ('20260629122000', 'notify_board_comment_reply')
on conflict (version) do nothing;
