// app/(admin)/dashboard/social/page.tsx

import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { SocialDashboard } from '@/components/admin/social/social-dashboard';

export const revalidate = 0;

interface PageProps {
  searchParams: Promise<{ month?: string; client?: string }>;
}

function getCurrentMonthString() {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const now = new Date();
  return `${months[now.getMonth()]} ${now.getFullYear()}`;
}

export default async function SocialPage({ searchParams }: PageProps) {
  const resolvedParams = await searchParams;
  const selectedMonth = resolvedParams.month || getCurrentMonthString();
  const selectedClient = resolvedParams.client || 'all';

  const supabase = await createClient();

  // 1. Fetch active clients and agency self-client
  const { data: clients } = await supabase
    .from('clients')
    .select('*')
    .or('status.eq.active,is_agency_self.eq.true')
    .order('name', { ascending: true });

  // 2. Fetch all social posts for selected month
  let postsQuery = supabase
    .from('social_posts')
    .select('*, clients(name, is_agency_self), profiles(full_name)')
    .eq('month_year', selectedMonth);

  if (selectedClient !== 'all') {
    postsQuery = postsQuery.eq('client_id', selectedClient);
  }
  const { data: posts } = await postsQuery.order('scheduled_for', { ascending: true });

  // 3. Fetch agency own social accounts (for the special metrics card / display if needed)
  const { data: agencySocial } = await supabase
    .from('agency_social_accounts')
    .select('*')
    .eq('is_active', true);

  return (
    <SocialDashboard
      initialClients={clients || []}
      initialPosts={posts || []}
      initialAgencySocial={agencySocial || []}
      selectedMonth={selectedMonth}
      selectedClient={selectedClient}
    />
  );
}
