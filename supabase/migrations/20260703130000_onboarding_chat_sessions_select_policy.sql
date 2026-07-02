-- Issue #866: let the frontend show "X of 3 free chats available today"
-- before starting, rather than users only discovering the daily limit via
-- a 429 after already trying to start.
--
-- onboarding_chat_sessions currently has no RLS policies at all (by design
-- -- see 20260702160000's header: "only the service-role edge function
-- reads/writes this table"). Adding a narrow, read-only policy scoped to
-- the caller's own row, mirroring the client-side read pattern
-- SocionicsChat.jsx already uses against ai_message_counts. The
-- increment/write path stays exclusively through
-- increment_onboarding_chat_session_count() (service_role only) --
-- this policy can't be used to inflate or reset anyone's count.

CREATE POLICY "Users: read own onboarding chat session count"
  ON onboarding_chat_sessions FOR SELECT
  USING (user_id IN (SELECT id FROM users WHERE auth_id = auth.uid()));
