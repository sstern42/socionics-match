-- Denormalise the last message onto matches (fixes #927).
--
-- getMatches() embedded the FULL message set of every conversation
-- (`messages ( content, created_at, sender_id )`, no limit) purely to derive
-- each match's most recent message and to sort the match list. Every load of
-- the Messages page therefore downloaded every message across every match, so
-- bandwidth/parse cost grew linearly with conversation length.
--
-- Fix: keep a `last_message` jsonb ({content, created_at, sender_id}) on
-- matches, maintained by an AFTER INSERT trigger on messages, so getMatches
-- reads one row per match instead of the whole history.

alter table matches add column if not exists last_message jsonb;

-- Keep matches.last_message in sync as messages arrive. Guarded so an
-- out-of-order insert (e.g. a bulk import with an older created_at) can't
-- clobber a newer last_message; normal appends (created_at defaults to now())
-- always pass the guard.
create or replace function update_match_last_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update matches
  set last_message = jsonb_build_object(
        'content',    NEW.content,
        'created_at', NEW.created_at,
        'sender_id',  NEW.sender_id
      )
  where id = NEW.match_id
    and (
      last_message is null
      or (last_message->>'created_at')::timestamptz <= NEW.created_at
    );
  return NEW;
end;
$$;

drop trigger if exists on_message_set_last on messages;
create trigger on_message_set_last
  after insert on messages
  for each row
  execute function update_match_last_message();

-- Backfill existing matches from the latest message in each conversation.
update matches m
set last_message = sub.lm
from (
  select distinct on (match_id)
    match_id,
    jsonb_build_object(
      'content',    content,
      'created_at', created_at,
      'sender_id',  sender_id
    ) as lm
  from messages
  order by match_id, created_at desc
) sub
where m.id = sub.match_id;
