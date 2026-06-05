// app/(admin)/dashboard/reports/page.tsx

import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { ReportsDashboard } from '@/components/admin/reports/reports-dashboard';
import { GeneratedReport } from '@/types';

export const revalidate = 0;

interface PageProps {
  searchParams: Promise<{ month?: string; clientId?: string }>;
}

function getCurrentMonthString() {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const now = new Date();
  return `${months[now.getMonth()]} ${now.getFullYear()}`;
}

function getPreviousMonthString(monthYear: string) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const [month, year] = monthYear.split(' ');
  const monthIndex = months.indexOf(month);
  if (monthIndex === -1) return '';
  const date = new Date(Number(year), monthIndex, 1);
  date.setMonth(date.getMonth() - 1);
  return `${months[date.getMonth()]} ${date.getFullYear()}`;
}

export default async function ReportsPage({ searchParams }: PageProps) {
  const resolvedParams = await searchParams;
  const selectedMonth = resolvedParams.month || getCurrentMonthString();
  const selectedClientId = resolvedParams.clientId || '';

  const supabase = await createClient();

  // 1. Fetch active clients and the agency self-client
  const { data: clients } = await supabase
    .from('clients')
    .select('*')
    .or('status.eq.active,is_agency_self.eq.true')
    .order('name', { ascending: true });

  // 2. Fetch existing generated reports joined with files table
  const { data: reports } = await supabase
    .from('generated_reports')
    .select(`
      *,
      files:file_id (
        name,
        public_url,
        storage_path,
        size_bytes
      )
    `)
    .order('created_at', { ascending: false });

  // 3. Fetch GSC, GA4, Meta, and Google Ads connection details to highlight connection status
  const { data: gscConns } = await supabase.from('gsc_connections').select('*');
  const { data: ga4Conns } = await supabase.from('ga4_connections').select('*');
  const { data: metaConns } = await supabase.from('meta_connections').select('*');
  const { data: googleAdsConns } = await supabase.from('google_ads_connections').select('*');

  // 4. Fetch metrics for selected client and month if clientId is selected
  let selectedClientData = null;
  let seoData = null;
  let prevSeoData = null;
  let keywordsData = [];
  let metaData = [];
  let prevMetaData = [];
  let googleAdsData = [];
  let prevGoogleAdsData = [];
  let socialData = [];
  let prevSocialData = [];

  if (selectedClientId) {
    // Find client
    selectedClientData = clients?.find(c => c.id === selectedClientId) || null;

    const prevMonth = getPreviousMonthString(selectedMonth);

    // Fetch SEO Campaign for current & prev month
    const { data: seo } = await supabase
      .from('seo_campaigns')
      .select('*')
      .eq('client_id', selectedClientId)
      .eq('month_year', selectedMonth)
      .maybeSingle();
    seoData = seo;

    const { data: prevSeo } = await supabase
      .from('seo_campaigns')
      .select('*')
      .eq('client_id', selectedClientId)
      .eq('month_year', prevMonth)
      .maybeSingle();
    prevSeoData = prevSeo;

    // Fetch Keywords
    const { data: keywords } = await supabase
      .from('seo_keywords')
      .select('*')
      .eq('client_id', selectedClientId)
      .eq('month_year', selectedMonth);
    keywordsData = keywords || [];

    // Fetch Meta Campaigns current & prev month
    const { data: meta } = await supabase
      .from('meta_campaigns')
      .select('*')
      .eq('client_id', selectedClientId)
      .eq('month_year', selectedMonth);
    metaData = meta || [];

    const { data: prevMeta } = await supabase
      .from('meta_campaigns')
      .select('*')
      .eq('client_id', selectedClientId)
      .eq('month_year', prevMonth);
    prevMetaData = prevMeta || [];

    // Fetch Google Ads Campaigns current & prev month
    const { data: gads } = await supabase
      .from('google_ads_campaigns')
      .select('*')
      .eq('client_id', selectedClientId)
      .eq('month_year', selectedMonth);
    googleAdsData = gads || [];

    const { data: prevGads } = await supabase
      .from('google_ads_campaigns')
      .select('*')
      .eq('client_id', selectedClientId)
      .eq('month_year', prevMonth);
    prevGoogleAdsData = prevGads || [];

    // Fetch Social Media Metrics current & prev month
    const { data: social } = await supabase
      .from('social_media_metrics')
      .select('*')
      .eq('client_id', selectedClientId)
      .eq('month_year', selectedMonth);
    socialData = social || [];

    const { data: prevSocial } = await supabase
      .from('social_media_metrics')
      .select('*')
      .eq('client_id', selectedClientId)
      .eq('month_year', prevMonth);
    prevSocialData = prevSocial || [];
  }

  const reportsRaw = (reports || []) as unknown as GeneratedReport[];
  const formattedReports = reportsRaw.map(r => ({
    ...r,
    files: Array.isArray(r.files) ? r.files[0] : r.files
  })) as GeneratedReport[];

  return (
    <ReportsDashboard
      initialClients={clients || []}
      initialReports={formattedReports}
      initialGscConns={gscConns || []}
      initialGa4Conns={ga4Conns || []}
      initialMetaConns={metaConns || []}
      initialGoogleAdsConns={googleAdsConns || []}
      selectedMonth={selectedMonth}
      selectedClientId={selectedClientId}
      selectedClientData={selectedClientData}
      seoData={seoData}
      prevSeoData={prevSeoData}
      keywordsData={keywordsData}
      metaData={metaData}
      prevMetaData={prevMetaData}
      googleAdsData={googleAdsData}
      prevGoogleAdsData={prevGoogleAdsData}
      socialData={socialData}
      prevSocialData={prevSocialData}
    />
  );
}
