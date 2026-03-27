-- Run in Supabase SQL editor
-- Replaces the existing get_admin_stats function with site-wide match aggregations

create or replace function get_admin_stats()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  select jsonb_build_object(
    -- Existing stats
    'connections',    (select count(*) from matches),
    'messages',       (select count(*) from messages),
    'assessments',    (select count(*) from type_assessments),
    'cooloffs',       (
                        select count(*) from blocks
                        where expires_at is not null and expires_at > now()
                      ),
    'reports',        (
                        select count(*) from blocks
                        where reason is not null
                      ),
    'recent_blocks',  (
                        select coalesce(jsonb_agg(b order by b.created_at desc), '[]')
                        from (
                          select id, blocker_id, blocked_id, reason, expires_at, created_at,
                                 case when expires_at is not null then 'cooloff' else 'block' end as type
                          from blocks
                          order by created_at desc
                          limit 20
                        ) b
                      ),

    -- Site-wide match breakdown by relation type
    'rel_counts',     (
                        select coalesce(jsonb_object_agg(relation_type, cnt), '{}')
                        from (
                          select relation_type, count(*) as cnt
                          from matches
                          group by relation_type
                        ) r
                      ),

    -- Site-wide feedback: ratings per relation type
    'rel_ratings',    (
                        select coalesce(jsonb_agg(row), '[]')
                        from (
                          select
                            relation_type as rel,
                            round(avg(rating), 1) as avg,
                            count(*) as count
                          from (
                            select relation_type,
                                   (feedback_a->>'rating')::numeric as rating
                            from matches where feedback_a->>'rating' is not null
                            union all
                            select relation_type,
                                   (feedback_b->>'rating')::numeric as rating
                            from matches where feedback_b->>'rating' is not null
                          ) ratings
                          group by relation_type
                          order by avg desc
                        ) row
                      ),

    -- Feedback coverage
    'feedback_count', (
                        select count(*) from matches
                        where feedback_a is not null or feedback_b is not null
                      ),
    'total_matches',  (select count(*) from matches),

    -- Site-wide comments
    'comments',       (
                        select coalesce(jsonb_agg(row order by submitted_at desc), '[]')
                        from (
                          select relation_type as rel,
                                 (feedback_a->>'rating')::int as rating,
                                 feedback_a->>'comment' as comment,
                                 feedback_a->>'submitted_at' as submitted_at
                          from matches
                          where feedback_a->>'comment' is not null
                          union all
                          select relation_type as rel,
                                 (feedback_b->>'rating')::int as rating,
                                 feedback_b->>'comment' as comment,
                                 feedback_b->>'submitted_at' as submitted_at
                          from matches
                          where feedback_b->>'comment' is not null
                        ) row
                      )
  ) into result;

  return result;
end;
$$;
