import { PageContainer } from '@/components/shared/page-container';
import { SettingsDashboard } from '@/components/admin/settings/settings-dashboard';
import { createClient } from '@/lib/supabase/server';

export default async function Page() {
  const supabase = await createClient();

  // 1. Fetch all configurations in agency_settings
  const { data: settingsData } = await supabase
    .from('agency_settings')
    .select('*');

  const settingsMap: Record<string, unknown> = {};
  if (settingsData) {
    settingsData.forEach((item) => {
      settingsMap[item.key] = item.value;
    });
  }

  // 2. Fetch profiles for user cabinet list
  const { data: profiles } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  // 3. Fetch clients list for invitation mapping
  const { data: clients } = await supabase
    .from('clients')
    .select('id, name, company')
    .order('name', { ascending: true });

  // 4. Fetch login sessions from audit logs
  const { data: activeSessions } = await supabase
    .from('audit_logs')
    .select('*')
    .eq('action', 'LOGIN')
    .order('created_at', { ascending: false })
    .limit(10);

  // 5. Fetch system counts & storage stats
  const [
    profilesRes,
    clientsRes,
    projectsRes,
    tasksRes,
    invoicesRes,
    auditsRes,
    filesRes,
    gscRes,
    ga4Res,
    metaRes
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('clients').select('*', { count: 'exact', head: true }),
    supabase.from('projects').select('*', { count: 'exact', head: true }),
    supabase.from('tasks').select('*', { count: 'exact', head: true }),
    supabase.from('invoices').select('*', { count: 'exact', head: true }),
    supabase.from('audit_logs').select('*', { count: 'exact', head: true }),
    supabase.from('files').select('size_bytes'),
    supabase.from('gsc_connections').select('*', { count: 'exact', head: true }),
    supabase.from('ga4_connections').select('*', { count: 'exact', head: true }),
    supabase.from('meta_connections').select('*', { count: 'exact', head: true })
  ]);

  const totalRows = 
    (profilesRes.count || 0) +
    (clientsRes.count || 0) +
    (projectsRes.count || 0) +
    (tasksRes.count || 0) +
    (invoicesRes.count || 0) +
    (auditsRes.count || 0);

  // Calculate used storage in bytes
  const usedStorageBytes = (filesRes.data || []).reduce((acc, curr) => acc + Number(curr.size_bytes || 0), 0);

  return (
    <PageContainer title="Global CRM Settings" description="Manage user directories, configure default invoice banking, adjust n8n automation notifications, track storage limits, and revoke session logins.">
      <SettingsDashboard
        initialSettings={settingsMap}
        initialProfiles={profiles || []}
        initialClients={clients || []}
        initialActiveSessions={activeSessions || []}
        initialCounts={{
          profiles: profilesRes.count || 0,
          clients: clientsRes.count || 0,
          projects: projectsRes.count || 0,
          tasks: tasksRes.count || 0,
          invoices: invoicesRes.count || 0,
          auditLogs: auditsRes.count || 0,
          filesCount: (filesRes.data || []).length,
          totalRows
        }}
        usedStorageBytes={usedStorageBytes}
        healthMetrics={{
          gscCount: gscRes.count || 0,
          ga4Count: ga4Res.count || 0,
          metaCount: metaRes.count || 0,
          gadsCount: 0 // Mock google ads property sync status count
        }}
      />
    </PageContainer>
  );
}
