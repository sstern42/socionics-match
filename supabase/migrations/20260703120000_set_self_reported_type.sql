-- Issue #866: fix stale type_source after self-selecting from the typing
-- chat's skip path.
--
-- TypingChat.jsx's self-select path calls updateProfileData(), which only
-- ever touches `type` (never `type_source` -- matching ProfileEdit.jsx's
-- existing dropdown, which has the same gap). type_source is pinned
-- against direct client UPDATEs by protect_sensitive_user_columns()
-- (20260702160000/20260702170000), so if an account previously completed
-- the chat (type_source = 'onboarding_chat') and then self-selects a
-- different type afterward, type_source is stuck at 'onboarding_chat' --
-- which is exactly what surfaced as the results screen still showing the
-- "thanks for completing the chat" Premium coupon banner after a skip.
--
-- Fixed with a small SECURITY DEFINER RPC, callable directly by the
-- authenticated user themselves (derives the caller from auth.uid(), same
-- pattern as attribute_referral/grant_referral_reward in
-- 20260623123000 -- no p_user_id param to avoid a caller spoofing another
-- user's id). Matches ProfileEdit.jsx's existing precedent of not
-- refusing to overwrite a paid_verified/community_verified type here --
-- that protection is specific to apply_onboarding_type() (Locked decision
-- #5: a *chat-derived* read must never overwrite verified status), not to
-- every direct self-edit of one's own type, which the app already allows
-- unprotected elsewhere.

CREATE OR REPLACE FUNCTION set_self_reported_type(p_type TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID;
BEGIN
  IF p_type NOT IN (
    'ILE', 'LII', 'ESE', 'SEI', 'EIE', 'LSI', 'SLE', 'IEI',
    'SEE', 'ESI', 'LIE', 'ILI', 'IEE', 'EII', 'LSE', 'SLI'
  ) THEN
    RAISE EXCEPTION 'set_self_reported_type: invalid Socionics type code %', p_type;
  END IF;

  SELECT id INTO v_caller_id FROM users WHERE auth_id = auth.uid();
  IF v_caller_id IS NULL THEN
    RETURN;
  END IF;

  UPDATE users
    SET type = p_type,
        type_confidence = jsonb_build_object(p_type, 1.0),
        type_source = 'self_reported'
  WHERE id = v_caller_id;
END;
$$;
