import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { EmployeeTasksPage } from '@/components/employee/employee-tasks-page';

export const revalidate = 0;

interface TasksPageProps {
  searchParams: Promise<{ month?: string; status?: string; submit?: string }>;
}

export default async function TasksPage({ searchParams }: TasksPageProps) {
  const params = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'employee') redirect('/login');

  // Month filter — default to current month
  const selectedMonth =
    params.month ||
    new Date().toLocaleString('en-US', { month: 'short', year: 'numeric' });

  // Fetch tasks for this employee in this month
  const { data: tasks } = await supabase
    .from('tasks')
    .select('*, clients(name, is_agency_self)')
    .eq('assigned_to', user.id)
    .eq('month_year', selectedMonth)
    .order('due_date', { ascending: true });

  // Fetch clients where this employee has tasks (for submission target info)
  const clientIds = [...new Set((tasks || []).map((t) => t.client_id).filter(Boolean))];
  const { data: clients } = await supabase
    .from('clients')
    .select('id, name')
    .in('id', clientIds.length > 0 ? clientIds : ['00000000-0000-0000-0000-000000000000']);

  return (
    <EmployeeTasksPage
      tasks={tasks || []}
      clients={clients || []}
      selectedMonth={selectedMonth}
      openSubmitTaskId={params.submit}
      employeeId={user.id}
    />
  );
}
