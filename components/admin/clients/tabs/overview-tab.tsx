'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Client, ActivityLog } from '@/types';
import { StatCard } from '@/components/shared/stat-card';
import { formatCurrency, getMonthYear, formatDate } from '@/lib/utils';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import {
  Briefcase,
  CheckCircle,
  FileText,
  HeartPulse,
  Activity,
  ArrowRight,
  Mail,
  Phone,
  Globe,
  MapPin,
} from 'lucide-react';

interface OverviewTabProps {
  client: Client;
  onTabChange?: (tabId: 'overview' | 'projects' | 'deliverables' | 'seo' | 'ads' | 'invoices' | 'files' | 'activity') => void;
}

interface RevenueHistoryItem {
  month: string;
  Revenue: number;
}

export function OverviewTab({ client, onTabChange }: OverviewTabProps) {
  const supabase = createClient();
  const [stats, setStats] = useState({
    activeProjects: 0,
    tasksDone: 0,
    outstanding: 0,
    loading: true,
  });
  const [revenueData, setRevenueData] = useState<RevenueHistoryItem[]>([]);
  const [lastActivity, setLastActivity] = useState<ActivityLog | null>(null);

  useEffect(() => {
    async function fetchOverviewData() {
      try {
        // 1. Fetch active projects count
        const { count: activeProjects } = await supabase
          .from('projects')
          .select('id', { count: 'exact', head: true })
          .eq('client_id', client.id)
          .eq('status', 'active');

        // 2. Fetch tasks done this month
        const currentMonthYear = getMonthYear(new Date());
        const { count: tasksDone } = await supabase
          .from('tasks')
          .select('id', { count: 'exact', head: true })
          .eq('client_id', client.id)
          .eq('status', 'done')
          .eq('month_year', currentMonthYear);

        // 3. Fetch outstanding balance
        const { data: unpaidInvoices } = await supabase
          .from('invoices')
          .select('total_amount')
          .eq('client_id', client.id)
          .in('status', ['sent', 'pending', 'overdue']);
        const outstanding = unpaidInvoices ? unpaidInvoices.reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0) : 0;

        setStats({
          activeProjects: activeProjects || 0,
          tasksDone: tasksDone || 0,
          outstanding,
          loading: false,
        });

        // 4. Fetch revenue history (last 6 months)
        const chartMonths: { label: string; yearMonth: string }[] = [];
        for (let i = 5; i >= 0; i--) {
          const d = new Date();
          d.setMonth(d.getMonth() - i);
          const label = d.toLocaleString('default', { month: 'short' });
          const yearMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          chartMonths.push({ label, yearMonth });
        }

        const { data: paidInvoices } = await supabase
          .from('invoices')
          .select('total_amount, issued_date')
          .eq('client_id', client.id)
          .eq('status', 'paid');

        const monthlyRevenue = chartMonths.map((m) => {
          let total = 0;
          if (paidInvoices) {
            paidInvoices.forEach((inv) => {
              if (inv.issued_date && inv.issued_date.startsWith(m.yearMonth)) {
                total += Number(inv.total_amount || 0);
              }
            });
          }
          return {
            month: m.label,
            Revenue: total,
          };
        });
        setRevenueData(monthlyRevenue);

        // 5. Fetch last activity item
        const { data: lastLog } = await supabase
          .from('activity_log')
          .select('*')
          .eq('client_id', client.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        setLastActivity(lastLog || null);
      } catch (err) {
        console.error('Error fetching overview stats:', err);
        setStats((p) => ({ ...p, loading: false }));
      }
    }

    fetchOverviewData();
  }, [client.id, supabase]);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Active Projects"
          value={stats.activeProjects}
          icon={Briefcase}
          loading={stats.loading}
        />
        <StatCard
          title="Tasks Done This Month"
          value={stats.tasksDone}
          icon={CheckCircle}
          loading={stats.loading}
        />
        <StatCard
          title="Outstanding Balance"
          value={formatCurrency(stats.outstanding)}
          valueClassName="text-accent font-mono"
          icon={FileText}
          loading={stats.loading}
        />
        <StatCard
          title="Health Score"
          value={`${client.health_score}%`}
          valueClassName={
            client.health_score >= 80 ? 'text-online' :
            client.health_score >= 50 ? 'text-warning' : 'text-error'
          }
          icon={HeartPulse}
          loading={stats.loading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Line Chart */}
        <div className="bg-bg-card border border-border/30 rounded-[10px] p-5 lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between select-none">
            <h3 className="text-sm font-semibold text-text-primary">Revenue History (Paid Invoices)</h3>
            <span className="text-[10px] text-text-tertiary uppercase font-mono">Last 6 Months</span>
          </div>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenueData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid stroke="var(--color-border-subtle)" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="month"
                  tick={{ fill: 'var(--color-text-tertiary)', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: 'var(--color-text-tertiary)', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(val) => `₹${val}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--color-bg-card)',
                    borderColor: 'var(--color-border-subtle)',
                    borderRadius: 8,
                    color: 'var(--color-text-primary)',
                    fontSize: 12,
                  }}
                  formatter={(val) => [formatCurrency(Number(val ?? 0)), 'Revenue']}
                />
                <Line
                  type="monotone"
                  dataKey="Revenue"
                  stroke="var(--color-primary)"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Details & Last Activity */}
        <div className="space-y-6">
          {/* Contact Details */}
          <div className="bg-bg-card border border-border/30 rounded-[10px] p-5 space-y-4">
            <h3 className="text-sm font-semibold text-text-primary border-b border-border/30/30 pb-2 select-none">
              Business Contacts
            </h3>
            <div className="space-y-3 text-xs">
              <div className="flex items-center gap-3">
                <Mail size={14} className="text-text-tertiary shrink-0" />
                <div className="min-w-0">
                  <p className="text-text-tertiary text-[10px] uppercase font-semibold">Email</p>
                  <p className="text-text-secondary truncate select-all">{client.email || 'No email registered'}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Phone size={14} className="text-text-tertiary shrink-0" />
                <div className="min-w-0">
                  <p className="text-text-tertiary text-[10px] uppercase font-semibold">Phone</p>
                  <p className="text-text-secondary select-all">{client.phone || 'No phone number'}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Globe size={14} className="text-text-tertiary shrink-0" />
                <div className="min-w-0">
                  <p className="text-text-tertiary text-[10px] uppercase font-semibold">Website</p>
                  {client.website ? (
                    <a
                      href={client.website.startsWith('http') ? client.website : `https://${client.website}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary-light hover:underline truncate block"
                    >
                      {client.website}
                    </a>
                  ) : (
                    <p className="text-text-tertiary">No domain registered</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <MapPin size={14} className="text-text-tertiary shrink-0" />
                <div className="min-w-0">
                  <p className="text-text-tertiary text-[10px] uppercase font-semibold">Location</p>
                  <p className="text-text-secondary">{client.city || 'Not specified'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Last Activity Card */}
          <div className="bg-bg-card border border-border/30 rounded-[10px] p-5 space-y-3">
            <div className="flex items-center justify-between select-none border-b border-border/30/30 pb-2">
              <h3 className="text-sm font-semibold text-text-primary flex items-center gap-1.5">
                <Activity size={14} className="text-primary-light" />
                <span>Last Activity</span>
              </h3>
              {onTabChange && (
                <button
                  onClick={() => onTabChange('activity')}
                  className="text-[10px] text-primary-light hover:underline flex items-center gap-0.5 cursor-pointer font-semibold"
                >
                  <span>View All</span>
                  <ArrowRight size={10} />
                </button>
              )}
            </div>

            {lastActivity ? (
              <div className="text-xs space-y-1">
                <p className="font-semibold text-text-primary">{lastActivity.title}</p>
                {lastActivity.description && (
                  <p className="text-[11px] text-text-secondary line-clamp-2 leading-relaxed">
                    {lastActivity.description}
                  </p>
                )}
                <span className="text-[9px] text-text-tertiary font-mono block pt-1">
                  {formatDate(lastActivity.created_at)}
                </span>
              </div>
            ) : (
              <p className="text-xs text-text-tertiary italic">No recent activity recorded.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default OverviewTab;
