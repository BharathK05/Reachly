-- Reachly — Initial Schema Migration
-- Run this in the Supabase SQL editor or via: supabase db push

create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  phone text,
  tier text check (tier in ('Gold', 'Silver', 'Bronze')),
  total_spend numeric default 0,
  order_count int default 0,
  last_purchase_date date,
  days_since_last_purchase int,
  created_at timestamptz default now()
);

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references customers(id) on delete cascade,
  product text,
  qty int,
  price numeric,
  order_date date,
  created_at timestamptz default now()
);

create table if not exists campaigns (
  id uuid primary key default gen_random_uuid(),
  goal text not null,
  budget numeric not null,
  channel text,
  status text default 'draft',
  audience_criteria jsonb,
  audience_size int,
  message text,
  predictions jsonb,
  estimated_cost numeric,
  created_at timestamptz default now()
);

create table if not exists communication_logs (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references campaigns(id) on delete cascade,
  customer_id uuid references customers(id) on delete cascade,
  customer_name text,
  channel text,
  status text default 'pending',
  sent_at timestamptz
);

create table if not exists communication_events (
  id uuid primary key default gen_random_uuid(),
  log_id uuid references communication_logs(id) on delete cascade,
  event_type text check (event_type in ('sent', 'delivered', 'opened', 'clicked', 'failed')),
  occurred_at timestamptz default now()
);

-- Indexes for performance
create index if not exists idx_customers_tier on customers(tier);
create index if not exists idx_customers_days_since on customers(days_since_last_purchase);
create index if not exists idx_customers_total_spend on customers(total_spend);
create index if not exists idx_orders_customer_id on orders(customer_id);
create index if not exists idx_comm_logs_campaign_id on communication_logs(campaign_id);
create index if not exists idx_comm_events_log_id on communication_events(log_id);
