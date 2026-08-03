-- -----------------------------------------------------------------------
-- get_user_relation_stats
-- Returns one row per match for the given user, with enough data for
-- the frontend to compute display relation (handles MATRIX asymmetry)
-- and aggregate by relation type.
-- -----------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_user_relation_stats(p_user_id UUID)
RETURNS TABLE (
  relation_type   TEXT,
  is_user_a       BOOLEAN,
  other_type      TEXT,
  rating_given    NUMERIC,
  rating_received NUMERIC,
  message_count   BIGINT
)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT
    m.relation_type,
    (m.user_a_id = p_user_id)                                          AS is_user_a,
    CASE WHEN m.user_a_id = p_user_id THEN ub.type ELSE ua.type END   AS other_type,
    CASE
      WHEN m.user_a_id = p_user_id THEN (m.feedback_a->>'rating')::numeric
      ELSE                               (m.feedback_b->>'rating')::numeric
    END                                                                 AS rating_given,
    CASE
      WHEN m.user_a_id = p_user_id THEN (m.feedback_b->>'rating')::numeric
      ELSE                               (m.feedback_a->>'rating')::numeric
    END                                                                 AS rating_received,
    COALESCE(mc.cnt, 0)                                                AS message_count
  FROM matches m
  JOIN users ua ON ua.id = m.user_a_id
  JOIN users ub ON ub.id = m.user_b_id
  LEFT JOIN (
    SELECT match_id, COUNT(*) AS cnt
    FROM messages
    GROUP BY match_id
  ) mc ON mc.match_id = m.id
  WHERE (m.user_a_id = p_user_id OR m.user_b_id = p_user_id)
    AND m.unmatched_at IS NULL
$$;

-- -----------------------------------------------------------------------
-- get_global_relation_averages
-- Public aggregate — safe to expose to any authenticated user.
-- Averages each match's two-sided rating to produce a single
-- per-relation-type mean, matching the logic in get_admin_stats.
-- -----------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_global_relation_averages()
RETURNS TABLE (relation_type TEXT, avg_rating NUMERIC, rated_count BIGINT)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  WITH per_match AS (
    SELECT
      relation_type,
      CASE
        WHEN feedback_a IS NOT NULL AND feedback_b IS NOT NULL
          THEN ((feedback_a->>'rating')::numeric + (feedback_b->>'rating')::numeric) / 2
        WHEN feedback_a IS NOT NULL THEN (feedback_a->>'rating')::numeric
        WHEN feedback_b IS NOT NULL THEN (feedback_b->>'rating')::numeric
      END AS match_avg
    FROM matches
    WHERE unmatched_at IS NULL
      AND (feedback_a IS NOT NULL OR feedback_b IS NOT NULL)
  )
  SELECT
    relation_type,
    ROUND(AVG(match_avg), 2) AS avg_rating,
    COUNT(*)                 AS rated_count
  FROM per_match
  GROUP BY relation_type
$$;
