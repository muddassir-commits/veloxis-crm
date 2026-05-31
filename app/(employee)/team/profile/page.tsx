import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { EmployeeProfilePage } from '@/components/employee/employee-profile-page';

export const revalidate = 0;

export default async function ProfilePage() {
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

  // Fetch employee extra details (employees.id = profiles.id due to FK reference)
  const { data: employee } = await supabase
    .from('employees')
    .select('*')
    .eq('id', user.id)
    .single();

  // Stipend payments (last 6 months)
  const { data: stipends } = await supabase
    .from('stipend_payments')
    .select('*')
    .eq('employee_id', user.id)
    .order('month_year', { ascending: false })
    .limit(6);

  // Tasks assigned to this employee (for stats)
  const currentMonthYear = new Date().toLocaleString('en-US', { month: 'short', year: 'numeric' });
  const { data: tasksThisMonth } = await supabase
    .from('tasks')
    .select('status, clients(name)')
    .eq('assigned_to', user.id)
    .eq('month_year', currentMonthYear);

  // Distinct clients this employee serves
  const clientNames = [...new Set(
    (tasksThisMonth || [])
      .filter((t) => t.clients)
      .map((t) => {
        const client = t.clients;
        if (Array.isArray(client)) {
          return (client as { name: string }[])[0]?.name || null;
        }
        return (client as { name: string } | null)?.name || null;
      })
      .filter((name): name is string => name !== null)
  )];

  return (
    <EmployeeProfilePage
      profile={profile}
      employee={employee}
      stipends={stipends || []}
      tasksThisMonth={tasksThisMonth || []}
      clientNames={clientNames}
    />
  );
}
