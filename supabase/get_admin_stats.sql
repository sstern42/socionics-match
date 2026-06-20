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
    'auth_users',        (select count(*) from auth.users),
    'connections',       (select count(*) from matches),
    'connections_today', (select count(*) from matches where created_at >= current_date),
    'messages',          (select count(*) from messages),
    'messages_today',    (select count(*) from messages where created_at >= current_date),
    'assessments',       (select count(*) from type_assessments),
    'cooloffs',          (
                           select count(*) from blocks
                           where expires_at is not null and expires_at > now()
                         ),
    'reports',           (
                           select count(*) from blocks
                           where reason is not null
                         ),
    'active_7d',         (
                       select count(*) from users
                       where last_active >= now() - interval '7 days'
                         ),
    'inactive',          (
                       select count(*) from users
                       where last_active < now() - interval '7 days'
                         ),
    'messaging_active',  (
                           select count(distinct sender_id) from messages
                           where created_at >= now() - interval '7 days'
                         ),
    'recent_blocks',     (
                           select coalesce(jsonb_agg(b order by b.created_at desc), '[]')
                           from (
                             select bl.id, bl.blocker_id, bl.blocked_id, bl.reason, bl.expires_at,
                                    bl.created_at, bl.lifted_at,
                                    case when bl.expires_at is not null then 'cooloff' else 'block' end as type,
                                    blocker.profile_data->>'name' as blocker_name,
                                    blocked.profile_data->>'name' as blocked_name
                             from blocks bl
                             left join users blocker on blocker.id = bl.blocker_id
                             left join users blocked on blocked.id = bl.blocked_id
                             order by bl.created_at desc
                             limit 20
                           ) b
                         ),
    'rel_counts',        (
                           select coalesce(jsonb_object_agg(relation_type, cnt), '{}')
                           from (
                             select relation_type, count(*) as cnt
                             from matches
                             group by relation_type
                           ) r
                         ),
    'rel_ratings',       (
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
    'feedback_count',    (
                           select count(*) from matches
                           where feedback_a is not null or feedback_b is not null
                         ),
    'total_matches',     (select count(*) from matches),
    'total_swipes',      (select count(*) from swipes),
    'right_swipes',      (select count(*) from swipes where direction = 'right'),
    'left_swipes',       (select count(*) from swipes where direction = 'left'),
    'swipe_matches',     (select count(*) from matches
                          where exists (
                            select 1 from swipes
                            where swipes.swiper_id = matches.user_a_id
                              and swipes.target_id = matches.user_b_id
                              and swipes.direction = 'right'
                          )),
    'comments',          (
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
                         ),
    'top_referrers',     (
                           select coalesce(jsonb_agg(row order by row.qualified_count desc), '[]')
                           from (
                             select
                               u.id,
                               u.profile_data->>'name' as name,
                               u.referral_code,
                               u.referral_count_qualified as qualified_count,
                               (select count(*) from referrals r where r.referrer_id = u.id) as total_count,
                               u.referral_premium_days_granted as premium_days_granted,
                               case when u.referral_premium_until is not null and u.referral_premium_until > now()
                                 then ceil(extract(epoch from (u.referral_premium_until - now())) / 86400)
                                 else 0
                               end as premium_days_left,
                               (u.is_founding_member or u.plan_status in ('active', 'past_due')) as already_premium
                             from users u
                             where u.referral_count_qualified > 0
                             order by u.referral_count_qualified desc
                             limit 10
                           ) row
                         ),
    'board_reports',     (
                           select coalesce(jsonb_agg(r order by r.created_at desc), '[]')
                           from (
                             select br.id, br.post_id, br.comment_id, br.reason,
                                    br.created_at, br.resolved_at, br.resolution,
                                    reporter.profile_data->>'name' as reporter_name,
                                    coalesce(post.title, '') as post_title,
                                    coalesce(post.content, comment.content) as content,
                                    coalesce(post_author.profile_data->>'name', comment_author.profile_data->>'name') as author_name,
                                    b.slug as board_slug,
                                    coalesce(post.board_id, comment_post.board_id) as board_id
                             from board_reports br
                             left join users reporter on reporter.id = br.reporter_id
                             left join board_posts post on post.id = br.post_id
                             left join users post_author on post_author.id = post.author_id
                             left join board_comments comment on comment.id = br.comment_id
                             left join users comment_author on comment_author.id = comment.author_id
                             left join board_posts comment_post on comment_post.id = comment.post_id
                             left join boards b on b.id = coalesce(post.board_id, comment_post.board_id)
                             where br.resolved_at is null
                             order by br.created_at desc
                             limit 50
                           ) r
                         ),
    'referral_rewarded', (
                           select coalesce(jsonb_agg(row order by row.days_left desc), '[]')
                           from (
                             select
                               u.id,
                               u.profile_data->>'name' as name,
                               u.referral_premium_days_granted as days_granted,
                               ceil(extract(epoch from (u.referral_premium_until - now())) / 86400) as days_left,
                               case when u.referral_count_qualified > 0 and u.referred_by_user_id is not null then 'both'
                                    when u.referral_count_qualified > 0 then 'referrer'
                                    when u.referred_by_user_id is not null then 'referee'
                                    else 'referrer'
                               end as role
                             from users u
                             where u.referral_premium_until is not null
                               and u.referral_premium_until > now()
                             order by days_left desc
                             limit 20
                           ) row
                         )
  ) into result;

  return result;
end;
$$;
