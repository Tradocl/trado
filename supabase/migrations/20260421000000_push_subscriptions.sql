-- Push notification subscriptions (web push + native FCM tokens)
create table if not exists public.push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  endpoint    text not null unique,
  p256dh      text,
  auth        text,
  platform    text not null default 'web', -- 'web' | 'android' | 'ios'
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;

-- Users can only manage their own subscriptions
create policy "Users manage own push subscriptions"
  on public.push_subscriptions
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Service role can read all (for edge functions)
create policy "Service role full access"
  on public.push_subscriptions
  for all
  to service_role
  using (true)
  with check (true);

-- Index for fast user lookup
create index if not exists push_subscriptions_user_id_idx
  on public.push_subscriptions(user_id);

-- Auto-update updated_at
create or replace function public.update_push_subscription_timestamp()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger push_subscriptions_updated_at
  before update on public.push_subscriptions
  for each row execute function public.update_push_subscription_timestamp();
