// app/(admin)/dashboard/web-design/page.tsx

import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { WebDesignDashboard } from '@/components/admin/web-design/web-design-dashboard';

export const revalidate = 0;

export default async function WebDesignPage() {
  const supabase = await createClient();

  // 1. Fetch active clients and agency self-client
  const { data: clients } = await supabase
    .from('clients')
    .select('*')
    .or('status.eq.active,is_agency_self.eq.true')
    .order('name', { ascending: true });

  // 2. Fetch all web projects
  const { data: projects } = await supabase
    .from('web_projects')
    .select('*')
    .order('created_at', { ascending: false });

  return (
    <WebDesignDashboard
      initialClients={clients || []}
      initialProjects={projects || []}
    />
  );
}
