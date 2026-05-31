// app/(admin)/dashboard/seo/page.tsx

import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { SeoDashboard } from '@/components/seo/seo-dashboard';

export const revalidate = 0;

interface PageProps {
  searchParams: Promise<{ month?: string }>;
}

function getCurrentMonthString() {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const now = new Date();
  return `${months[now.getMonth()]} ${now.getFullYear()}`;
}

export default async function SeoPage({ searchParams }: PageProps) {
  const resolvedParams = await searchParams;
  const selectedMonth = resolvedParams.month || getCurrentMonthString();

  const supabase = await createClient();

  // 1. Fetch active clients and the agency self-client
  const { data: clients } = await supabase
    .from('clients')
    .select('*')
    .or('status.eq.active,is_agency_self.eq.true')
    .order('name', { ascending: true });

  // 2. Fetch SEO Campaigns for selected month
  const { data: campaigns } = await supabase
    .from('seo_campaigns')
    .select('*')
    .eq('month_year', selectedMonth);

  // 3. Fetch Keywords for selected month
  const { data: keywords } = await supabase
    .from('seo_keywords')
    .select('*')
    .eq('month_year', selectedMonth);

  // 4. Fetch GSC connections
  const { data: gscConns } = await supabase
    .from('gsc_connections')
    .select('*');

  // 5. Fetch GA4 connections
  const { data: ga4Conns } = await supabase
    .from('ga4_connections')
    .select('*');

  return (
    <SeoDashboard
      initialClients={clients || []}
      initialCampaigns={campaigns || []}
      initialKeywords={keywords || []}
      initialGscConns={gscConns || []}
      initialGa4Conns={ga4Conns || []}
      selectedMonth={selectedMonth}
    />
  );
}
