import { PageContainer } from '@/components/shared/page-container';
import { LegalDashboard } from '@/components/admin/legal/legal-dashboard';
import { createClient } from '@/lib/supabase/server';

export default async function Page() {
  const supabase = await createClient();

  // Fetch contracts with related files
  const { data: contracts } = await supabase
    .from('contracts')
    .select(`
      *,
      files (
        id,
        name,
        storage_path,
        public_url
      )
    `)
    .order('created_at', { ascending: false });

  // Fetch clients for signing party selection dropdown
  const { data: clients } = await supabase
    .from('clients')
    .select('*')
    .order('name', { ascending: true });

  // Fetch student/intern profiles for signing party selection dropdown
  const { data: employees } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'employee')
    .order('full_name', { ascending: true });

  return (
    <PageContainer title="Legal Cabinet" description="Track contracts, NDAs, employee covenants, and legal compliance alerts.">
      <LegalDashboard
        initialContracts={contracts}
        clients={clients}
        employees={employees}
      />
    </PageContainer>
  );
}

