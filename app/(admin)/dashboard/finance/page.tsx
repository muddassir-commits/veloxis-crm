import React, { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { PageContainer } from '@/components/shared/page-container';
import { FinanceDashboard } from '@/components/finance/finance-dashboard';
import { getMonthYear } from '@/lib/utils';

export const revalidate = 0; // Dynamic server-side rendering

interface PageProps {
  searchParams: Promise<{ page?: string; status?: string }>;
}

export default async function FinancePage({ searchParams }: PageProps) {
  const resolvedParams = await searchParams;
  const currentPage = resolvedParams.page ? parseInt(resolvedParams.page, 10) : 1;
  const currentStatus = resolvedParams.status || 'all';

  const supabase = await createClient();
  const todayStr = new Date().toISOString().split('T')[0];

  // 1. Auto-detect overdue: UPDATE pending invoices whose due_date is in the past
  await supabase
    .from('invoices')
    .update({ status: 'overdue' })
    .eq('status', 'pending')
    .lt('due_date', todayStr);

  // 2. Fetch active clients (non-agency, active status)
  const { data: clients } = await supabase
    .from('clients')
    .select('*')
    .eq('status', 'active')
    .eq('is_agency_self', false)
    .order('name', { ascending: true });

  // 3. Fetch paginated invoices for Table
  let invoicesQuery = supabase
    .from('invoices')
    .select('*, clients(name)', { count: 'exact' });

  if (currentStatus !== 'all') {
    invoicesQuery = invoicesQuery.eq('status', currentStatus);
  }

  const { data: invoices, count: invoicesCount } = await invoicesQuery
    .order('issued_date', { ascending: false })
    .range((currentPage - 1) * 20, currentPage * 20 - 1);

  // 4. Fetch Stats
  const currentMonthStr = getMonthYear(new Date());
  
  const lastMonthDate = new Date();
  lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);
  const lastMonthStr = getMonthYear(lastMonthDate);

  // Collected this month
  const { data: collectedThisMonthData } = await supabase
    .from('invoices')
    .select('total_amount')
    .eq('status', 'paid')
    .eq('month_year', currentMonthStr);

  // Collected last month
  const { data: collectedLastMonthData } = await supabase
    .from('invoices')
    .select('total_amount')
    .eq('status', 'paid')
    .eq('month_year', lastMonthStr);

  // Outstanding
  const { data: outstandingData } = await supabase
    .from('invoices')
    .select('total_amount')
    .eq('status', 'pending');

  // Overdue
  const { data: overdueData } = await supabase
    .from('invoices')
    .select('total_amount')
    .eq('status', 'overdue');

  const mrr = clients?.reduce((sum, c) => sum + Number(c.monthly_retainer || 0), 0) || 0;
  const collectedThisMonth = collectedThisMonthData?.reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0) || 0;
  const collectedLastMonth = collectedLastMonthData?.reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0) || 0;
  const outstanding = outstandingData?.reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0) || 0;
  const overdue = overdueData?.reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0) || 0;

  // Percentage change in collected
  let collectedChangePct = 0;
  if (collectedLastMonth > 0) {
    collectedChangePct = Math.round(((collectedThisMonth - collectedLastMonth) / collectedLastMonth) * 100);
  } else if (collectedThisMonth > 0) {
    collectedChangePct = 100;
  }

  // 5. Fetch expenses
  const { data: expenses } = await supabase
    .from('expenses')
    .select('*')
    .order('date', { ascending: false });

  // 6. Fetch stipends
  const { data: stipends } = await supabase
    .from('stipend_payments')
    .select('*')
    .order('month_year', { ascending: false });

  // 7. Fetch profiles & employees
  const { data: profiles } = await supabase.from('profiles').select('*');
  const { data: employees } = await supabase.from('employees').select('*');

  const stats = {
    mrr,
    collectedThisMonth,
    collectedChangePct,
    outstanding,
    overdue,
  };

  return (
    <PageContainer title="Finance" description="Track invoices, retainers, stipends, and expenses.">
      <Suspense fallback={<div className="text-sm text-text-muted animate-pulse">Loading finance console...</div>}>
        <FinanceDashboard
          clients={clients || []}
          invoices={invoices || []}
          invoicesCount={invoicesCount || 0}
          expenses={expenses || []}
          stipendPayments={stipends || []}
          employees={employees || []}
          profiles={profiles || []}
          stats={stats}
        />
      </Suspense>
    </PageContainer>
  );
}
