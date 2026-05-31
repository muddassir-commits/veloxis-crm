import React from 'react';
import { PageContainer } from '@/components/shared/page-container';
import { EmptyState } from '@/components/shared/empty-state';
import { StatusBadge } from '@/components/shared/status-badge';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/server';
import { Building2, RefreshCw } from 'lucide-react';
import { AgencyDashboard } from '@/components/admin/agency-dashboard';

export default async function MyAgencyPage() {
  const supabase = await createClient();

  // 1. Fetch the self-client (Veloxis Global itself)
  const { data: agencyClient, error: clientError } = await supabase
    .from('clients')
    .select('*')
    .eq('is_agency_self', true)
    .maybeSingle();

  if (clientError || !agencyClient) {
    return (
      <PageContainer title="My Agency" description="Track veloxisglobal.com performance.">
        <EmptyState
          icon={Building2}
          title="Self-Client Not Found"
          description="The agency self-client has not been seeded in the database yet. Run the seed API first."
        />
      </PageContainer>
    );
  }

  // 2. Fetch all campaign datasets for the agency
  const { data: seoCampaigns } = await supabase
    .from('seo_campaigns')
    .select('*')
    .eq('client_id', agencyClient.id)
    .order('month_year', { ascending: false });

  const { data: seoKeywords } = await supabase
    .from('seo_keywords')
    .select('*')
    .eq('client_id', agencyClient.id)
    .order('current_position', { ascending: true });

  const { data: socialMetrics } = await supabase
    .from('social_media_metrics')
    .select('*')
    .eq('client_id', agencyClient.id)
    .order('month_year', { ascending: false });

  const { data: whatsappCampaigns } = await supabase
    .from('agency_whatsapp_campaigns')
    .select('*')
    .order('month_year', { ascending: false });

  const { data: emailCampaigns } = await supabase
    .from('agency_email_campaigns')
    .select('*')
    .order('month_year', { ascending: false });

  const { data: adCampaigns } = await supabase
    .from('agency_own_ad_campaigns')
    .select('*')
    .order('month_year', { ascending: false });
  return (
    <PageContainer
      title="My Agency — veloxisglobal.com"
      description="Performance and metrics tracking for Veloxis Global."
      actions={
        <div className="flex items-center gap-2 select-none">
          <StatusBadge status="agency_self" />
          <Button size="sm" className="bg-[#132035] hover:bg-[#1A2D47] border border-[#1E3352] text-[#8BA3C7] hover:text-[#F0F4FF] text-xs h-8 gap-1.5 cursor-pointer">
            <RefreshCw size={13} className="stroke-[1.5]" />
            <span>Sync All Data</span>
          </Button>
        </div>
      }
    >
      <AgencyDashboard
        clientId={agencyClient.id}
        seoCampaigns={seoCampaigns}
        seoKeywords={seoKeywords}
        socialMetrics={socialMetrics}
        whatsappCampaigns={whatsappCampaigns}
        emailCampaigns={emailCampaigns}
        adCampaigns={adCampaigns}
      />
    </PageContainer>
  );
}
