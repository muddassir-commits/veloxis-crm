import { PageContainer } from '@/components/shared/page-container';
import { OperationsDashboard } from '@/components/admin/operations/operations-dashboard';
import { createClient } from '@/lib/supabase/server';

export default async function Page() {
  const supabase = await createClient();

  // Fetch active clients
  const { data: clients } = await supabase
    .from('clients')
    .select('*')
    .order('name', { ascending: true });

  // Fetch active student/intern profiles
  const { data: employees } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'employee')
    .order('full_name', { ascending: true });

  // Fetch SOP documents from the files table
  const { data: sops } = await supabase
    .from('files')
    .select('*')
    .eq('bucket', 'agency')
    .like('storage_path', 'sops/%')
    .order('created_at', { ascending: false });

  // Fetch Operations milestones
  const { data: milestones } = await supabase
    .from('operations_milestones')
    .select('*')
    .order('day', { ascending: true });

  // Fetch Process templates with tasks
  const { data: templates } = await supabase
    .from('process_templates')
    .select(`
      *,
      tasks:process_template_tasks(*)
    `)
    .order('name', { ascending: true });

  return (
    <PageContainer title="Operations Dashboard" description="Manage agency standard operating procedures (SOPs), fixed monthly events, and process checklists.">
      <OperationsDashboard
        clients={clients}
        employees={employees}
        initialSops={sops}
        initialMilestones={milestones}
        initialTemplates={templates}
      />
    </PageContainer>
  );
}


