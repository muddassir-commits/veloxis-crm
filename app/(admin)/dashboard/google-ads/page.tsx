import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { PageContainer } from '@/components/shared/page-container';
import { GoogleAdsDashboard } from '@/components/ads/google-ads-dashboard';
import { GoogleAdsConnection } from '@/types';


export const revalidate = 0;

interface PageProps {
  searchParams: Promise<{ month?: string }>;
}

function getCurrentMonthString() {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const now = new Date();
  return `${months[now.getMonth()]} ${now.getFullYear()}`;
}

export default async function GoogleAdsPage({ searchParams }: PageProps) {
  const resolvedParams = await searchParams;
  const selectedMonth = resolvedParams.month || getCurrentMonthString();

  const supabase = await createClient();

  // 1. Fetch active clients and the agency self-client
  const { data: clients } = await supabase
    .from('clients')
    .select('*')
    .or('status.eq.active,is_agency_self.eq.true')
    .order('name', { ascending: true });

  // 2. Fetch Google Ads Campaigns for selected month
  const { data: campaigns } = await supabase
    .from('google_ads_campaigns')
    .select('*')
    .eq('month_year', selectedMonth);

  // 3. Fetch Negative Keywords
  const { data: negativeKeywords } = await supabase
    .from('google_ads_negative_keywords')
    .select('*')
    .order('created_at', { ascending: false });

  // 4. Fetch Google Ads connections (with schema check safety fallback)
  let connections: GoogleAdsConnection[] = [];
  try {

    const { data } = await supabase
      .from('google_ads_connections')
      .select('*');
    connections = data || [];
  } catch (e) {
    console.warn('google_ads_connections table not available yet, using empty array.', e);
  }

  return (
    <PageContainer
      title="Google Ads Campaigns"
      description="Monitor client and agency Google Search, Display, and Performance Max ad spends, conversions, and CTR."
    >
      <GoogleAdsDashboard
        initialClients={clients || []}
        initialCampaigns={campaigns || []}
        initialNegativeKeywords={negativeKeywords || []}
        initialConnections={connections}
        selectedMonth={selectedMonth}
      />
    </PageContainer>
  );
}
