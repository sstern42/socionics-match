-- Add verified_by column to users table
-- Stores the name of the person who verified the type (e.g. 'Spencer', 'Uncle_Sam')
-- Null = unverified

alter table users add column if not exists verified_by text default null;
