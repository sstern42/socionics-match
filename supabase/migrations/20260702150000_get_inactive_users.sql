-- Migration: 20260702150000_get_inactive_users.sql
-- Adds get_inactive_users() RPC backing the "Inactive users" admin panel
-- (issue #865). Export only — no bulk-send infra exists yet, and there is
-- no marketing-consent/opt-in column on users, so any actual re-engagement
-- campaign needs that decision made separately before sending to this list.

create or replace function get_inactive_users(days_threshold int default 30)
returns table (
  id uuid,
  email text,
  name text,
  type text,
  created_at timestamptz,
  last_active timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from users
    where auth_id = auth.uid()
      and profile_data->>'role' = 'founder'
  ) then
    raise exception 'Forbidden';
  end if;

  -- Explicit casts: RETURN QUERY requires exact type-OID matches against the
  -- declared columns above. auth.users.email is varchar(255), not text, so
  -- without the cast every call fails with "structure of query does not
  -- match function result type".
  return query
    select
      u.id,
      au.email::text as email,
      (u.profile_data->>'name')::text as name,
      u.type::text as type,
      u.created_at::timestamptz as created_at,
      u.last_active::timestamptz as last_active
    from users u
    join auth.users au on au.id = u.auth_id
    where u.last_active < now() - (days_threshold || ' days')::interval
      and not exists (
        select 1 from banned_emails be
        where lower(be.email) = lower(au.email)
      )
    order by u.last_active asc;
end;
$$;

revoke all on function get_inactive_users(int) from public, anon;
grant execute on function get_inactive_users(int) to authenticated;
