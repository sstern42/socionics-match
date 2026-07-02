-- Issue #866 (backend phase): onboarding typing chat.
--
-- Resolves the three schema conflicts flagged in the issue's Section 2
-- instead of silently no-op'ing the spec's proposed SQL:
--
-- 1. type_assessments already exists (responses, computed_type_distribution
--    both NOT NULL, version default 'slide-1.0') and is written today by
--    createTypeAssessment() (src/lib/profile.js) for the old self-scored
--    questionnaire. We add the new chat columns to the existing table
--    rather than re-creating it, and relax `responses` /
--    `computed_type_distribution` to nullable — the chat flow has no
--    per-question forced-choice responses (transcript replaces it), but we
--    still populate computed_type_distribution from the analysis result so
--    existing/future readers of that column keep seeing a real distribution.
--    New rows from the chat set version = 'onboarding-chat-v1' explicitly
--    (written by the edge function, not this migration) to stay
--    distinguishable from the old 'slide-1.0' rows.
--
-- 2. users.type_confidence already exists as JSONB (a full per-type
--    distribution, e.g. {"ILE": 0.7}), not the scalar NUMERIC the spec's
--    migration assumed. apply_onboarding_type() below writes a single-entry
--    distribution (jsonb_build_object(type, confidence)) to stay consistent
--    with how it's read elsewhere (src/lib/feed.js, src/pages/HomeDashboard.jsx)
--    rather than adding a competing scalar column.
--
-- 3. users.type_source is genuinely new — added here with the CHECK
--    constraint from the spec, backfilled for the 219 existing members per
--    Section 11 (paid_verified where verified_by is set, else
--    self_reported), and pinned against direct client writes via the
--    existing protect_sensitive_user_columns trigger (20260623121000) so a
--    user can never set their own type_source via a direct REST PATCH —
--    apply_onboarding_type() is the only writer for the 'onboarding_chat'
--    value, matching the spec's "server-side only, never client-writable".
--
-- Also adds a session-level rate limit (3 onboarding-chat sessions/account/
-- day, Section 4/9/10) using the same row-locked check-and-increment
-- pattern as increment_ai_message_count (20260623126000), to avoid the same
-- TOCTOU race that function's header describes.

-- ── type_assessments: add chat columns, relax old NOT NULLs ────────────────

ALTER TABLE type_assessments
  ALTER COLUMN responses DROP NOT NULL,
  ALTER COLUMN computed_type_distribution DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS transcript JSONB,
  ADD COLUMN IF NOT EXISTS primary_type TEXT,
  ADD COLUMN IF NOT EXISTS primary_confidence NUMERIC,
  ADD COLUMN IF NOT EXISTS requires_lean_choice BOOLEAN DEFAULT FALSE;

-- ── users.type_source ───────────────────────────────────────────────────────

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS type_source TEXT DEFAULT 'unset'
    CHECK (type_source IN ('unset', 'self_reported', 'onboarding_chat', 'community_verified', 'paid_verified'));

-- Backfill existing members (Section 11). Guarded to 'unset' rows only so
-- re-running this migration can never clobber a type_source already set by
-- the new chat flow (or by a later paid/community verification) back to a
-- backfill guess.
UPDATE users
  SET type_source = CASE WHEN verified_by IS NOT NULL THEN 'paid_verified' ELSE 'self_reported' END
  WHERE type_source = 'unset';

-- Pin type_source against direct end-user writes, same mechanism as the
-- other admin/premium-only columns. Only the SECURITY DEFINER
-- apply_onboarding_type() below (and any future paid/community-verification
-- flow, which already runs as service_role) may change it.
CREATE OR REPLACE FUNCTION protect_sensitive_user_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF current_user <> 'authenticated' THEN
    RETURN NEW;
  END IF;

  NEW.is_founding_member             := OLD.is_founding_member;
  NEW.plan_status                    := OLD.plan_status;
  NEW.stripe_customer_id             := OLD.stripe_customer_id;
  NEW.stripe_subscription_id         := OLD.stripe_subscription_id;
  NEW.premium_started_at             := OLD.premium_started_at;
  NEW.premium_current_period_end     := OLD.premium_current_period_end;
  NEW.referral_code                  := OLD.referral_code;
  NEW.referred_by_user_id            := OLD.referred_by_user_id;
  NEW.referral_premium_until         := OLD.referral_premium_until;
  NEW.referral_premium_days_granted  := OLD.referral_premium_days_granted;
  NEW.referral_count_qualified       := OLD.referral_count_qualified;
  NEW.type_source                    := OLD.type_source;

  NEW.profile_data := jsonb_set(
    COALESCE(NEW.profile_data, '{}'::jsonb),
    '{role}',
    COALESCE(OLD.profile_data->'role', 'null'::jsonb)
  );

  RETURN NEW;
