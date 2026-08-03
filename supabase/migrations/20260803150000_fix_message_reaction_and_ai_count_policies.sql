-- =============================================================
-- Socion — RLS policy fixes on message_reactions and ai_message_counts
-- Migration: 20260803150000_fix_message_reaction_and_ai_count_policies.sql
--
-- Found by auditing pg_policies for the tables listed in
-- supabase/PRODUCTION_ONLY_OBJECTS.md (issue #972). Both tables were created
-- by hand and neither their definitions nor their policies were ever
-- committed, so nothing here had been reviewed.
--
-- message_reactions
--   • reactions_select was USING (true). Combined with anon's SELECT grant
--     that made the table world-readable with no account: every row of
--     message_id / user_id / emoji across all private conversations. Reaction
--     metadata, not message content, but there is no reason for it to be
--     public.
--   • reactions_insert and reactions_delete compared user_id = auth.uid().
--     The column holds a public.users.id — that is what toggle_message_reaction()
--     inserts — while auth.uid() returns the auth id, so those two can never
--     match. They failed closed, which is why nothing was exploitable: direct
--     writes were simply impossible, and reactions work only because
--     toggle_message_reaction() is SECURITY DEFINER and bypasses RLS. The
--     sibling table founder_post_reactions already uses the correct pattern.
--
-- ai_message_counts
--   • RLS enabled with no policies at all, so it denied everything to anon and
--     authenticated. Fail-closed and safe, but two client reads sit against it
--     (HomeDashboard.jsx, SocionicsChat.jsx) and both silently got nothing,
--     leaving "AI used today" permanently at 0 for free members. Adds a
--     self-read policy. Writes deliberately get no policy: the count is
--     maintained only by increment_ai_message_count(), which is service_role
--     only (20260623126000) and RLS-exempt. A member can see their usage and
--     still cannot edit it.
--
-- The daily cap was never at risk. It is enforced server-side in the
-- chat-socionics edge function via that same row-locked RPC, so the broken
-- read cost an accurate indicator, not free messages.
--
-- Guarded on table existence: neither table is created by any migration, so
-- on a database rebuilt from this directory they do not exist yet and the
-- block is skipped rather than failing the replay. Committing the tables
-- themselves needs their real definitions dumped from production — tracked in
-- PRODUCTION_ONLY_OBJECTS.md.
-- =============================================================

do $$
begin
  if to_regclass('public.message_reactions') is null then
    raise notice 'message_reactions absent — skipping (see supabase/PRODUCTION_ONLY_OBJECTS.md)';
  else
    execute 'drop policy if exists reactions_select on public.message_reactions';
    execute $p$
      create policy reactions_select on public.message_reactions
        for select using (
          exists (
            select 1
            from messages msg
            join matches m on m.id = msg.match_id
            where msg.id = message_reactions.message_id
              and (select id from users where auth_id = auth.uid())
                    in (m.user_a_id, m.user_b_id)
          )
        )
    $p$;

    execute 'drop policy if exists reactions_insert on public.message_reactions';
    execute $p$
      create policy reactions_insert on public.message_reactions
        for insert with check (
          user_id = (select id from users where auth_id = auth.uid())
          and exists (
            select 1
            from messages msg
            join matches m on m.id = msg.match_id
            where msg.id = message_reactions.message_id
              and (select id from users where auth_id = auth.uid())
                    in (m.user_a_id, m.user_b_id)
          )
        )
    $p$;

    execute 'drop policy if exists reactions_delete on public.message_reactions';
    execute $p$
      create policy reactions_delete on public.message_reactions
        for delete using (
          user_id = (select id from users where auth_id = auth.uid())
        )
    $p$;
  end if;
end $$;


do $$
begin
  if to_regclass('public.ai_message_counts') is null then
    raise notice 'ai_message_counts absent — skipping (see supabase/PRODUCTION_ONLY_OBJECTS.md)';
  else
    execute 'drop policy if exists ai_message_counts_select_own on public.ai_message_counts';
    execute $p$
      create policy ai_message_counts_select_own on public.ai_message_counts
        for select using (
          user_id = (select id from users where auth_id = auth.uid())
        )
    $p$;
  end if;
end $$;
