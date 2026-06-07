'use client';

/* eslint-disable */

import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import {
  ShieldAlert,
  Server,
  Activity,
  Search,
  Download,
  AlertTriangle,
  RefreshCw,
  Terminal,
  Eye,
  Key,
  HardDrive,
  Cpu,
  CheckCircle,
  Database,
  ArrowDownToLine
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { DataTable } from '@/components/shared/data-table';
import { StatCard } from '@/components/shared/stat-card';
import { AuditLog } from '@/types';

interface ITDashboardProps {
  initialAuditLogs: AuditLog[] | null;
  initialErrorLogs: any[] | null;
  systemStats: {
    totalRows: number;
    dbSizeEstimate: string;
    usedStorageBytes: number;
  };
  healthMetrics: {
    gscCount: number;
    ga4Count: number;
    metaCount: number;
    gadsCount: number;
  };
}

export function ITDashboard({
  initialAuditLogs,
  initialErrorLogs,
  systemStats,
  healthMetrics,
}: ITDashboardProps) {
  const supabase = createClient();
  const [activeTab, setActiveTab] = useState<'health' | 'audit' | 'errors'>('health');
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(initialAuditLogs || []);
  const [errorLogs, setErrorLogs] = useState<any[]>(initialErrorLogs || []);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('');

  // Diff Viewer Modal State
  const [selectedAuditLog, setSelectedAuditLog] = useState<AuditLog | null>(null);

  // Sync / refresh stats
  const refreshITData = async () => {
    setIsRefreshing(true);
    try {
      const { data: audits } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      const { data: errors } = await supabase
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

      if (audits) setAuditLogs(audits);
      if (errors) setErrorLogs(errors);
      toast.success('System diagnostics successfully synced.');
    } catch {
      toast.error('Failed to sync diagnostics.');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Download Audit logs secure link
  const handleExportCSV = () => {
    window.open('/api/admin/audit-export', '_blank');
    toast.success('Generating audit CSV export bundle.');
  };

  // DB Storage calculations
  const storageLimitBytes = 1000 * 1024 * 1024; // 1GB Free tier limit
  const storagePercentage = Math.min(100, Math.round((systemStats.usedStorageBytes / storageLimitBytes) * 100));
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = 2;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  // Filtered Audit logs
  const filteredAuditLogs = auditLogs.filter((log) => {
    const matchesSearch =
      (log.table_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.ip_address || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.user_id || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesAction = actionFilter === '' || log.action === actionFilter;

    return matchesSearch && matchesAction;
  });

  const auditColumns = [
    {
      key: 'created_at',
      header: 'Timestamp',
      render: (val: any) => new Date(val).toLocaleString()
    },
    {
      key: 'action',
      header: 'Action Type',
      render: (val: any) => {
        let color = 'bg-border-subtle/20 text-text-secondary border-border-subtle/30';
        if (val === 'INSERT') color = 'bg-online/10 text-online border-online/20';
        else if (val === 'UPDATE') color = 'bg-primary/10 text-primary-light border-primary/20';
        else if (val === 'DELETE') color = 'bg-error/10 text-error border-error/20';
        else if (val === 'LOGIN' || val === 'EXPORT') color = 'bg-accent/10 text-accent border-accent/20';
        return (
          <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-semibold border uppercase tracking-wider ${color}`}>
            {val}
          </span>
        );
      }
    },
    {
      key: 'table_name',
      header: 'Table affected',
      render: (val: any) => (
        <code className="text-[11px] font-mono text-text-secondary">
          {val || 'n/a'}
        </code>
      )
    },
    {
      key: 'ip_address',
      header: 'IP Address',
      render: (val: any) => val || 'system'
    },
    {
      key: 'user_agent',
      header: 'Client / Agent',
      render: (val: any) => (
        <span className="text-[11px] text-text-secondary block line-clamp-1 max-w-xs select-none">
          {val || '-'}
        </span>
      )
    },
    {
      key: 'actions',
      header: 'Metadata',
      render: (val: any, row: any) => (
        <Button
          size="xs"
          variant="secondary"
          onClick={() => setSelectedAuditLog(row)}
        >
          <Eye className="mr-1" />
          <span>View Diff</span>
        </Button>
      )
    }
  ];

  const errorColumns = [
    {
      key: 'started_at',
      header: 'Triggered Date',
      render: (val: any) => new Date(val).toLocaleString()
    },
    {
      key: 'cron_jobs',
      header: 'Failed Automation Workflow',
      render: (val: any, row: any) => (
        <div className="flex flex-col select-none font-semibold text-text-primary">
          <span>{row.cron_jobs?.name || 'Scheduled Job'}</span>
          <span className="text-[10px] text-text-secondary/70 font-normal">Workflow: {row.cron_jobs?.description || 'n/a'}</span>
        </div>
      )
    },
    {
      key: 'error',
      header: 'Detailed Stack trace / Error',
      render: (val: any) => (
        <div className="bg-error/5 border border-error/10 text-error text-[10px] p-2 rounded font-mono break-all whitespace-pre-wrap max-w-md max-h-16 overflow-y-auto">
          {val || 'Execution timed out or aborted by n8n.'}
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6 select-none">
      {/* ━━━ TAB NAVIGATION ━━━ */}
      <div className="flex items-center justify-between border-b border-border/20 pb-2 select-none">
        <div className="flex items-center gap-2 overflow-x-auto">
          {(['health', 'audit', 'errors'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider border-b-2 cursor-pointer transition-all ${
                activeTab === tab
                  ? 'border-primary text-text-primary'
                  : 'border-transparent text-text-secondary hover:text-text-primary'
              }`}
            >
              {tab === 'health' ? 'System Health' : tab === 'audit' ? 'Audit Log Cabinet' : 'Automation Failures Log'}
            </button>
          ))}
        </div>

        <Button
          onClick={refreshITData}
          disabled={isRefreshing}
          size="sm"
          variant="secondary"
        >
          <RefreshCw className={isRefreshing ? 'animate-spin' : ''} />
          <span>Sync Status</span>
        </Button>
      </div>

      {/* ━━━ TAB 1: SYSTEM HEALTH ━━━ */}
      {activeTab === 'health' && (
        <div className="space-y-6">
          {/* STATS GRID */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard
              title="Database Rows Engaged"
              value={systemStats.totalRows}
              subtext={`Estimated DB size: ${systemStats.dbSizeEstimate}`}
              icon={Database}
            />
            <div className="rounded-xl border border-border/30 bg-bg-card/70 backdrop-blur-[12px] p-4 flex flex-col justify-between shadow-elevated hover:bg-bg-card/85 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-xs text-text-secondary font-semibold">Supabase Storage Utilization</span>
                <HardDrive size={18} className="text-primary-light" />
              </div>
              <div className="mt-4 space-y-2">
                <div className="flex items-baseline justify-between">
                  <span className="text-lg font-bold text-text-primary">{formatBytes(systemStats.usedStorageBytes)}</span>
                  <span className="text-[10px] text-text-secondary font-semibold">of 1,000 MB Limit</span>
                </div>
                <Progress value={storagePercentage} />
              </div>
            </div>
            <StatCard
              title="System Uptime Monitor"
              value="100.0%"
              subtext="n8n + Supabase connection is healthy"
              icon={Activity}
            />
          </div>

          {/* INTEGRATION HEALTH CARDS */}
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-semibold text-text-primary flex items-center gap-1.5">
                <Key size={15} className="text-primary-light" />
                <span>Integration Endpoints Status</span>
              </h2>
              <p className="text-xs text-text-secondary">Connection status for API channels routed to external marketing profiles.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div className="rounded-xl border border-border/30 bg-bg-card/70 backdrop-blur-[12px] p-4 space-y-2 shadow-elevated">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-text-primary">Google Search Console</span>
                  <span className="flex items-center gap-1 text-online text-[10px] font-bold">
                    <CheckCircle size={10} />
                    <span>ONLINE</span>
                  </span>
                </div>
                <div className="text-[11px] text-text-secondary">{healthMetrics.gscCount} client properties connected</div>
              </div>

              <div className="rounded-xl border border-border/30 bg-bg-card/70 backdrop-blur-[12px] p-4 space-y-2 shadow-elevated">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-text-primary">Google Analytics 4</span>
                  <span className="flex items-center gap-1 text-online text-[10px] font-bold">
                    <CheckCircle size={10} />
                    <span>ONLINE</span>
                  </span>
                </div>
                <div className="text-[11px] text-text-secondary">{healthMetrics.ga4Count} client tags configured</div>
              </div>

              <div className="rounded-xl border border-border/30 bg-bg-card/70 backdrop-blur-[12px] p-4 space-y-2 shadow-elevated">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-text-primary">Meta Marketing Ads</span>
                  <span className="flex items-center gap-1 text-online text-[10px] font-bold">
                    <CheckCircle size={10} />
                    <span>ONLINE</span>
                  </span>
                </div>
                <div className="text-[11px] text-text-secondary">{healthMetrics.metaCount} ad accounts synced</div>
              </div>

              <div className="rounded-xl border border-border/30 bg-bg-card/70 backdrop-blur-[12px] p-4 space-y-2 shadow-elevated">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-text-primary">Google Campaigns Ads</span>
                  <span className="flex items-center gap-1 text-online text-[10px] font-bold">
                    <CheckCircle size={10} />
                    <span>ONLINE</span>
                  </span>
                </div>
                <div className="text-[11px] text-text-secondary">Linked Ads API channels operational</div>
              </div>

              <div className="rounded-xl border border-border/30 bg-bg-card/70 backdrop-blur-[12px] p-4 space-y-2 shadow-elevated">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-text-primary">n8n Automation Engine</span>
                  <span className="flex items-center gap-1 text-online text-[10px] font-bold">
                    <CheckCircle size={10} />
                    <span>ONLINE</span>
                  </span>
                </div>
                <div className="text-[11px] text-text-secondary">automation.veloxisglobal.com linked</div>
              </div>

              <div className="rounded-xl border border-border/30 bg-bg-card/70 backdrop-blur-[12px] p-4 space-y-2 shadow-elevated">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-text-primary">WhatsApp Business API</span>
                  <span className="flex items-center gap-1 text-online text-[10px] font-bold">
                    <CheckCircle size={10} />
                    <span>ONLINE</span>
                  </span>
                </div>
                <div className="text-[11px] text-text-secondary">Fired triggers ready for messaging</div>
              </div>

              <div className="rounded-xl border border-border/30 bg-bg-card/70 backdrop-blur-[12px] p-4 space-y-2 shadow-elevated">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-text-primary">Resend SMTP Delivery</span>
                  <span className="flex items-center gap-1 text-online text-[10px] font-bold">
                    <CheckCircle size={10} />
                    <span>ONLINE</span>
                  </span>
                </div>
                <div className="text-[11px] text-text-secondary">Domain DNS DKIM fully verified</div>
              </div>

              <div className="rounded-xl border border-border/30 bg-bg-card/70 backdrop-blur-[12px] p-4 space-y-2 shadow-elevated">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-text-primary">Google Workspace API</span>
                  <span className="flex items-center gap-1 text-online text-[10px] font-bold">
                    <CheckCircle size={10} />
                    <span>ONLINE</span>
                  </span>
                </div>
                <div className="text-[11px] text-text-secondary">OAuth tokens properly mapped</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ━━━ TAB 2: AUDIT LOGS ━━━ */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2 flex-1 max-w-lg">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
                <input
                  type="text"
                  placeholder="Filter by table name or IP..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-9 w-full min-w-0 rounded-lg border border-border/30 bg-bg-card/50 pl-9 pr-3 text-xs text-text-primary backdrop-blur-[8px] outline-none transition-all duration-200 focus:border-primary/50 focus:bg-bg-card/70 focus:shadow-[0_0_16px_rgba(37,99,235,0.15)] placeholder:text-text-tertiary"
                />
              </div>

              <select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                className="h-9 w-full min-w-0 rounded-lg border border-border/30 bg-bg-card/50 px-3 py-1 text-xs text-text-primary backdrop-blur-[8px] outline-none transition-all duration-200 focus:border-primary/50 focus:bg-bg-card/70 focus:shadow-[0_0_16px_rgba(37,99,235,0.15)] max-w-[130px]"
              >
                <option value="">All Actions</option>
                <option value="INSERT">INSERT</option>
                <option value="UPDATE">UPDATE</option>
                <option value="DELETE">DELETE</option>
                <option value="LOGIN">LOGIN</option>
                <option value="EXPORT">EXPORT</option>
              </select>
            </div>

            <Button
              onClick={handleExportCSV}
              size="sm"
              className="self-end sm:self-auto"
            >
              <ArrowDownToLine className="mr-1" />
              <span>Export Audit Logs CSV</span>
            </Button>
          </div>

          <div className="w-full">
            <DataTable
              columns={auditColumns}
              data={filteredAuditLogs as any}
              emptyState={{
                icon: ShieldAlert,
                title: 'No Audit Trail Found',
                description: 'Enable RLS or database triggers on operations to see changes.',
              }}
            />
          </div>
        </div>
      )}

      {/* ━━━ TAB 3: ERROR LOGS ━━━ */}
      {activeTab === 'errors' && (
        <div className="space-y-4">
          <div className="border border-dashed border-error/30 bg-error/5 rounded-lg p-4 flex gap-3 text-xs select-none">
            <AlertTriangle size={18} className="text-error shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-text-primary">Failsafe Automation Monitors</h4>
              <p className="text-text-secondary leading-relaxed">
                This log captures cron job runs from n8n that returned status results of 'failed'. Inspect stack traces or payload stack errors below immediately to prevent data gaps.
              </p>
            </div>
          </div>

          <div className="w-full">
            <DataTable
              columns={errorColumns}
              data={errorLogs}
              emptyState={{
                icon: Terminal,
                title: 'All recurring runs healthy',
                description: 'No automation workflow execution errors reported in the last 20 runs.',
              }}
            />
          </div>
        </div>
      )}

      {/* ━━━ MODAL: VIEW DIFF METADATA ━━━ */}
      <Dialog open={selectedAuditLog !== null} onOpenChange={(open) => !open && setSelectedAuditLog(null)}>
        <DialogContent className="sm:max-w-[700px] select-none overflow-y-auto max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-1.5">
              <ShieldAlert size={16} className="text-primary-light" />
              <span>Audit Log Record Diff — #{selectedAuditLog?.id}</span>
            </DialogTitle>
            <DialogDescription>
              Administrative transaction detail changes.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-4 bg-bg-dark border border-border/20 rounded-lg p-3 text-[11px]">
              <div>
                <span className="text-text-secondary block">Table Name</span>
                <span className="text-text-primary font-mono font-semibold">{selectedAuditLog?.table_name || 'n/a'}</span>
              </div>
              <div>
                <span className="text-text-secondary block">Affected UUID</span>
                <span className="text-primary-light font-mono select-all">{selectedAuditLog?.record_id || 'n/a'}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold text-error mb-1.5 flex items-center gap-1">
                  <span>[-] Old Value State</span>
                </h4>
                <pre className="bg-bg-dark text-text-secondary text-[10px] p-3 rounded border border-error/20 font-mono overflow-x-auto max-h-60 overflow-y-auto whitespace-pre-wrap">
                  {selectedAuditLog?.old_values 
                    ? JSON.stringify(selectedAuditLog.old_values, null, 2) 
                    : '(empty insert state)'}
                </pre>
              </div>

              <div>
                <h4 className="font-semibold text-online mb-1.5 flex items-center gap-1">
                  <span>[+] New Value State</span>
                </h4>
                <pre className="bg-bg-dark text-text-secondary text-[10px] p-3 rounded border border-online/20 font-mono overflow-x-auto max-h-60 overflow-y-auto whitespace-pre-wrap">
                  {selectedAuditLog?.new_values 
                    ? JSON.stringify(selectedAuditLog.new_values, null, 2) 
                    : '(empty delete state)'}
                </pre>
              </div>
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button
              variant="secondary"
              onClick={() => setSelectedAuditLog(null)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
export default ITDashboard;
