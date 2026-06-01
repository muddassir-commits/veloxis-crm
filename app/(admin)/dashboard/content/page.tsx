// app/(admin)/dashboard/content/page.tsx

import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { ContentDashboard } from '@/components/admin/content/content-dashboard';

export const revalidate = 0;

export default async function ContentPage() {
  const supabase = await createClient();

  // 1. Fetch active clients and agency self-client
  const { data: clients } = await supabase
    .from('clients')
    .select('*')
    .or('status.eq.active,is_agency_self.eq.true')
    .order('name', { ascending: true });

  // 2. Fetch all content pipeline items
  const { data: items } = await supabase
    .from('content_items')
    .select('*')
    .order('created_at', { ascending: false });

  // 3. Fetch active employees (interns) and admins for assignments
  const { data: employees } = await supabase
    .from('profiles')
    .select('*')
    .in('role', ['employee', 'admin'])
    .eq('is_active', true)
    .order('full_name', { ascending: true });

  return (
    <ContentDashboard
      initialClients={clients || []}
      initialItems={items || []}
      initialEmployees={employees || []}
    />
  );
}
