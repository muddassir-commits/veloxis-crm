import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { ClientReportsViewer } from '@/components/portal/client-reports-viewer';

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
      />
    </div>
  );
}
