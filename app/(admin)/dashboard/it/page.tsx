import { PageContainer } from '@/components/shared/page-container';
import { ITDashboard } from '@/components/admin/it/it-dashboard';
import { createClient } from '@/lib/supabase/server';

export default async function Page() {
  const supabase = await createClient();

  // 1. Fetch audit logs (last 100)
  const { data: auditLogs } = await supabase
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);

  // 2. Fetch failed cron job runs (last 20)
  const { data: errorLogs } = await supabase
    .from('cron_job_runs')
    .select(`
      *,
      cron_jobs (
        name,
        description
      )
    `)
    .eq('status', 'failed')
    .order('started_at', { ascending: false })
    .limit(20);

  // 3. Fetch system counts & storage stats
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

  // Estimate DB Size: assume average of 400 bytes per PostgreSQL row
  const dbSizeBytes = totalRows * 400;
  const dbSizeFormatted = dbSizeBytes >= 1024 * 1024
    ? `${(dbSizeBytes / (1024 * 1024)).toFixed(2)} MB`
    : `${(dbSizeBytes / 1024).toFixed(1)} KB`;

  return (
    <PageContainer title="IT & Tech Diagnostics" description="Monitor third-party integrations health, database rows, storage buckets, and security audit logs.">
      <ITDashboard
        initialAuditLogs={auditLogs}
        initialErrorLogs={errorLogs}
        systemStats={{
          totalRows,
          dbSizeEstimate: `${dbSizeFormatted} / 500 MB limit`,
          usedStorageBytes
        }}
        healthMetrics={{
          gscCount: gscRes.count || 0,
          ga4Count: ga4Res.count || 0,
          metaCount: metaRes.count || 0,
          gadsCount: 0 // Mock campaigns or custom value
        }}
      />
    </PageContainer>
  );
}

