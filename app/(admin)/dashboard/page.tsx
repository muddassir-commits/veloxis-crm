import React from 'react';
import Link from 'next/link';
import { PageContainer } from '@/components/shared/page-container';
import { StatCard } from '@/components/shared/stat-card';
import { StatusBadge } from '@/components/shared/status-badge';
import { EmptyState } from '@/components/shared/empty-state';
import { RevenueChart } from '@/components/admin/revenue-chart';
import { createClient } from '@/lib/supabase/server';
import { formatCurrency, timeAgo, getMonthYear } from '@/lib/utils';
import {
  Users,
  Briefcase,
  DollarSign,
  ListTodo,
  ArrowRight,
  Activity,
  Calendar,
  AlertTriangle,
  Building2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export const revalidate = 0; // Dynamic server-side rendering

export default async function OverviewPage() {
  const supabase = await createClient();

  const todayStr = new Date().toISOString().split('T')[0];
  
  // Calculate next week date string for tasks due this week
  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);
  const nextWeekStr = nextWeek.toISOString().split('T')[0];

  // Month-year formatting for revenue queries
  const now = new Date();
  const currentMonthYear = getMonthYear(now);
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthYear = getMonthYear(lastMonthDate);

  // 1. Fetch active paying clients count (exclude is_agency_self)
  const { count: activeClientsCount } = await supabase
    .from('clients')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'active')
    .eq('is_agency_self', false);

  // Fetch leads in pipeline (new, contacted, discovery, proposal, negotiation) for subtext
  const { count: pipelineLeadsCount } = await supabase
    .from('leads')
    .select('id', { count: 'exact', head: true })
    .in('status', ['new', 'contacted', 'discovery', 'proposal', 'negotiation']);

  // 2. Fetch active projects count
  const { count: activeProjectsCount } = await supabase
    .from('projects')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'active');

  // 3. Fetch current month paid invoices for revenue calculation
  const { data: currentMonthInvoices } = await supabase
    .from('invoices')
    .select('amount')
    .eq('status', 'paid')
    .eq('month_year', currentMonthYear);

  const revenueThisMonth = (currentMonthInvoices || []).reduce(
    (sum, inv) => sum + Number(inv.amount || 0),
    0
  );

  // Fetch last month paid invoices for change calculation
  const { data: lastMonthInvoices } = await supabase
    .from('invoices')
    .select('amount')
    .eq('status', 'paid')
    .eq('month_year', lastMonthYear);

  const revenueLastMonth = (lastMonthInvoices || []).reduce(
    (sum, inv) => sum + Number(inv.amount || 0),
    0
  );

  const revenueChange =
    revenueLastMonth > 0
      ? Math.round(((revenueThisMonth - revenueLastMonth) / revenueLastMonth) * 100)
      : 0;
  const revenueChangeType =
    revenueThisMonth >= revenueLastMonth ? 'up' : 'down';

  // 4. Fetch tasks due today (due_date = todayStr and status != 'done')
  const { count: tasksDueTodayCount } = await supabase
    .from('tasks')
    .select('id', { count: 'exact', head: true })
    .eq('due_date', todayStr)
    .neq('status', 'done');

  // Fetch overdue tasks count for Card 4 subtext/badge
  const { count: overdueTasksCount } = await supabase
    .from('tasks')
    .select('id', { count: 'exact', head: true })
    .lt('due_date', todayStr)
    .neq('status', 'done');

  // 5. Fetch revenue data for last 6 months
  const { data: allPaidInvoices } = await supabase
    .from('invoices')
    .select('month_year, amount')
    .eq('status', 'paid');

  const last6MonthsData: Array<{ name: string; monthYear: string; revenue: number; fullName: string }> = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const my = getMonthYear(d);
    const monthLabel = d.toLocaleDateString('en-US', { month: 'short' });
    last6MonthsData.push({
      name: monthLabel,
      monthYear: my,
      revenue: 0,
      fullName: my,
    });
  }

  if (allPaidInvoices) {
    allPaidInvoices.forEach((inv) => {
      const match = last6MonthsData.find((m) => m.monthYear === inv.month_year);
      if (match) {
        match.revenue += Number(inv.amount || 0);
      }
    });
  }

  // 6. Fetch recent activity (last 10 entries)
  const { data: recentActivities } = await supabase
    .from('activity_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);

  // 7. Fetch tasks due this week (including client details)
  const { data: tasksThisWeek } = await supabase
    .from('tasks')
    .select('*, client:clients(name)')
    .neq('status', 'done')
    .lte('due_date', nextWeekStr)
    .order('due_date', { ascending: true })
    .limit(15);

  // 8. Fetch agency self-client info for mini-dashboard row
  const { data: agencyClient } = await supabase
    .from('clients')
    .select('id')
    .eq('is_agency_self', true)
    .maybeSingle();

  let latestSeo = null;
  let latestInsta = null;

  if (agencyClient) {
    const { data: seoData } = await supabase
      .from('seo_campaigns')
      .select('organic_traffic, keywords_top10, gbp_calls')
      .eq('client_id', agencyClient.id)
      .order('month_year', { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: instaData } = await supabase
      .from('social_media_metrics')
      .select('followers')
      .eq('client_id', agencyClient.id)
      .eq('platform', 'instagram')
      .order('month_year', { ascending: false })
      .limit(1)
      .maybeSingle();

    latestSeo = seoData;
    latestInsta = instaData;
  }

  const hasAgencyData = !!(latestSeo || latestInsta);

  return (
    <PageContainer
      title="Overview"
      description="Veloxis Global CRM Operations Hub."
      actions={
        <div className="flex items-center gap-2 select-none">
          <span className="text-[11px] text-text-secondary bg-bg-card border border-border/20 px-2.5 py-1 rounded font-medium">
            {getMonthYear(now)}
          </span>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Row 1 — 4 StatCards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Active Clients"
            value={activeClientsCount || 0}
            icon={Users}
            className="h-full"
          >
            <div className="text-[11px] text-text-tertiary mt-1 select-none font-sans">
              {pipelineLeadsCount || 0} leads in pipeline
            </div>
          </StatCard>

          <StatCard
            title="Active Projects"
            value={activeProjectsCount || 0}
            icon={Briefcase}
            className="h-full"
          />

          <StatCard
            title="Revenue This Month"
            value={formatCurrency(revenueThisMonth)}
            change={revenueChange}
            changeType={revenueChangeType}
            icon={DollarSign}
            valueClassName="text-accent"
            className="h-full"
          />

          <StatCard
            title="Tasks Due Today"
            value={tasksDueTodayCount || 0}
            icon={ListTodo}
            className="h-full"
          >
            {overdueTasksCount ? (
              <div className="flex items-center gap-1 mt-1 text-[11px] text-error font-semibold select-none font-sans">
                <AlertTriangle size={10} className="shrink-0" />
                <span>{overdueTasksCount} overdue</span>
              </div>
            ) : null}
          </StatCard>
        </div>

        {/* Row 2 — Revenue Line Chart */}
        <div className="w-full">
          <RevenueChart data={last6MonthsData} />
        </div>

        {/* Row 3 — Two column grid (60% / 40%) */}
        <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
          {/* Left Column — Recent Activity (60%) */}
          <Card variant="default" className="lg:col-span-6 p-[20px] md:p-[24px] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4 select-none">
                <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                  <Activity size={15} className="text-primary" />
                  <span>Recent Activity</span>
                </h3>
              </div>

              {recentActivities && recentActivities.length > 0 ? (
                <div className="space-y-4">
                  {recentActivities.map((act) => {
                    let dotColor = 'bg-text-tertiary'; // default
                    if (act.action === 'INSERT' || act.action?.toLowerCase().includes('create')) {
                      dotColor = 'bg-success';
                    } else if (act.action === 'UPDATE' || act.action?.toLowerCase().includes('edit')) {
                      dotColor = 'bg-primary';
                    } else if (act.action === 'DELETE' || act.action?.toLowerCase().includes('remove')) {
                      dotColor = 'bg-error';
                    }

                    return (
                      <div key={act.id} className="flex items-start gap-3 text-xs leading-relaxed group">
                        <span className={`h-1.5 w-1.5 rounded-full ${dotColor} mt-1.5 shrink-0`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-text-primary font-medium truncate group-hover:text-primary-light transition-colors duration-150">
                            {act.title}
                          </p>
                          {act.description && (
                            <p className="text-text-secondary text-[11px] mt-0.5 line-clamp-1">
                              {act.description}
                            </p>
                          )}
                        </div>
                        <span className="text-[10px] text-text-tertiary shrink-0 font-mono select-none">
                          {timeAgo(act.created_at)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <EmptyState
                  icon={Activity}
                  title="No Activity Logged"
                  description="System actions and updates will appear here as you use the CRM."
                  className="py-12"
                />
              )}
            </div>

            {recentActivities && recentActivities.length > 0 && (
              <div className="border-t border-border/20 mt-4 pt-3 flex justify-end">
                <Link
                  href="/dashboard/it"
                  className="text-[11px] font-semibold text-primary-light hover:text-primary flex items-center gap-1 transition-colors select-none"
                >
                  <span>View Audit Log</span>
                  <ArrowRight size={12} />
                </Link>
              </div>
            )}
          </Card>

          {/* Right Column — Tasks Due This Week (40%) */}
          <Card variant="default" className="lg:col-span-4 p-[20px] md:p-[24px] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4 select-none">
                <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                  <Calendar size={15} className="text-success" />
                  <span>Tasks Due This Week</span>
                </h3>
              </div>

              {tasksThisWeek && tasksThisWeek.length > 0 ? (
                <div className="space-y-3.5">
                  {tasksThisWeek.map((task) => {
                    const isOverdue = task.due_date && task.due_date < todayStr;
                    const clientName = (task as unknown as { client?: { name: string } | null }).client?.name || 'Veloxis Global';

                    return (
                      <div key={task.id} className="flex items-start justify-between gap-3 text-xs border-b border-border/10 pb-2.5 last:border-0 last:pb-0">
                        <div className="min-w-0">
                          <p className="text-[10px] font-bold text-text-primary truncate select-all">
                            {clientName}
                          </p>
                          <p className="text-text-secondary text-xs mt-0.5 truncate font-medium">
                            {task.title}
                          </p>
                          <span
                            className={`inline-block text-[10px] mt-1 font-mono select-none ${
                              isOverdue ? 'text-error font-semibold' : 'text-text-tertiary'
                            }`}
                          >
                            {isOverdue ? 'Overdue: ' : 'Due: '}
                            {task.due_date ? task.due_date.substring(5) : 'No date'}
                          </span>
                        </div>
                        <StatusBadge status={task.priority} className="text-[9px] px-1.5 py-0 shrink-0" />
                      </div>
                    );
                  })}
                </div>
              ) : (
                <EmptyState
                  icon={Calendar}
                  title="No Tasks Scheduled"
                  description="No deliverables are scheduled for this week. Add projects to begin."
                  className="py-12"
                />
              )}
            </div>

            {tasksThisWeek && tasksThisWeek.length > 0 && (
              <div className="border-t border-border/20 mt-4 pt-3 flex justify-end">
                <Link
                  href="/dashboard/operations"
                  className="text-[11px] font-semibold text-primary-light hover:text-primary flex items-center gap-1 transition-colors select-none"
                >
                  <span>Go to Calendar</span>
                  <ArrowRight size={12} />
                </Link>
              </div>
            )}
          </Card>
        </div>

        {/* Row 4 — "My Agency" Mini Section */}
        <Card variant="default" className="w-full p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 select-none">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-accent/15 border border-accent/30 flex items-center justify-center text-accent">
              <Building2 size={16} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-bold text-text-primary">veloxisglobal.com</h4>
                <StatusBadge status="agency_self" className="text-[9px] px-1.5 py-0" />
              </div>
              <p className="text-[10px] text-text-tertiary mt-0.5 uppercase tracking-wide font-medium">
                Agency SEO & Social Performance
              </p>
            </div>
          </div>

          {hasAgencyData ? (
            <div className="flex flex-wrap items-center gap-x-8 gap-y-2 md:gap-x-12">
              <div className="flex flex-col">
                <span className="text-[9px] text-text-tertiary uppercase tracking-wider">Organic Traffic</span>
                <span className="text-xs font-bold font-mono text-text-primary mt-0.5">
                  {latestSeo?.organic_traffic?.toLocaleString() || '-'}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-[9px] text-text-tertiary uppercase tracking-wider">Top 10 Keywords</span>
                <span className="text-xs font-bold font-mono text-text-primary mt-0.5">
                  {latestSeo?.keywords_top10 || '-'}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-[9px] text-text-tertiary uppercase tracking-wider">Instagram Followers</span>
                <span className="text-xs font-bold font-mono text-text-primary mt-0.5">
                  {latestInsta?.followers?.toLocaleString() || '-'}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-[9px] text-text-tertiary uppercase tracking-wider">GBP Calls</span>
                <span className="text-xs font-bold font-mono text-text-primary mt-0.5">
                  {latestSeo?.gbp_calls || '-'}
                </span>
              </div>
            </div>
          ) : (
            <div className="text-xs text-text-secondary italic">
              Connect GSC to see your agency&apos;s performance here
            </div>
          )}

          <div className="shrink-0 flex items-center justify-end">
            <Link href="/dashboard/my-agency">
              <Button
                variant="outline"
                size="xs"
                className="bg-bg-card-hover/20 hover:bg-bg-card-hover/40 border border-border/20 text-text-secondary hover:text-text-primary text-[11px] h-8 px-3 cursor-pointer"
              >
                <span>View Details</span>
                <ArrowRight size={11} className="ml-1" />
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    </PageContainer>
  );
}
