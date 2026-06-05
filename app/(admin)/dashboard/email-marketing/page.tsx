import React, { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { PageContainer } from '@/components/shared/page-container';
import { MarketingCampaignsDashboard } from '@/components/admin/marketing/marketing-campaigns-dashboard';

export const revalidate = 0; // Dynamic server-side rendering

export default async function EmailMarketingPage() {
  const supabase = await createClient();

  // 1. Fetch clients
  const { data: clients } = await supabase
    .from('clients')
    .select('*')
    .order('name', { ascending: true });

  // 2. Fetch email campaigns
  const { data: emailCampaigns } = await supabase
    .from('agency_email_campaigns')
    .select('*, clients(name)')
    .order('created_at', { ascending: false });

  // 3. Fetch WhatsApp campaigns
  const { data: whatsappCampaigns } = await supabase
    .from('agency_whatsapp_campaigns')
    .select('*, clients(name)')
    .order('created_at', { ascending: false });

  // 4. Fetch templates
  const { data: templates } = await supabase
    .from('message_templates')
    .select('*')
    .order('name', { ascending: true });

  return (
    <PageContainer title="Email & WhatsApp Marketing" description="Manage campaign calendars, templates, and analytics for both agency marketing and client deliveries.">
      <Suspense fallback={<div className="text-sm text-[#8BA3C7] animate-pulse">Loading Marketing Campaigns Dashboard...</div>}>
        <MarketingCampaignsDashboard
          clients={clients || []}
          initialEmailCampaigns={emailCampaigns || []}
          initialWhatsappCampaigns={whatsappCampaigns || []}
          initialTemplates={templates || []}
        />
      </Suspense>
    </PageContainer>
  );
}
