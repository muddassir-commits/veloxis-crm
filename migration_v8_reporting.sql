-- ============================================================
-- VELOXIS CRM — MIGRATION V8: REPORTING & ANALYTICS TABLES
-- Phase 19 — Reporting & Analytics
-- Run this in Supabase SQL Editor → Run All
-- ============================================================

-- ============================================================
-- GENERATED REPORTS TABLE
-- ============================================================
create table if not exists generated_reports (
  id              uuid default gen_random_uuid() primary key,
  client_id       uuid references clients(id) on delete cascade not null,
  month_year      text not null, -- e.g. "Jun 2026"
  status          text default 'draft', -- 'draft', 'sent'
  file_id         uuid references files(id) on delete set null,
  created_by      uuid references profiles(id) on delete set null,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now(),
  unique(client_id, month_year),
  constraint chk_report_status check (status in ('draft', 'sent'))
);

alter table generated_reports enable row level security;

-- RLS Policies for generated_reports
create policy "admin_all_generated_reports" on generated_reports for all using (is_admin());
create policy "employee_select_generated_reports" on generated_reports for select using (is_employee());
create policy "client_select_generated_reports" on generated_reports for select using (client_id = my_client_id());

-- ============================================================
-- TRIGGERS & INDEXES
-- ============================================================
create trigger t_generated_reports before update on generated_reports for each row execute procedure update_updated_at();

create index if not exists idx_generated_reports_client on generated_reports(client_id);
create index if not exists idx_generated_reports_month on generated_reports(month_year);
