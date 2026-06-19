-- =============================================================
-- Socion — Fix missing table grants on Rooms tables
-- Migration: 20260619150000_room_grants_fix.sql
--
-- RLS policies restrict which *rows* a role can see/touch, but
-- Postgres still requires baseline table-level GRANTs before RLS
-- is even evaluated. The original quadra-rooms and reactions
-- migrations created policies but never issued explicit GRANTs,
-- so `authenticated` hits "permission denied for table" rather
-- than the RLS-specific error. Mirrors 20260619130000_board_grants_fix.sql.
-- =============================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.rooms                   TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.room_messages           TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.room_reports            TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.room_message_reactions  TO authenticated;
