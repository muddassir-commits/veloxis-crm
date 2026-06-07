import React, { Suspense } from 'react';
import { PageContainer } from '@/components/shared/page-container';
import { EmptyState } from '@/components/shared/empty-state';
import { StatusBadge } from '@/components/shared/status-badge';
import { createClient } from '@/lib/supabase/server';
import { Building2 } from 'lucide-react';
import { AgencyDashboard } from '@/components/admin/agency-dashboard';
import { MyAgencySyncButton } from '@/components/admin/my-agency-sync-button';

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

  // 3. Fetch brand assets from agency bucket
  const { data: brandFiles } = await supabase
    .from('files')
    .select('*, profiles:uploaded_by (full_name)')
    .eq('bucket', 'agency')
    .order('created_at', { ascending: false });

  // 4. Fetch social media content planning posts
  const { data: socialPosts } = await supabase
    .from('social_posts')
    .select('*, profiles:assigned_to (full_name)')
    .eq('client_id', agencyClient.id)
    .order('scheduled_for', { ascending: true });

  return (
    <PageContainer
      title="Agency Marketing — veloxisglobal.com"
      description="Performance, brand assets, and marketing content planner for Veloxis Global."
      actions={
        <div className="flex items-center gap-2 select-none">
          <StatusBadge status="agency_self" />
          <MyAgencySyncButton clientId={agencyClient.id} />
        </div>
      }
    >
      <Suspense fallback={<div className="text-xs text-text-muted animate-pulse">Loading dashboard...</div>}>
        <AgencyDashboard
          clientId={agencyClient.id}
          seoCampaigns={seoCampaigns}
          seoKeywords={seoKeywords}
          socialMetrics={socialMetrics}
          whatsappCampaigns={whatsappCampaigns}
          emailCampaigns={emailCampaigns}
          adCampaigns={adCampaigns}
          brandFiles={brandFiles || []}
          socialPosts={socialPosts || []}
        />
      </Suspense>
    </PageContainer>
  );
}
