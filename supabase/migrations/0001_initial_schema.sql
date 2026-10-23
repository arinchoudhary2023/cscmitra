-- CSCDigitalMitra V4.0 initial schema for Supabase PostgreSQL.
-- Run in Supabase SQL Editor or via Supabase CLI migrations.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null unique,
  role text not null check (role in ('admin','agent','user')),
  status text not null default 'active' check (status in ('active','locked','restricted','disabled')),
  wallet_balance bigint not null default 0 check (wallet_balance >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  category text,
  is_public boolean not null default true,
  is_archived boolean not null default false,
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.agent_service_permissions (
  agent_id uuid not null references public.profiles(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete cascade,
  granted_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (agent_id, service_id)
);

create table if not exists public.agent_feature_permissions (
  agent_id uuid not null references public.profiles(id) on delete cascade,
  feature_key text not null,
  is_enabled boolean not null default true,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (agent_id, feature_key)
);

create table if not exists public.ekyc_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  full_name text not null,
  phone text not null check (phone ~ '^[0-9]{10}$'),
  address text not null,
  aadhaar_reference text not null,
  bank_name text not null,
  ifsc text not null,
  account_reference text not null,
  consented_at timestamptz not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz not null default now()
);

create table if not exists public.service_requests (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles(id) on delete restrict,
  agent_id uuid references public.profiles(id) on delete set null,
  service_id uuid references public.services(id) on delete set null,
  service_name_snapshot text not null,
  title text not null,
  description text,
  amount bigint not null default 0 check (amount >= 0),
  status text not null default 'open' check (status in ('open','accepted','in_progress','completed','cancelled','rejected')),
  assigned_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.service_request_history (
  id bigint generated always as identity primary key,
  request_id uuid not null references public.service_requests(id) on delete cascade,
  changed_by uuid references public.profiles(id) on delete set null,
  old_status text,
  new_status text not null,
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.fund_requests (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.profiles(id) on delete restrict,
  amount bigint not null check (amount > 0 and amount <= 10000000),
  reason text,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by uuid references public.profiles(id) on delete set null,
  decision_note text
);

create table if not exists public.wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete restrict,
  amount bigint not null check (amount <> 0),
  transaction_type text not null check (transaction_type in ('fund_credit','admin_adjustment','service_payment','refund','correction')),
  description text not null,
  fund_request_id uuid unique references public.fund_requests(id) on delete restrict,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  kind text not null,
  title text not null,
  body text not null,
  metadata jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  price bigint not null default 0 check (price >= 0),
  description text,
  features jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists profiles_role_idx on public.profiles(role);
create index if not exists service_requests_customer_idx on public.service_requests(customer_id, created_at desc);
create index if not exists service_requests_agent_idx on public.service_requests(agent_id, status, created_at desc);
create index if not exists fund_requests_agent_idx on public.fund_requests(agent_id, created_at desc);
create index if not exists fund_requests_status_idx on public.fund_requests(status, created_at desc);
create index if not exists wallet_transactions_user_idx on public.wallet_transactions(user_id, created_at desc);
create index if not exists notifications_user_idx on public.notifications(user_id, created_at desc);
create index if not exists audit_logs_created_idx on public.audit_logs(created_at desc);

-- Deny direct browser access by default. The server API uses the service-role key
-- after authenticating the user's access token and checking the role in profiles.
do $$
declare t text;
begin
  foreach t in array array[
    'profiles','services','agent_service_permissions','agent_feature_permissions',
    'ekyc_submissions','service_requests','service_request_history','fund_requests',
    'wallet_transactions','notifications','plans','audit_logs'
  ] loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- Explicitly grant the privileged server role access to these API-managed tables.
-- Do not grant anon/authenticated access here; browser requests must go through the API.
grant usage on schema public to service_role;
grant all privileges on table
  public.profiles, public.services, public.agent_service_permissions,
  public.agent_feature_permissions, public.ekyc_submissions, public.service_requests,
  public.service_request_history, public.fund_requests, public.wallet_transactions,
  public.notifications, public.plans, public.audit_logs
  to service_role;
grant usage, select on all sequences in schema public to service_role;

-- Atomic fund decision. Repeated decisions cannot issue a second credit.
create or replace function public.decide_fund_request(
  p_request_id uuid,
  p_decision text,
  p_decided_by uuid,
  p_note text default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  req public.fund_requests%rowtype;
  actor public.profiles%rowtype;
begin
  if p_decision not in ('approved','rejected') then
    return jsonb_build_object('ok', false, 'error', 'Invalid decision.');
  end if;
  select * into actor from public.profiles where id = p_decided_by for share;
  if not found or actor.role <> 'admin' or actor.status <> 'active' then
    return jsonb_build_object('ok', false, 'error', 'Administrator permission required.');
  end if;
  select * into req from public.fund_requests where id = p_request_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Fund request not found.');
  end if;
  if req.status <> 'pending' then
    return jsonb_build_object('ok', false, 'error', 'This request has already been decided.');
  end if;

  update public.fund_requests
    set status = p_decision, decided_at = now(), decided_by = p_decided_by, decision_note = p_note
    where id = p_request_id;

  if p_decision = 'approved' then
    update public.profiles set wallet_balance = wallet_balance + req.amount, updated_at = now()
      where id = req.agent_id and role = 'agent' and status = 'active';
    if not found then
      raise exception 'Agent account is missing or inactive.';
    end if;
    insert into public.wallet_transactions(user_id, amount, transaction_type, description, fund_request_id, created_by)
      values (req.agent_id, req.amount, 'fund_credit', 'Funds approved by administrator', req.id, p_decided_by);
    insert into public.notifications(user_id, kind, title, body, metadata)
      values (req.agent_id, 'fund_request_approved', 'Fund request approved', 'Your requested funds were added to your wallet.', jsonb_build_object('fund_request_id', req.id, 'amount', req.amount));
  else
    insert into public.notifications(user_id, kind, title, body, metadata)
      values (req.agent_id, 'fund_request_rejected', 'Fund request rejected', 'Your fund request was rejected by the administrator.', jsonb_build_object('fund_request_id', req.id));
  end if;
  return jsonb_build_object('ok', true, 'status', p_decision, 'amount', req.amount);
end;
$$;

revoke all on function public.decide_fund_request(uuid, text, uuid, text) from public, anon, authenticated;
grant execute on function public.decide_fund_request(uuid, text, uuid, text) to service_role;

-- Seed the two priority services in the requested order.
insert into public.services(slug, name, description, category, is_public, sort_order)
values
  ('aadhaar','Aadhaar','Aadhaar-related assistance and guidance.','Documents and identity',true,1),
  ('net-banking','Net Banking','Net banking assistance and account access guidance.','Banking and payments',true,2)
on conflict (slug) do update set name = excluded.name, description = excluded.description, is_public = true, sort_order = excluded.sort_order;

insert into public.plans(slug, name, price, description, features)
values
  ('starter','Starter',499,'Essential service access','["Core service requests","Basic dashboard access","Standard support"]'::jsonb),
  ('professional','Professional',999,'Expanded service access','["Expanded service access","Priority request handling","Transaction history"]'::jsonb),
  ('premium','Premium',1999,'Full premium package','["Premium service package","Priority support","Advanced dashboard access"]'::jsonb)
on conflict (slug) do nothing;
