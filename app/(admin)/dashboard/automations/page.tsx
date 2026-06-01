import { PageContainer } from '@/components/shared/page-container';
import { AutomationsDashboard } from '@/components/admin/automations/automations-dashboard';
import { createClient } from '@/lib/supabase/server';

export default async function Page() {
  const supabase = await createClient();
  
  // Fetch cron jobs from the database server-side
  const { data: cronJobs } = await supabase
    .from('cron_jobs')
    .select('*')
    .order('name', { ascending: true });

  return (
    <PageContainer title="Automations Hub" description="Monitor n8n scheduled workflows and real-time system webhooks.">
      <AutomationsDashboard initialCronJobs={cronJobs} />
    </PageContainer>
  );
}

