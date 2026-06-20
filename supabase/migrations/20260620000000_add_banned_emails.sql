-- ============================================================================
-- Migration: Email blocklist for ban evasion
-- ============================================================================
-- Adds:
--   • banned_emails table — emails that must not be allowed to (re-)register
--   • check_banned_email_before_signup() — Postgres function matching the
--     Supabase Auth "Before User Created" hook signature; rejects signup
--     when the email is on the blocklist
--
-- Wiring (must be done once in the Supabase Dashboard — hooks cannot be
-- registered from a migration):
--   Authentication → Hooks → Before User Created
--     → select function: public.check_banned_email_before_signup
--
-- Safe to re-run: every operation is idempotent.
-- ============================================================================

CREATE TABLE IF NOT EXISTS banned_emails (
  email TEXT PRIMARY KEY,
  reason TEXT,
  banned_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE banned_emails ENABLE ROW LEVEL SECURITY;

-- Only founders may view or manage the blocklist from the client.
DROP POLICY IF EXISTS banned_emails_founder_all ON banned_emails;
CREATE POLICY banned_emails_founder_all ON banned_emails
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_id = auth.uid()
        AND users.profile_data->>'role' = 'founder'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_id = auth.uid()
        AND users.profile_data->>'role' = 'founder'
    )
  );

-- Auth hook: runs before a new auth.users row is created. Returning a
-- jsonb object with an "error" key blocks the signup. Emails are matched
-- case-insensitively against the blocklist.
CREATE OR REPLACE FUNCTION public.check_banned_email_before_signup(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  incoming_email TEXT := lower(event->'user'->>'email');
BEGIN
  IF incoming_email IS NOT NULL AND EXISTS (
    SELECT 1 FROM banned_emails WHERE lower(email) = incoming_email
  ) THEN
    RETURN jsonb_build_object(
      'error', jsonb_build_object(
        'http_code', 400,
        'message', 'This email is not permitted to register.'
      )
    );
  END IF;

  RETURN jsonb_build_object();
END;
$$;

-- The Auth Hooks system invokes this as the supabase_auth_admin role.
GRANT EXECUTE ON FUNCTION public.check_banned_email_before_signup TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.check_banned_email_before_signup FROM authenticated, anon, public;
