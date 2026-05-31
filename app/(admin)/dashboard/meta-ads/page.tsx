// app/(admin)/dashboard/meta-ads/page.tsx

import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { PageContainer } from '@/components/shared/page-container';
import { MetaAdsDashboard } from '@/components/ads/meta-ads-dashboard';

export const revalidate = 0;

interface PageProps {
  searchParams: Promise<{ month?: string }>;
}

function getCurrentMonthString() {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const now = new Date();
  return `${months[now.getMonth()]} ${now.getFullYear()}`;
}

export default async function MetaAdsPage({ searchParams }: PageProps) {
  const resolvedParams = await searchParams;
  const selectedMonth = resolvedParams.month || getCurrentMonthString();

  const supabase = await createClient();

  // 1. Fetch active clients and the agency self-client
  const { data: clients } = await supabase
    .from('clients')
    .select('*')
    .or('status.eq.active,is_agency_self.eq.true')
    .order('name', { ascending: true });

  // 2. Fetch Meta Campaigns for selected month
  const { data: campaigns } = await supabase
    .from('meta_campaigns')
    .select('*')
    .eq('month_year', selectedMonth);

  // 3. Fetch Meta connections
  const { data: connections } = await supabase
    .from('meta_connections')
    .select('*');

  return (
    <PageContainer
      title="Meta Ads Campaigns"
      description="Monitor client and agency Facebook & Instagram ad spends, leads, CTR, and CPL metrics."
    >
      <MetaAdsDashboard
        initialClients={clients || []}
        initialCampaigns={campaigns || []}
        initialConnections={connections || []}
        selectedMonth={selectedMonth}
      />
    </PageContainer>
  );
}
