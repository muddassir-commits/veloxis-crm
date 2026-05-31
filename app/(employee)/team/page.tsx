import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { EmployeeTodayDashboard } from '@/components/employee/employee-today-dashboard';

export const revalidate = 0;

export default async function TeamPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  // Fetch employee profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'employee') redirect('/login');

  // Get today's date in ISO format
  const today = new Date().toISOString().split('T')[0];
  const currentMonthYear = new Date().toLocaleString('en-US', { month: 'short', year: 'numeric' });

  // Tasks due today (not done)
  const { data: todayTasks } = await supabase
    .from('tasks')
    .select('*, clients(name, is_agency_self)')
    .eq('assigned_to', user.id)
    .eq('due_date', today)
    .neq('status', 'done')
    .order('priority', { ascending: false });

  // Tasks due this week (next 7 days, not today, not done)
  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);
  const { data: upcomingTasks } = await supabase
    .from('tasks')
    .select('*, clients(name)')
    .eq('assigned_to', user.id)
    .gt('due_date', today)
    .lte('due_date', nextWeek.toISOString().split('T')[0])
    .neq('status', 'done')
    .order('due_date', { ascending: true });

  // Stats for this month
  const { data: allMonthTasks } = await supabase
    .from('tasks')
    .select('status, completed_at, due_date')
    .eq('assigned_to', user.id)
    .eq('month_year', currentMonthYear);

  const doneTodayCount = (allMonthTasks || []).filter(
    (t) => t.completed_at && t.completed_at.startsWith(today)
  ).length;

  const doneWeekCount = (allMonthTasks || []).filter((t) => {
    if (!t.completed_at) return false;
    const completedDate = new Date(t.completed_at);
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    return completedDate >= weekStart;
  }).length;

  const pendingCount = (allMonthTasks || []).filter((t) =>
    t.status === 'todo' || t.status === 'in_progress'
  ).length;

  const overdueCount = (allMonthTasks || []).filter((t) => {
    if (t.status === 'done') return false;
    if (!t.due_date) return false;
    return t.due_date < today;
  }).length;

  return (
    <EmployeeTodayDashboard
      profile={profile}
      todayTasks={todayTasks || []}
      upcomingTasks={upcomingTasks || []}
      stats={{
        doneToday: doneTodayCount,
        doneWeek: doneWeekCount,
        pending: pendingCount,
        overdue: overdueCount,
      }}
    />
  );
}
