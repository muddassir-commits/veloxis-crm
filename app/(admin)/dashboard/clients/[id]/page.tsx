import React from 'react';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ClientDetailHub } from '@/components/admin/clients/client-detail-hub';

export const revalidate = 0;

interface ClientDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function ClientDetailPage({ params }: ClientDetailPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  // Fetch the specific client
  const { data: client, error } = await supabase
    .from('clients')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !client) {
    notFound();
  }

  // Redirect if it is the agency's own client profile
  if (client.is_agency_self) {
    redirect('/dashboard/my-agency');
  }

  // Fetch active team profiles for account manager dropdown
  const { data: profiles } = await supabase
    .from('profiles')
    .select('*')
    .eq('is_active', true)
    .order('full_name', { ascending: true });

  return (
    <ClientDetailHub
      client={client}
      profiles={profiles || []}
    />
  );
}
