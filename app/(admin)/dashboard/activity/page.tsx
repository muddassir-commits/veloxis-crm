import { PageContainer } from '@/components/shared/page-container';
import { ActivityDashboard } from '@/components/admin/activity/activity-dashboard';
import { createClient } from '@/lib/supabase/server';

export const revalidate = 0;

export default async function Page() {
  const supabase = await createClient();

  // Fetch initial activity logs
  const { data: initialLogs } = await supabase
    .from('activity_log')
    .select(`
      *,
      clients(id, name)
    `)
    .order('created_at', { ascending: false })
    .limit(50);

  // Fetch clients for filter dropdown
  const { data: clients } = await supabase
    .from('clients')
    .select('id, name')
    .order('name', { ascending: true });

  return (
    <PageContainer 
      title="Activity Log" 
      description="Monitor all system events, manual interventions, client creations, payments, and workflow triggers across all departments."
    >
      <ActivityDashboard 
        initialLogs={initialLogs || []} 
        clients={clients || []} 
      />
    </PageContainer>
  );
}
