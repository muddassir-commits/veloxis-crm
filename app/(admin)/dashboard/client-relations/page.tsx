import React, { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { PageContainer } from '@/components/shared/page-container';
import { ClientRelationsDashboard } from '@/components/admin/client-relations/client-relations-dashboard';

export const revalidate = 0; // Dynamic server-side rendering

export default async function ClientRelationsPage() {
  const supabase = await createClient();

  // 1. Fetch active clients
  const { data: clients } = await supabase
    .from('clients')
    .select('*')
    .order('name', { ascending: true });

  // 2. Fetch admin and employee profiles (for assignees)
  const { data: team } = await supabase
    .from('profiles')
    .select('*')
    .in('role', ['admin', 'employee'])
    .eq('is_active', true)
    .order('full_name', { ascending: true });

  // 3. Fetch recent communications (with error fallback)
  const { data: communications, error: commsErr } = await supabase
    .from('client_communications')
    .select('*, profiles:created_by(full_name)')
    .order('created_at', { ascending: false });

  if (commsErr) {
    console.warn("Table client_communications may not exist yet:", commsErr.message);
  }

  // 4. Fetch support tickets (with error fallback)
  const { data: tickets, error: ticketsErr } = await supabase
    .from('support_tickets')
    .select('*, clients(name), profiles_created:created_by(full_name), profiles_assigned:assigned_to(full_name)')
    .order('created_at', { ascending: false });

  if (ticketsErr) {
    console.warn("Table support_tickets may not exist yet:", ticketsErr.message);
  }

  // 5. Fetch NPS responses (with error fallback)
  const { data: npsResponses, error: npsErr } = await supabase
    .from('nps_responses')
    .select('*, clients(name), profiles:created_by(full_name)')
    .order('created_at', { ascending: false });

  if (npsErr) {
    console.warn("Table nps_responses may not exist yet:", npsErr.message);
  }

  return (
    <PageContainer title="Client Relations" description="Manage client communication logs, support tickets, NPS feedback, and churn risks.">
      <Suspense fallback={<div className="text-sm text-[#8BA3C7] animate-pulse">Loading Client Relations Dashboard...</div>}>
        <ClientRelationsDashboard
          clients={clients || []}
          team={team || []}
          initialCommunications={communications || []}
          initialTickets={tickets || []}
          initialNpsResponses={npsResponses || []}
        />
      </Suspense>
    </PageContainer>
  );
}
