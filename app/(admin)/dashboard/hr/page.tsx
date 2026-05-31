import React, { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { PageContainer } from '@/components/shared/page-container';
import { HRDashboard } from '@/components/hr/hr-dashboard';
import { getMonthYear } from '@/lib/utils';

export const revalidate = 0; // Dynamic server-side rendering

export default async function HRPage() {
  const supabase = await createClient();

  // 1. Fetch employee profiles + employee details (joined 1:1)
  const { data: employees } = await supabase
    .from('profiles')
    .select('*, employees:employees(*)')
    .eq('role', 'employee')
    .order('full_name', { ascending: true });

  // 2. Fetch tasks for the current month to calculate performance stats
  const currentMonthStr = getMonthYear(new Date());
  const { data: tasks } = await supabase
    .from('tasks')
    .select('*')
    .eq('month_year', currentMonthStr);

  // 3. Fetch stipend payments for the current month
  const { data: stipends } = await supabase
    .from('stipend_payments')
    .select('*')
    .eq('month_year', currentMonthStr);

  return (
    <PageContainer title="HR & Team" description="Manage team members, roles, performance, and stipends.">
      <Suspense fallback={<div className="text-sm text-[#8BA3C7] animate-pulse">Loading HR dashboard...</div>}>
        <HRDashboard
          employees={employees || []}
          tasks={tasks || []}
          stipends={stipends || []}
        />
      </Suspense>
    </PageContainer>
  );
}
