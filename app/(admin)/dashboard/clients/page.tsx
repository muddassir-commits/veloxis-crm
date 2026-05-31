import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { PageContainer } from '@/components/shared/page-container';
import { ClientsDashboard } from '@/components/admin/clients/clients-dashboard';

export const revalidate = 0; // Dynamic server-side rendering

export default async function ClientsPage() {
  const supabase = await createClient();

  // Fetch clients, sorted is_agency_self DESC first (pinned top), then name ASC
  const { data: clients, error: clientsError } = await supabase
    .from('clients')
    .select('*')
    .order('is_agency_self', { ascending: false })
    .order('name', { ascending: true });

  if (clientsError) {
    console.error('Error fetching clients:', clientsError);
  }

  // Fetch active profiles for assigned account manager dropdown
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('*')
    .eq('is_active', true)
    .order('full_name', { ascending: true });

  if (profilesError) {
    console.error('Error fetching profiles:', profilesError);
  }

  return (
    <PageContainer>
      <ClientsDashboard
        initialClients={clients || []}
        profiles={profiles || []}
      />
    </PageContainer>
  );
}
