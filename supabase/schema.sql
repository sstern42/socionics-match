-- Socion MVP schema
-- Run this in your Supabase SQL editor

create table users (
  id uuid primary key default gen_random_uuid(),
  auth_id uuid references auth.users(id) on delete cascade,
  type text not null,
  type_confidence jsonb,         -- { ILE: 0.7, LII: 0.2, ... }
  purpose text[] default array['dating'],
  relation_preferences text[],   -- e.g. ['DUAL','ACTIVITY','MIRROR']
  location text,
  profile_data jsonb,            -- name, bio, age, etc.
  created_at timestamptz default now()
);

create table type_assessments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  responses jsonb not null,
  computed_type_distribution jsonb not null,
  version text not null default 'slide-1.0',
  created_at timestamptz default now()
);

create table matches (
  id uuid primary key default gen_random_uuid(),
  user_a_id uuid references users(id) on delete cascade,
  user_b_id uuid references users(id) on delete cascade,
  relation_type text not null,
  purpose text not null default 'dating',
  created_at timestamptz default now(),
  feedback_a jsonb,
  feedback_b jsonb
);

create table messages (
  id uuid primary key default gen_random_uuid(),
  match_id uuid references matches(id) on delete cascade,
  sender_id uuid references users(id) on delete cascade,
  content text not null,
  created_at timestamptz default now()
);

-- Enable Row Level Security
alter table users enable row level security;
alter table type_assessments enable row level security;
alter table matches enable row level security;
alter table messages enable row level security;

-- Basic RLS: users can read/write their own data
create policy "Users own their profile" on users
  for all using (auth.uid() = auth_id);

create policy "Users own their assessments" on type_assessments
  for all using (
    user_id in (select id from users where auth_id = auth.uid())
  );
