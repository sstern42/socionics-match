-- Push notification subscriptions
-- One subscription per user (latest device/browser wins on upsert)

create table if not exists push_subscriptions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users(id) on delete cascade not null unique,
  subscription jsonb not null,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

alter table push_subscriptions enable row level security;

create policy "Users manage own push subscriptions"
  on push_subscriptions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
