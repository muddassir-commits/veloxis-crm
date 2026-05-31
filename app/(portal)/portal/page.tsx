import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import {
  CheckCircle2,
  AlertCircle,
  FileText,
  TrendingUp,
  ExternalLink,
  Info,
  Layers,
  ArrowUpRight,
  IndianRupee,
} from 'lucide-react';
import Link from 'next/link';
import { formatDate } from '@/lib/utils';

export const revalidate = 0;

export default async function ClientDashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  // Retrieve client associated with this portal user
  const { data: client } = await supabase
    .from('clients')
    .select('*')
    .eq('portal_user_id', user.id)
    .single();

  if (!client) redirect('/login');

  // Fetch client projects
  const { data: projects } = await supabase
    .from('projects')
    .select('*')
    .eq('client_id', client.id);

  // Fetch client invoices to calculate balance
  const { data: invoices } = await supabase
    .from('invoices')
    .select('*')
    .eq('client_id', client.id)
    .neq('status', 'draft')
    .neq('status', 'cancelled');

  // Calculate unpaid/outstanding balance
  const unpaidInvoices = (invoices || []).filter(
    (inv) => inv.status === 'pending' || inv.status === 'sent' || inv.status === 'overdue'
  );
  const outstandingBalance = unpaidInvoices.reduce((sum, inv) => sum + Number(inv.total_amount || inv.amount || 0), 0);
  const nextPaymentDue = unpaidInvoices.length > 0 
    ? unpaidInvoices.sort((a, b) => new Date(a.due_date || '').getTime() - new Date(b.due_date || '').getTime())[0]
    : null;

  // Fetch current month deliverables (tasks)
  const currentMonthYear = new Date().toLocaleString('en-US', { month: 'short', year: 'numeric' });
  const { data: tasks } = await supabase
    .from('tasks')
    .select('*')
    .eq('client_id', client.id)
    .eq('month_year', currentMonthYear);

  const totalTasks = tasks?.length || 0;
  const doneTasks = tasks?.filter((t) => t.status === 'done' || t.status === 'approved').length || 0;
  const completionRate = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  // SVG Circular progress details
  const radius = 45;
  const stroke = 8;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (completionRate / 100) * circumference;

  // Fetch latest SEO campaign stats
  const { data: seoCampaign } = await supabase
    .from('seo_campaigns')
    .select('*')
    .eq('client_id', client.id)
    .order('month_year', { ascending: false })
    .limit(1)
    .maybeSingle();

  // Fetch latest shared files
  const { data: recentFiles } = await supabase
    .from('files')
    .select('*')
    .eq('client_id', client.id)
    .eq('is_shared_with_client', true)
    .order('created_at', { ascending: false })
    .limit(3);

  return (
    <div className="space-y-6">
      {/* 1. Header with Greeting and Services */}
      <div className="bg-white border border-[#E2E8F4] rounded-[10px] p-5 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#0A1628]">
            Hello, {profileName(user.email || '', client.name)} 👋
          </h1>
          <p className="text-xs text-[#475569] mt-0.5">
            Welcome to your company workspace. Here is your dashboard for today.
          </p>
        </div>
        
        {/* Active services chips */}
        {client.services && client.services.length > 0 && (
          <div className="flex flex-wrap gap-1.5 shrink-0">
            {client.services.map((service: string, idx: number) => (
              <span
                key={idx}
                className="text-[9px] px-2 py-0.5 font-bold uppercase rounded-full bg-brand-blue-muted text-[#1B4FD8] border border-[#1B4FD8]/10"
              >
                {service}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 2. Top Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Deliverables Circular Progress Card */}
        <div className="bg-white border border-[#E2E8F4] rounded-[10px] p-5 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] text-[#475569] font-bold uppercase tracking-wider block">
              Deliverables Progress
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-bold font-mono text-[#0A1628]">{doneTasks}</span>
              <span className="text-xs text-[#94A3B8] font-bold">/ {totalTasks}</span>
            </div>
            <p className="text-[10px] text-[#94A3B8] italic">This month&apos;s tasks completed</p>
          </div>
          {/* Progress Ring */}
          <div className="relative w-20 h-20 flex items-center justify-center shrink-0">
            <svg className="w-full h-full -rotate-90">
              <circle
                stroke="#F1F5F9"
                fill="transparent"
                strokeWidth={stroke}
                r={normalizedRadius}
                cx={radius}
                cy={radius}
              />
              <circle
                stroke="#1B4FD8"
                fill="transparent"
                strokeWidth={stroke}
                strokeDasharray={circumference + ' ' + circumference}
                style={{ strokeDashoffset }}
                r={normalizedRadius}
                cx={radius}
                cy={radius}
                className="transition-all duration-500 ease-out"
                strokeLinecap="round"
              />
            </svg>
            <span className="absolute text-xs font-black font-mono text-[#0A1628]">
              {completionRate}%
            </span>
          </div>
        </div>

        {/* Outstanding Balance Card */}
        <div className="bg-white border border-[#E2E8F4] rounded-[10px] p-5 shadow-xs flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-[10px] text-[#475569] font-bold uppercase tracking-wider block">
                Outstanding Balance
              </span>
              <div className="flex items-center text-2xl font-bold text-[#F97316] font-mono mt-1">
                <IndianRupee size={20} className="stroke-[2.5]" />
                <span>{outstandingBalance.toLocaleString('en-IN')}</span>
              </div>
            </div>
            <div className={`p-1.5 rounded-full ${outstandingBalance > 0 ? 'bg-amber-50 text-amber-500' : 'bg-green-50 text-green-500'}`}>
              {outstandingBalance > 0 ? <AlertCircle size={15} /> : <CheckCircle2 size={15} />}
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-[10px]">
            <span className="text-[#94A3B8]">
              {nextPaymentDue ? `Due by ${formatDate(nextPaymentDue.due_date)}` : 'All invoices paid ✓'}
            </span>
            <Link
              href="/portal/invoices"
              className="text-[#1B4FD8] hover:underline font-bold flex items-center gap-0.5"
            >
              Pay Now <ArrowUpRight size={10} />
            </Link>
          </div>
        </div>

        {/* SEO Metrics Highlights */}
        <div className="bg-white border border-[#E2E8F4] rounded-[10px] p-5 shadow-xs flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-[10px] text-[#475569] font-bold uppercase tracking-wider block">
                Organic Performance
              </span>
              {seoCampaign ? (
                <div className="flex items-baseline gap-1 mt-1 text-2xl font-bold font-mono text-[#0A1628]">
                  <span>{(seoCampaign.organic_traffic || 0).toLocaleString('en-US')}</span>
                  <span className="text-[10px] text-[#22C55E] font-bold flex items-center gap-0.5">
                    <TrendingUp size={10} />
                    {seoMoMChange(seoCampaign.organic_traffic, seoCampaign.organic_traffic_prev)}
                  </span>
                </div>
              ) : (
                <div className="text-sm font-semibold text-[#94A3B8] mt-2 select-none">Pending sync...</div>
              )}
            </div>
            <div className="p-1.5 rounded-full bg-blue-50 text-[#1B4FD8]">
              <TrendingUp size={15} />
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-[10px] text-[#94A3B8]">
            <span>{seoCampaign ? `${seoCampaign.month_year} Traffic Stats` : 'No data synced'}</span>
            <Link
              href="/portal/reports"
              className="text-[#1B4FD8] hover:underline font-bold flex items-center gap-0.5"
            >
              View Report <ArrowUpRight size={10} />
            </Link>
          </div>
        </div>
      </div>

      {/* 3. Middle Content: Projects list and Recent Shared Files */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Projects List */}
        <div className="bg-white border border-[#E2E8F4] rounded-[10px] p-5 shadow-xs lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3">
            <h3 className="text-sm font-bold text-[#0A1628] flex items-center gap-2">
              <Layers size={14} className="text-[#1B4FD8]" />
              Active Projects & Retainers
            </h3>
            <span className="text-[9px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold">
              {projects?.length || 0} Total
            </span>
          </div>

          {!projects || projects.length === 0 ? (
            <div className="py-8 text-center text-xs text-[#94A3B8]">
              No active projects listed.
            </div>
          ) : (
            <div className="divide-y divide-[#F1F5F9] max-h-[250px] overflow-y-auto pr-1">
              {projects.map((proj) => (
                <div key={proj.id} className="py-3 flex items-center justify-between gap-4 first:pt-0 last:pb-0">
                  <div>
                    <h4 className="text-xs font-bold text-[#0A1628]">{proj.name}</h4>
                    <p className="text-[10px] text-[#94A3B8] capitalize mt-0.5">
                      Service: {proj.type?.replace('_', ' ') || 'Retainer'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {proj.start_date && (
                      <span className="text-[9px] font-mono text-[#94A3B8] hidden sm:block">
                        Started {formatDate(proj.start_date)}
                      </span>
                    )}
                    <span className={`text-[9px] px-2 py-0.5 font-bold uppercase rounded-full ${
                      proj.status === 'active'
                        ? 'bg-green-50 text-[#22C55E]'
                        : 'bg-amber-50 text-[#F59E0B]'
                    }`}>
                      {proj.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent shared files */}
        <div className="bg-white border border-[#E2E8F4] rounded-[10px] p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3">
            <h3 className="text-sm font-bold text-[#0A1628] flex items-center gap-2">
              <FileText size={14} className="text-brand-blue" />
              Shared Reports & Files
            </h3>
            <Link href="/portal/files" className="text-[10px] text-[#1B4FD8] hover:underline font-bold">
              View Vault
            </Link>
          </div>

          {!recentFiles || recentFiles.length === 0 ? (
            <div className="py-8 text-center text-xs text-[#94A3B8]">
              No reports uploaded yet.
            </div>
          ) : (
            <div className="space-y-3">
              {recentFiles.map((file) => (
                <a
                  key={file.id}
                  href={file.public_url || '#'}
                  target="_blank"
                  rel="noreferrer"
                  className="block p-2.5 rounded-[7px] border border-[#E2E8F4] hover:bg-[#F8FAFF] hover:border-[#1B4FD8]/30 transition-all group"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-[#0A1628] truncate group-hover:text-[#1B4FD8]">
                      {file.name}
                    </span>
                    <ExternalLink size={10} className="text-[#94A3B8] shrink-0" />
                  </div>
                  <div className="flex items-center justify-between text-[9px] text-[#94A3B8] mt-1 font-mono">
                    <span>{file.department?.toUpperCase() || 'VAULT'}</span>
                    <span>{formatDate(file.created_at)}</span>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 4. Help & Guidelines notice banner */}
      <div className="bg-blue-50 border border-blue-100 rounded-[10px] p-4 flex gap-3">
        <Info size={16} className="text-[#1B4FD8] shrink-0 mt-0.5" />
        <div className="text-xs space-y-1">
          <h4 className="font-bold text-[#0A1628] flex items-center gap-1.5">
            Need Support?
          </h4>
          <p className="text-[#475569] leading-relaxed">
            If you have requests regarding ongoing campaigns, SEO keywords, or billing discrepancies, please reach out directly via WhatsApp at <strong>+91-8887620727</strong> or email <strong>muddassir@veloxisglobal.com</strong>.
          </p>
        </div>
      </div>
    </div>
  );
}

// Helpers for presentation logic
function profileName(email: string, clientName: string) {
  if (clientName) return clientName.split(' ')[0];
  return email.split('@')[0];
}

function seoMoMChange(curr: number, prev: number) {
  if (!prev) return '0%';
  const diff = curr - prev;
  const pct = Math.round((diff / prev) * 100);
  return `${pct >= 0 ? '+' : ''}${pct}%`;
}
