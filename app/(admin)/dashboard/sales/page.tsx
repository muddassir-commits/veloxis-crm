import React from 'react';
import { PageContainer } from '@/components/shared/page-container';
import { createClient } from '@/lib/supabase/server';
import { SalesDashboard } from '@/components/admin/sales-dashboard';

export const revalidate = 0; // Dynamic server-side rendering

export default async function SalesPage() {
  const supabase = await createClient();

  // 1. Fetch leads (sorted by updated_at DESC)
  const { data: leads, error: leadsError } = await supabase
    .from('leads')
    .select('*')
    .order('updated_at', { ascending: false });

  if (leadsError) {
    console.error('Error fetching leads:', leadsError);
  }

  // 2. Fetch outreach logs (sorted by date DESC)
  const { data: outreachLogs, error: logsError } = await supabase
    .from('outreach_log')
    .select('*')
    .order('date', { ascending: false });

  if (logsError) {
    console.error('Error fetching outreach logs:', logsError);
  }

  // 3. Fetch active agent profiles (sorted by name)
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('*')
    .eq('is_active', true)
    .order('full_name', { ascending: true });

  if (profilesError) {
    console.error('Error fetching profiles:', profilesError);
  }

  return (
    <PageContainer
      title="Sales Department"
      description="Manage lead pipeline, outreach logs, and sales performance analytics."
    >
      <SalesDashboard
        initialLeads={leads}
        initialOutreachLogs={outreachLogs}
        profiles={profiles}
      />
    </PageContainer>
  );
}
