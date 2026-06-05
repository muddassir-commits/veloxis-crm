-- ============================================================
-- VELOXIS CRM — MIGRATION V9: CLIENT RELATIONS & SUPPORT TABLES
-- Phase 20 — Customer Service / Client Relations
-- Run this in Supabase SQL Editor → Run All
-- ============================================================

-- ============================================================
-- CLIENT COMMUNICATIONS TABLE
-- ============================================================
create table if not exists client_communications (
  id              uuid default gen_random_uuid() primary key,
  client_id       uuid references clients(id) on delete cascade not null,
  type            text not null check (type in ('call', 'whatsapp', 'email', 'note')),
  direction       text not null check (direction in ('inbound', 'outbound')),
  body            text not null,
  created_by      uuid references profiles(id) on delete set null,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

alter table client_communications enable row level security;

-- RLS Policies for client_communications
create policy "admin_all_client_communications" on client_communications for all using (is_admin());

-- ============================================================
-- SUPPORT TICKETS TABLE
-- ============================================================
create table if not exists support_tickets (
  id              uuid default gen_random_uuid() primary key,
  client_id       uuid references clients(id) on delete cascade not null,
  subject         text not null,
  priority        text not null default 'medium' check (priority in ('low', 'medium', 'high', 'urgent')),
  status          text not null default 'open' check (status in ('open', 'in_progress', 'resolved')),
  resolution      text,
  created_by      uuid references profiles(id) on delete set null,
  assigned_to     uuid references profiles(id) on delete set null,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

alter table support_tickets enable row level security;

-- RLS Policies for support_tickets
create policy "admin_all_support_tickets" on support_tickets for all using (is_admin());

-- ============================================================
-- NPS RESPONSES TABLE
-- ============================================================
create table if not exists nps_responses (
  id              uuid default gen_random_uuid() primary key,
  client_id       uuid references clients(id) on delete cascade not null,
  score           integer not null check (score between 0 and 10),
  feedback        text,
  created_by      uuid references profiles(id) on delete set null,
  created_at      timestamptz default now()
);

alter table nps_responses enable row level security;

-- RLS Policies for nps_responses
create policy "admin_all_nps_responses" on nps_responses for all using (is_admin());

-- ============================================================
-- TRIGGERS & INDEXES
-- ============================================================
create trigger t_client_communications before update on client_communications for each row execute procedure update_updated_at();
create trigger t_support_tickets before update on support_tickets for each row execute procedure update_updated_at();

create index if not exists idx_client_communications_client on client_communications(client_id);
create index if not exists idx_client_communications_created on client_communications(created_at desc);
create index if not exists idx_support_tickets_client on support_tickets(client_id);
create index if not exists idx_support_tickets_status on support_tickets(status);
create index if not exists idx_support_tickets_priority on support_tickets(priority);
create index if not exists idx_nps_responses_client on nps_responses(client_id);
create index if not exists idx_nps_responses_created on nps_responses(created_at desc);
