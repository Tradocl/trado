create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity text,
  entity_id text,
  metadata jsonb default '{}',
  created_at timestamptz not null default now()
);

alter table public.audit_logs enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'audit_logs' and policyname = 'Users read own audit logs'
  ) then
    execute 'create policy "Users read own audit logs" on public.audit_logs for select using (auth.uid() = user_id)';
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'audit_logs' and policyname = 'Service role write audit logs'
  ) then
    execute 'create policy "Service role write audit logs" on public.audit_logs for insert to service_role with check (true)';
  end if;
end $$;

create index if not exists audit_logs_user_id_idx on public.audit_logs(user_id);
create index if not exists audit_logs_created_at_idx on public.audit_logs(created_at desc);
