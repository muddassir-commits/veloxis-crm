// ============================================================
// VELOXIS GLOBAL CRM — TYPES & INTERFACES
// ============================================================

// ── ENUMS ────────────────────────────────────────────────────

export type UserRole = 'admin' | 'employee' | 'client';

export type LeadStatus =
  | 'new'
  | 'contacted'
  | 'discovery'
  | 'proposal'
  | 'negotiation'
  | 'won'
  | 'lost'
  | 'dormant';

export type ClientStatus = 'lead' | 'active' | 'paused' | 'churned';

export type ProjectStatus = 'planning' | 'active' | 'paused' | 'completed';

export type ProjectType =
  | 'seo'
  | 'meta_ads'
  | 'google_ads'
  | 'smm'
  | 'website'
  | 'content'
  | 'email'
  | 'whatsapp'
  | 'gbp'
  | 'other';

export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'approved' | 'done';

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export type InvoiceStatus =
  | 'draft'
  | 'sent'
  | 'pending'
  | 'paid'
  | 'overdue'
  | 'cancelled';

// ── TABLE INTERFACES ─────────────────────────────────────────

export interface Profile {
  id: string; // uuid, references auth.users
  full_name: string;
  email: string;
  role: UserRole;
  avatar_url: string | null;
  phone: string | null;
  whatsapp: string | null;
  is_active: boolean;
  last_seen: string | null; // timestamptz
  preferences: Record<string, unknown>; // jsonb
  created_at: string;
  updated_at: string;
}

export interface Lead {
  id: string; // uuid
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  website: string | null;
  industry: string | null;
  city: string | null;
  source: string | null; // 'website', 'linkedin', etc.
  status: LeadStatus;
  score: number;
  estimated_value: number;
  notes: string | null;
  assigned_to: string | null; // uuid, references profiles.id
  converted_to: string | null; // uuid, references clients.id
  lost_reason: string | null;
  follow_up_date: string | null; // date
  created_at: string;
  updated_at: string;
}

export interface LeadActivity {
  id: string; // uuid
  lead_id: string; // uuid, references leads.id
  type: string; // 'call', 'whatsapp', 'email', 'meeting', 'note'
  description: string;
  outcome: string | null;
  duration_min: number | null;
  created_by: string | null; // uuid, references profiles.id
  created_at: string;
}

export interface OutreachLog {
  id: string; // uuid
  date: string; // date
  business_name: string | null;
  contact_name: string | null;
  phone: string | null;
  city: string | null;
  channel: string | null; // 'whatsapp', 'linkedin', 'email', 'instagram'
  observation: string | null;
  response: string | null; // 'positive', 'no_response', etc.
  follow_up: string | null; // date
  outcome: string | null;
  created_by: string | null; // uuid, references profiles.id
  created_at: string;
}

export interface Client {
  id: string; // uuid
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  website: string | null;
  industry: string | null;
  city: string | null;
  status: ClientStatus;
  monthly_retainer: number;
  start_date: string | null; // date
  contract_end: string | null; // date
  services: string[]; // text[]
  notes: string | null;
  health_score: number;
  assigned_to: string | null; // uuid, references profiles.id
  portal_user_id: string | null; // uuid, references profiles.id
  lead_id: string | null; // uuid, references leads.id
  is_agency_self: boolean;
  created_at: string;
  updated_at: string;
}

export interface ClientContact {
  id: string; // uuid
  client_id: string | null; // uuid, references clients.id
  name: string;
  role: string | null;
  email: string | null;
  phone: string | null;
  is_primary: boolean;
  created_at: string;
}

export interface ClientNote {
  id: string; // uuid
  client_id: string | null; // uuid, references clients.id
  content: string;
  type: string; // 'general', 'call', etc.
  created_by: string | null; // uuid, references profiles.id
  created_at: string;
}

export interface Project {
  id: string; // uuid
  client_id: string; // uuid, references clients.id
  name: string;
  type: ProjectType | null;
  status: ProjectStatus;
  start_date: string | null; // date
  end_date: string | null; // date
  monthly_value: number;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string; // uuid
  project_id: string | null; // uuid, references projects.id
  client_id: string; // uuid, references clients.id
  title: string;
  description: string | null;
  instructions: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null; // date
  completed_at: string | null; // timestamptz
  month_year: string | null; // "Jun 2026"
  assigned_to: string | null; // uuid, references profiles.id
  reviewed_by: string | null; // uuid, references profiles.id
  review_notes: string | null;
  estimated_hours: number | null;
  actual_hours: number | null;
  department: string | null; // 'seo', 'social', 'ads', 'content', 'web'
  created_at: string;
  updated_at: string;
}

