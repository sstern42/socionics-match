-- Security fix: log_profile_view() and get_user_relation_stats() both
-- accept a user ID parameter with no validation that it matches the
-- caller, so any authenticated user could call them directly with an
-- arbitrary ID — spoofing/polluting profile-view history for any user
-- (log_profile_view), or reading another user's private per-match
-- relationship stats (get_user_relation_stats, intended by
-- src/components/profile/DynamicsTab.jsx to show only the viewer's own
-- dynamics).
--
-- Fixed by deriving the relevant ID from auth.uid() server-side. Both
-- signatures are kept unchanged (the now-unused p_viewer / p_user_id
-- parameters are ignored) so existing call sites in
-- src/lib/profileViews.js and DynamicsTab.jsx need no changes.

create or replace function log_profile_view(p_viewer uuid, p_viewed uuid)
returns void
language plpgsql security definer
as $$
declare
  v_viewer_id uuid;
begin
  select id into v_viewer_id from users where auth_id = auth.uid();
  if v_viewer_id is null or v_viewer_id = p_viewed then return; end if;
  if exists (
    select 1 from profile_views
    where viewer_id = v_viewer_id
      and viewed_id  = p_viewed
      and viewed_at  > now() - interval '1 hour'
  ) then return; end if;
  insert into profile_views (viewer_id, viewed_id) values (v_viewer_id, p_viewed);
end;
$$;


create or replace function get_user_relation_stats(p_user_id uuid)
returns table (
  relation_type   text,
  is_user_a       boolean,
  other_type      text,
  rating_given    numeric,
  rating_received numeric,
  message_count   bigint
)
language sql stable security definer
as $$
  select
    m.relation_type,
    (m.user_a_id = v.id)                                          as is_user_a,
    case when m.user_a_id = v.id then ub.type else ua.type end   as other_type,
    case
      when m.user_a_id = v.id then (m.feedback_a->>'rating')::numeric
      else                          (m.feedback_b->>'rating')::numeric
    end                                                                 as rating_given,
    case
      when m.user_a_id = v.id then (m.feedback_b->>'rating')::numeric
      else                          (m.feedback_a->>'rating')::numeric
    end                                                                 as rating_received,
    coalesce(mc.cnt, 0)                                                as message_count
  from (select id from users where auth_id = auth.uid()) v
  join matches m on (m.user_a_id = v.id or m.user_b_id = v.id)
  join users ua on ua.id = m.user_a_id
  join users ub on ub.id = m.user_b_id
  left join (
    select match_id, count(*) as cnt
    from messages
    group by match_id
  ) mc on mc.match_id = m.id
  where m.unmatched_at is null
$$;
