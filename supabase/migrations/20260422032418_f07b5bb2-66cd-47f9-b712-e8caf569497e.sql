create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text,
  auth text,
  platform text not null default 'web',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'push_subscriptions' and policyname = 'Users manage own push subscriptions'
  ) then
    execute 'create policy "Users manage own push subscriptions" on public.push_subscriptions for all using (auth.uid() = user_id) with check (auth.uid() = user_id)';
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'push_subscriptions' and policyname = 'Service role full access'
  ) then
    execute 'create policy "Service role full access" on public.push_subscriptions for all to service_role using (true) with check (true)';
  end if;
end $$;

create index if not exists push_subscriptions_user_id_idx
  on public.push_subscriptions(user_id);