END;
$$;

-- Trigger already exists (20260623121000) and points at this function by
-- name, so no DROP/CREATE TRIGGER needed here.

-- ── apply_onboarding_type(): server-side only, never client-writable ───────
--
-- Refuses to overwrite paid_verified / community_verified (Locked decision
-- #5). Row-locks the user first so a retake racing a concurrent
-- paid-verification write can't both read a stale type_source and both
-- "win". Validates the type code server-side since it ultimately comes from
-- model output (a hallucinated/malformed code here should error loudly at
-- the caller, not silently write garbage to `type`).

CREATE OR REPLACE FUNCTION apply_onboarding_type(
  p_user_id UUID, p_type TEXT, p_confidence NUMERIC
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_source TEXT;
BEGIN
  IF p_type NOT IN (
    'ILE', 'LII', 'ESE', 'SEI', 'EIE', 'LSI', 'SLE', 'IEI',
    'SEE', 'ESI', 'LIE', 'ILI', 'IEE', 'EII', 'LSE', 'SLI'
  ) THEN
    RAISE EXCEPTION 'apply_onboarding_type: invalid Socionics type code %', p_type;
  END IF;

  IF p_confidence < 0 OR p_confidence > 1 THEN
    RAISE EXCEPTION 'apply_onboarding_type: confidence % out of range [0,1]', p_confidence;
  END IF;

  SELECT type_source INTO v_current_source FROM users WHERE id = p_user_id FOR UPDATE;

  IF v_current_source IN ('paid_verified', 'community_verified') THEN
    RETURN FALSE;
  END IF;

  UPDATE users
    SET type = p_type,
        type_confidence = jsonb_build_object(p_type, p_confidence),
        type_source = 'onboarding_chat'
  WHERE id = p_user_id;

  RETURN TRUE;
END;
$$;

REVOKE EXECUTE ON FUNCTION apply_onboarding_type(UUID, TEXT, NUMERIC) FROM authenticated, anon, PUBLIC;
GRANT EXECUTE ON FUNCTION apply_onboarding_type(UUID, TEXT, NUMERIC) TO service_role;

-- ── Rate limit: 3 onboarding-chat sessions/account/day (Section 4/10) ──────
--
-- A "session" is counted once, at the first turn-function call of a fresh
-- conversation (empty conversation_history) — not per message — matching
-- "3 sessions/account/day", not "3 messages/day".

CREATE TABLE IF NOT EXISTS onboarding_chat_sessions (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  count INT NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, date)
);

ALTER TABLE onboarding_chat_sessions ENABLE ROW LEVEL SECURITY;
-- No policies for regular users: only the service-role edge function
-- reads/writes this table (via the SECURITY DEFINER function below), same
-- as ai_message_counts.

CREATE OR REPLACE FUNCTION increment_onboarding_chat_session_count(p_user_id UUID, p_date DATE, p_limit INT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INT;
BEGIN
  INSERT INTO onboarding_chat_sessions (user_id, date, count)
  VALUES (p_user_id, p_date, 0)
  ON CONFLICT (user_id, date) DO NOTHING;

  SELECT count INTO v_count
  FROM onboarding_chat_sessions
  WHERE user_id = p_user_id AND date = p_date
  FOR UPDATE;

  IF v_count >= p_limit THEN
    RETURN FALSE;
  END IF;

  UPDATE onboarding_chat_sessions
    SET count = count + 1
  WHERE user_id = p_user_id AND date = p_date;

  RETURN TRUE;
END;
$$;

REVOKE EXECUTE ON FUNCTION increment_onboarding_chat_session_count(UUID, DATE, INT) FROM authenticated, anon, PUBLIC;
GRANT EXECUTE ON FUNCTION increment_onboarding_chat_session_count(UUID, DATE, INT) TO service_role;
