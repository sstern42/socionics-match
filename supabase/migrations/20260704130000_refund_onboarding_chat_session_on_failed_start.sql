-- Refund a free typing-chat "try" when the session-opening turn fails.
--
-- increment_onboarding_chat_session_count (migration 20260702160000) charges a
-- session atomically at the *start* of a conversation — before the opening
-- question is generated — so the daily limit can't be raced past. The trade-off
-- is that if that first Anthropic call then fails, the member has been charged a
-- try but received literally nothing (see onboarding-typing-turn: the charge
-- happens on the empty-history call, ahead of the model request). Reported in
-- the wild as "it crashes and now all my tries for the day are used up."
--
-- This companion function lets onboarding-typing-turn hand that try back on the
-- opening turn's failure paths. It is deliberately scoped to that single case:
-- once the conversation is underway the member has actually been served, so a
-- refund past the first turn would just be an infinite-retry hole. GREATEST(...,
-- 0) floors the count so a stray/duplicate refund can never drive it negative
-- (which would silently grant an extra try). Service-role only, same as the
-- increment — regular users never touch this table.

CREATE OR REPLACE FUNCTION refund_onboarding_chat_session_count(p_user_id UUID, p_date DATE)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE onboarding_chat_sessions
    SET count = GREATEST(count - 1, 0)
  WHERE user_id = p_user_id AND date = p_date;
END;
$$;

REVOKE EXECUTE ON FUNCTION refund_onboarding_chat_session_count(UUID, DATE) FROM authenticated, anon, PUBLIC;
GRANT  EXECUTE ON FUNCTION refund_onboarding_chat_session_count(UUID, DATE) TO service_role;
