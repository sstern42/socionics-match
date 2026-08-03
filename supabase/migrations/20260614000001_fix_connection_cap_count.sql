-- Fix can_add_connection() to only count active (non-unmatched) connections.
-- Previously it counted all match rows including soft-deleted ones (unmatched_at IS NOT NULL),
-- meaning disconnecting from a user didn't free up a slot for free-tier users.

CREATE OR REPLACE FUNCTION can_add_connection(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN is_premium(p_user_id) THEN TRUE
    WHEN (
      SELECT count(*)
      FROM matches
      WHERE (user_a_id = p_user_id OR user_b_id = p_user_id)
        AND unmatched_at IS NULL
    ) < 3 THEN TRUE
    ELSE FALSE
  END;
$$;
