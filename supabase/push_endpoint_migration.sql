-- Add endpoint column extracted from subscription JSONB
-- Allows proper per-device upsert

alter table push_subscriptions add column if not exists endpoint text;

-- Populate from existing rows
update push_subscriptions
set endpoint = subscription->>'endpoint'
where endpoint is null;

-- Add unique constraint
alter table push_subscriptions drop constraint if exists push_subscriptions_endpoint_key;
alter table push_subscriptions add constraint push_subscriptions_endpoint_key unique (endpoint);

-- Set not null after populating
alter table push_subscriptions alter column endpoint set not null;
