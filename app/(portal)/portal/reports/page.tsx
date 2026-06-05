import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { ClientReportsViewer } from '@/components/portal/client-reports-viewer';
import { GeneratedReport } from '@/types';

export const revalidate = 0;

export default async function ReportsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  // Retrieve client associated with this portal user
  const { data: client } = await supabase
    .from('clients')
    .select('*')
    .eq('portal_user_id', user.id)
    .single();

  if (!client) redirect('/login');

  // Fetch SEO Campaigns
  const { data: seoCampaigns } = await supabase
    .from('seo_campaigns')
    .select('*')
    .eq('client_id', client.id)
    .order('month_year', { ascending: false });

  // Fetch tracked SEO keywords
  const { data: keywords } = await supabase
    .from('seo_keywords')
    .select('*')
    .eq('client_id', client.id)
    .order('current_position', { ascending: true });

  // Fetch Meta Campaigns
  const { data: metaCampaigns } = await supabase
    .from('meta_campaigns')
    .select('*')
    .eq('client_id', client.id)
    .order('created_at', { ascending: false });

  // Fetch Google Ads Campaigns
  const { data: googleCampaigns } = await supabase
    .from('google_ads_campaigns')
    .select('*')
    .eq('client_id', client.id)
    .order('created_at', { ascending: false });

  // Fetch Sent Generated Reports joined with files
  const { data: reports } = await supabase
    .from('generated_reports')
    .select(`
      id,
      month_year,
      created_at,
      files:file_id (
        name,
        public_url,
        size_bytes
      )
    `)
    .eq('client_id', client.id)
    .eq('status', 'sent')
    .order('created_at', { ascending: false });

  const reportsRaw = (reports || []) as unknown as GeneratedReport[];
  const formattedReports = reportsRaw.map(r => ({
    ...r,
    files: Array.isArray(r.files) ? r.files[0] : r.files
  }));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-bold text-[#0A1628]">Marketing & Campaign Reports</h1>
        <p className="text-xs text-[#475569] mt-0.5">
          View your SEO search rankings, traffic stats, and paid advertising performance results.
        </p>
      </div>

      <ClientReportsViewer
        seoCampaigns={seoCampaigns || []}
        keywords={keywords || []}
        metaCampaigns={metaCampaigns || []}
        googleCampaigns={googleCampaigns || []}
        reports={formattedReports as unknown as Parameters<typeof ClientReportsViewer>[0]['reports']}
      />
    </div>
  );
}
