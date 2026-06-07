import React, { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { PageContainer } from '@/components/shared/page-container';
import { DeliverablesDashboard } from '@/components/admin/deliverables/deliverables-dashboard';

export const revalidate = 0; // Dynamic server-side rendering

export default async function DeliverablesPage() {
  const supabase = await createClient();

  // Fetch all clients WHERE is_agency_self=false AND status='active'
  const { data: clients, error: clientsError } = await supabase
    .from('clients')
    .select('*')
    .eq('is_agency_self', false)
    .eq('status', 'active')
    .order('name', { ascending: true });

  if (clientsError) {
    console.error('Error fetching clients:', clientsError);
  }

  // Fetch active profiles for task assignee list
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
      title="Deliverables"
      description="Track monthly SEO, social media, ads, content, and development tasks across all clients."
    >
      <Suspense fallback={<div className="text-sm text-text-muted animate-pulse">Loading deliverables...</div>}>
        <DeliverablesDashboard
          initialClients={clients || []}
          profiles={profiles || []}
        />
      </Suspense>
    </PageContainer>
  );
}
