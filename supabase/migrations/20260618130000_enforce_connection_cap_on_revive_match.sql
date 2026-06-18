-- revive_match() was created directly in the live database (not tracked in
-- this repo) and reviving an unmatched pair UPDATEs the existing matches row
-- rather than inserting a new one. That meant it completely bypassed the
-- connection-cap enforcement added in 20260618_enforce_connection_cap_both_parties.sql
-- (which only covers INSERT via RLS policy + the swipe trigger).
--
-- This brings revive_match() into version control and adds the same
-- can_add_connection() check for both participants before reviving.

CREATE OR REPLACE FUNCTION public.revive_match(p_user_a uuid, p_user_b uuid, p_relation_type text, p_purpose text DEFAULT 'dating'::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id UUID;
  v_match_id UUID;
BEGIN
  SELECT id INTO v_user_id FROM users WHERE auth_id = auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No profile for current user';
  END IF;

  -- Caller must be one of the two people in the pair being (re)connected.
  IF v_user_id <> p_user_a AND v_user_id <> p_user_b THEN
    RAISE EXCEPTION 'Not a participant in this match';
  END IF;

  -- Find an unmatched row between this pair, in either column order.
  SELECT id INTO v_match_id
  FROM matches
  WHERE unmatched_at IS NOT NULL
    AND ( (user_a_id = p_user_a AND user_b_id = p_user_b)
       OR (user_a_id = p_user_b AND user_b_id = p_user_a) )
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_match_id IS NULL THEN
    RETURN NULL;  -- nothing to revive; caller inserts a fresh match
  END IF;

  -- Respect the free-tier connection cap on both sides before reviving.
  IF NOT can_add_connection(p_user_a) OR NOT can_add_connection(p_user_b) THEN
    RAISE EXCEPTION 'connection cap reached for one or more participants';
  END IF;

  UPDATE matches
     SET unmatched_at  = NULL,
         unmatched_by  = NULL,
         relation_type = p_relation_type,
         purpose       = p_purpose
   WHERE id = v_match_id;

  RETURN v_match_id;
END;
$function$;