export interface TaskSubmission {
  id: string; // uuid
  task_id: string | null; // uuid, references tasks.id
  submitted_by: string | null; // uuid, references profiles.id
  notes: string | null;
  created_at: string;
}

export interface SeoCampaign {
  id: string; // uuid
  client_id: string; // uuid, references clients.id
  month_year: string; // "Jun 2026"
  organic_traffic: number;
  organic_traffic_prev: number;
  keywords_tracked: number;
  keywords_top3: number;
  keywords_top10: number;
  keywords_top20: number;
  backlinks_built: number;
  domain_authority: number | null;
  audit_issues_found: number;
  audit_issues_resolved: number;
  pages_optimized: number;
  gsc_clicks: number;
  gsc_impressions: number;
  gsc_ctr: number | null;
  gsc_avg_position: number | null;
  ga4_sessions: number;
  ga4_new_users: number;
  ga4_conversions: number;
  gbp_views: number;
  gbp_calls: number;
  gbp_directions: number;
  gbp_website_clicks: number;
  notes: string | null;
  report_file_id: string | null; // uuid
  data_synced_at: string | null; // timestamptz
  created_at: string;
}

export interface SeoKeyword {
  id: string; // uuid
  client_id: string; // uuid, references clients.id
  keyword: string;
  target_url: string | null;
  current_position: number | null;
  previous_position: number | null;
  best_position: number | null;
  search_volume: number | null;
  keyword_difficulty: number | null;
  intent: string | null; // 'commercial', etc.
  month_year: string | null;
  source: string; // 'manual', 'gsc_auto'
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface SeoBacklink {
  id: string; // uuid
  client_id: string | null; // uuid, references clients.id
  source_url: string;
  target_url: string | null;
  anchor_text: string | null;
  da_score: number | null;
  type: string | null; // 'guest_post', etc.
  status: string;
  acquired_date: string | null; // date
  month_year: string | null;
  created_at: string;
}

export interface GscConnection {
  id: string; // uuid
  client_id: string; // uuid, references clients.id
  property_url: string;
  access_token: string | null;
  refresh_token: string | null;
  token_expires: string | null; // timestamptz
  connected_by: string | null; // uuid, references profiles.id
  last_sync: string | null; // timestamptz
  is_active: boolean;
  created_at: string;
}

export interface Ga4Connection {
  id: string; // uuid
  client_id: string; // uuid, references clients.id
  property_id: string;
  access_token: string | null;
  refresh_token: string | null;
  token_expires: string | null; // timestamptz
  connected_by: string | null; // uuid, references profiles.id
  last_sync: string | null; // timestamptz
  is_active: boolean;
  created_at: string;
}

export interface SocialMediaMetrics {
  id: string; // uuid
  client_id: string | null; // uuid, references clients.id
  platform: string; // 'instagram', 'facebook', 'linkedin'
  month_year: string;
  followers: number;
  new_followers: number;
  reach: number;
  impressions: number;
  engagements: number;
  engagement_rate: number | null;
  posts_published: number;
  profile_visits: number;
  website_clicks: number;
  created_at: string;
}

export interface SocialPost {
  id: string; // uuid
  client_id: string | null; // uuid, references clients.id
  platform: string;
  content_type: string | null;
  caption: string | null;
  hashtags: string[] | null;
  scheduled_for: string | null; // timestamptz
  published_at: string | null; // timestamptz
  status: string; // 'draft', etc.
  design_file_id: string | null; // uuid
  assigned_to: string | null; // uuid, references profiles.id
  month_year: string | null;
  reach: number | null;
  likes: number | null;
  comments: number | null;
  saves: number | null;
  created_at: string;
}

export interface MetaCampaign {
  id: string; // uuid
  client_id: string; // uuid, references clients.id
  campaign_name: string;
  campaign_id: string | null;
  month_year: string;
  objective: string | null;
  platform: string | null;
  budget_allocated: number;
  budget_spent: number;
  impressions: number;
  reach: number;
  clicks: number;
  leads: number;
  cpl: number | null;
  ctr: number | null;
  cpm: number | null;
  roas: number | null;
  status: string;
  notes: string | null;
  data_synced_at: string | null;
  created_at: string;
}

export interface MetaConnection {
  id: string; // uuid
  client_id: string; // uuid, references clients.id
  ad_account_id: string;
  access_token: string | null;
  token_expires: string | null; // timestamptz
  connected_by: string | null; // uuid, references profiles.id
  last_sync: string | null; // timestamptz
  is_active: boolean;
  created_at: string;
}

export interface GoogleAdsConnection {
  id: string; // uuid
  client_id: string; // uuid, references clients.id
  customer_id: string;
  access_token: string | null;
  refresh_token: string | null;
  token_expires: string | null; // timestamptz
  last_sync: string | null; // timestamptz
  is_active: boolean;
  created_at: string;
}


export interface GoogleAdsCampaign {
  id: string; // uuid
  client_id: string | null; // uuid, references clients.id
  campaign_name: string;
  campaign_id: string | null;
  month_year: string;
  type: string | null;
  budget_allocated: number | null;
  budget_spent: number | null;
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: number | null;
  avg_cpc: number | null;
  cost_per_conv: number | null;
  quality_score: number | null;
  status: string;
  notes: string | null;
  data_synced_at: string | null;
  created_at: string;
}

export interface GoogleAdsNegativeKeyword {
  id: string; // uuid
  client_id: string | null; // uuid, references clients.id
  keyword: string;
  match_type: string | null;
  campaign: string | null;
  date_added: string; // date
  reason: string | null;
  created_at: string;
}

export interface Invoice {
  id: string; // uuid
  client_id: string; // uuid, references clients.id
  invoice_number: string;
  amount: number;
  gst_rate: number;
  gst_amount: number;
  total_amount: number | null;
  status: InvoiceStatus;
  issued_date: string; // date
  due_date: string | null; // date
  paid_date: string | null; // date
  payment_method: string | null;
  description: string | null;
  month_year: string | null;
  file_id: string | null; // uuid
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface InvoiceItem {
  id: string; // uuid
  invoice_id: string | null; // uuid, references invoices.id
  description: string;
  quantity: number;
  unit_price: number;
  total: number | null;
  created_at: string;
}

export interface Expense {
  id: string; // uuid
  category: string; // 'student_stipend', 'tools', etc.
  description: string;
  amount: number;
  is_tax_deductible: boolean;
  date: string; // date
  month_year: string | null;
  receipt_file_id: string | null; // uuid
  paid_by: string;
  notes: string | null;
  created_at: string;
}

export interface Employee {
  id: string; // uuid, references profiles.id
  skills: string[] | null;
  designation: string;
  join_date: string | null; // date
  end_date: string | null; // date
  stipend_amount: number;
  payment_day: number;
  bank_details: Record<string, unknown> | null; // jsonb
  agreement_file_id: string | null; // uuid
  performance_score: number;
  notes: string | null;
  created_at: string;
}

export interface StipendPayment {
  id: string; // uuid
  employee_id: string | null; // uuid, references employees.id
  month_year: string;
  base_amount: number | null;
  bonus_amount: number;
  total_amount: number | null;
  status: string; // 'pending', 'paid'
  paid_date: string | null; // date
  payment_method: string | null;
  notes: string | null;
  created_at: string;
}

export interface FileRecord {
  id: string; // uuid
  name: string;
  original_name: string | null;
  mime_type: string | null;
  size_bytes: number | null; // bigint mapping to number
  bucket: string; // 'clients', 'invoices', etc.
  storage_path: string;
  public_url: string | null;
  department: string | null;
  client_id: string | null; // uuid, references clients.id
  employee_id: string | null; // uuid, references profiles.id
  tags: string[]; // text[]
  description: string | null;
  uploaded_by: string | null; // uuid, references profiles.id
  is_shared_with_client: boolean;
  created_at: string;
}

export interface Folder {
  id: string; // uuid
  name: string;
  parent_id: string | null; // uuid, references folders.id
  client_id: string | null; // uuid, references clients.id
  department: string | null;
  created_by: string | null; // uuid, references profiles.id
  created_at: string;
}

export interface Contract {
  id: string; // uuid
  type: string; // 'client_agreement', etc.
  party_name: string;
  client_id: string | null; // uuid, references clients.id
  employee_id: string | null; // uuid, references profiles.id
  status: string; // 'draft', etc.
  signed_date: string | null; // date
  expiry_date: string | null; // date
  file_id: string | null; // uuid, references files.id
  notes: string | null;
  created_at: string;
}

export interface Notification {
  id: string; // uuid
  user_id: string | null; // uuid, references profiles.id
  type: string; // 'invoice_due', 'task_submitted', etc.
  title: string;
  message: string | null;
  link: string | null;
  is_read: boolean;
  priority: string; // 'low', 'normal', etc.
  created_at: string;
}

export interface ActivityLog {
  id: string; // uuid
  user_id: string | null; // uuid, references profiles.id
  client_id: string | null; // uuid, references clients.id
  action: string;
  entity_type: string | null;
  entity_id: string | null; // uuid
  title: string;
  description: string | null;
  metadata: Record<string, unknown>; // jsonb
  is_read: boolean;
  created_at: string;
}

export interface AuditLog {
  id: number; // bigserial
  user_id: string | null; // uuid, references profiles.id
  action: string; // 'INSERT', etc.
  table_name: string | null;
  record_id: string | null; // uuid
  old_values: Record<string, unknown> | null; // jsonb
  new_values: Record<string, unknown> | null; // jsonb
  ip_address: string | null; // inet mapping to string
  user_agent: string | null;
  created_at: string;
}

export interface CronJob {
  id: string; // uuid
  name: string;
  description: string | null;
  cron_expression: string;
  n8n_workflow_id: string | null;
  is_active: boolean;
  last_run: string | null; // timestamptz
  next_run: string | null; // timestamptz
  last_status: string | null; // 'success', etc.
  created_at: string;
}

export interface CronJobRun {
  id: string; // uuid
  job_id: string | null; // uuid, references cron_jobs.id
  started_at: string;
  ended_at: string | null; // timestamptz
  status: string | null;
  output: Record<string, unknown> | null; // jsonb
  error: string | null;
}

export interface AgencySetting {
  key: string; // primary key
  value: unknown; // jsonb
  description: string | null;
  updated_by: string | null; // uuid, references profiles.id
  updated_at: string;
}

export interface AgencySocialAccount {
  id: string; // uuid
  platform: string;
  handle: string;
  profile_url: string | null;
  followers: number;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface AgencyWhatsappCampaign {
  id: string; // uuid
  name: string;
  month_year: string;
  campaign_type: string; // 'broadcast' | 'sequence' | 'chatbot'
  template_name: string | null;
  messages_sent: number;
  delivered: number;
  read_count: number;
  replied: number;
  delivery_rate: number | null;
  read_rate: number | null;
  reply_rate: number | null;
  status: string;
  notes: string | null;
  created_at: string;
}

export interface AgencyEmailCampaign {
  id: string; // uuid
  name: string;
  subject: string | null;
  month_year: string;
  campaign_type: string; // 'newsletter' | 'drip' | 'announcement' | 'promo'
  provider: string;
  emails_sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  unsubscribed: number;
  bounced: number;
  open_rate: number | null;
  click_rate: number | null;
  status: string;
  resend_email_id: string | null;
  notes: string | null;
  sent_at: string | null;
  created_at: string;
}

export interface AgencyOwnAdCampaign {
  id: string; // uuid
  platform: string; // 'meta' | 'google'
  campaign_name: string;
  campaign_id: string | null;
  month_year: string;
  objective: string | null;
  budget_allocated: number;
  budget_spent: number;
  impressions: number;
  clicks: number;
  leads: number;
  cpl: number | null;
  ctr: number | null;
  cpm: number | null;
  roas: number | null;
  status: string;
  data_synced_at: string | null;
  notes: string | null;
  created_at: string;
}

export interface AgencyMonthlySnapshot {
  id: string; // uuid
  month_year: string;
  organic_traffic: number;
  gsc_clicks: number;
  gsc_impressions: number;
  gsc_avg_position: number | null;
  keywords_top10: number;
  instagram_followers: number;
  instagram_reach: number;
  instagram_posts: number;
  facebook_followers: number;
  facebook_reach: number;
  linkedin_followers: number;
  linkedin_impressions: number;
  meta_spend: number;
  google_spend: number;
  total_ad_spend: number;
  total_ad_leads: number;
  avg_cpl: number | null;
  emails_sent: number;
  avg_open_rate: number | null;
  wa_messages_sent: number;
  wa_read_rate: number | null;
  new_leads: number;
  leads_converted: number;
  new_clients: number;
  revenue_collected: number;
  lead_to_client_rate: number | null;
  created_at: string;
  updated_at: string;
}
