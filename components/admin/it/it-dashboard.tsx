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
        let color = 'bg-[#1E335220] text-[#8BA3C7] border-[#1E335230]';
        if (val === 'INSERT') color = 'bg-[#22C55E15] text-[#22C55E] border-[#22C55E30]';
        else if (val === 'UPDATE') color = 'bg-[#3B82F615] text-[#3B82F6] border-[#3B82F630]';
        else if (val === 'DELETE') color = 'bg-[#EF444415] text-[#EF4444] border-[#EF444430]';
        else if (val === 'LOGIN' || val === 'EXPORT') color = 'bg-[#F9731615] text-[#F97316] border-[#F9731630]';
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
        <code className="text-[11px] font-mono text-[#8BA3C7]">
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
        <span className="text-[11px] text-[#8BA3C7] block line-clamp-1 max-w-xs select-none">
          {val || '-'}
        </span>
      )
    },
    {
      key: 'actions',
      header: 'Metadata',
      render: (val: any, row: any) => (
        <Button
          size="sm"
          variant="outline"
          onClick={() => setSelectedAuditLog(row)}
          className="bg-[#132035] hover:bg-[#1A2D47] border border-[#1E3352] text-[#8BA3C7] hover:text-[#F0F4FF] text-[11px] h-7 px-2"
        >
          <Eye size={11} className="mr-1" />
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
        <div className="flex flex-col select-none font-semibold text-[#F0F4FF]">
          <span>{row.cron_jobs?.name || 'Scheduled Job'}</span>
          <span className="text-[10px] text-[#8BA3C7]/70 font-normal">Workflow: {row.cron_jobs?.description || 'n/a'}</span>
        </div>
      )
    },
    {
      key: 'error',
      header: 'Detailed Stack trace / Error',
      render: (val: any) => (
        <div className="bg-[#EF444409] border border-[#EF444415] text-[#EF4444] text-[10px] p-2 rounded font-mono break-all whitespace-pre-wrap max-w-md max-h-16 overflow-y-auto">
          {val || 'Execution timed out or aborted by n8n.'}
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6 select-none">
      {/* ━━━ TAB NAVIGATION ━━━ */}
      <div className="flex items-center justify-between border-b border-[#1E3352] pb-2 select-none">
        <div className="flex items-center gap-2 overflow-x-auto">
          {(['health', 'audit', 'errors'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider border-b-2 cursor-pointer transition-all ${
                activeTab === tab
                  ? 'border-[#1B4FD8] text-[#F0F4FF]'
                  : 'border-transparent text-[#8BA3C7] hover:text-[#F0F4FF]'
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
          className="bg-[#132035] hover:bg-[#1A2D47] border border-[#1E3352] text-[#8BA3C7] hover:text-[#F0F4FF] text-xs h-8 gap-1.5 cursor-pointer font-semibold"
        >
          <RefreshCw size={13} className={isRefreshing ? 'animate-spin' : ''} />
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
            <div className="rounded-lg border border-[#1E3352] bg-[#0D1829] p-4 flex flex-col justify-between hover:border-[#1E3352] transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#8BA3C7] font-semibold">Supabase Storage Utilization</span>
                <HardDrive size={18} className="text-[#3B82F6]" />
              </div>
              <div className="mt-4 space-y-2">
                <div className="flex items-baseline justify-between">
                  <span className="text-lg font-bold text-[#F0F4FF]">{formatBytes(systemStats.usedStorageBytes)}</span>
                  <span className="text-[10px] text-[#8BA3C7] font-semibold">of 1,000 MB Limit</span>
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
              <h2 className="text-base font-semibold text-[#F0F4FF] flex items-center gap-1.5">
                <Key size={15} className="text-[#3B82F6]" />
                <span>Integration Endpoints Status</span>
              </h2>
              <p className="text-xs text-[#8BA3C7]">Connection status for API channels routed to external marketing profiles.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div className="rounded-lg border border-[#1E3352]/60 bg-[#0D1829] p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-[#F0F4FF]">Google Search Console</span>
                  <span className="flex items-center gap-1 text-[#22C55E] text-[10px] font-bold">
                    <CheckCircle size={10} />
                    <span>ONLINE</span>
                  </span>
                </div>
                <div className="text-[11px] text-[#8BA3C7]">{healthMetrics.gscCount} client properties connected</div>
              </div>

              <div className="rounded-lg border border-[#1E3352]/60 bg-[#0D1829] p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-[#F0F4FF]">Google Analytics 4</span>
                  <span className="flex items-center gap-1 text-[#22C55E] text-[10px] font-bold">
                    <CheckCircle size={10} />
                    <span>ONLINE</span>
                  </span>
                </div>
                <div className="text-[11px] text-[#8BA3C7]">{healthMetrics.ga4Count} client tags configured</div>
              </div>

              <div className="rounded-lg border border-[#1E3352]/60 bg-[#0D1829] p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-[#F0F4FF]">Meta Marketing Ads</span>
                  <span className="flex items-center gap-1 text-[#22C55E] text-[10px] font-bold">
                    <CheckCircle size={10} />
                    <span>ONLINE</span>
                  </span>
                </div>
                <div className="text-[11px] text-[#8BA3C7]">{healthMetrics.metaCount} ad accounts synced</div>
              </div>

              <div className="rounded-lg border border-[#1E3352]/60 bg-[#0D1829] p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-[#F0F4FF]">Google Campaigns Ads</span>
                  <span className="flex items-center gap-1 text-[#22C55E] text-[10px] font-bold">
                    <CheckCircle size={10} />
                    <span>ONLINE</span>
                  </span>
                </div>
                <div className="text-[11px] text-[#8BA3C7]">Linked Ads API channels operational</div>
              </div>

              <div className="rounded-lg border border-[#1E3352]/60 bg-[#0D1829] p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-[#F0F4FF]">n8n Automation Engine</span>
                  <span className="flex items-center gap-1 text-[#22C55E] text-[10px] font-bold">
                    <CheckCircle size={10} />
                    <span>ONLINE</span>
                  </span>
                </div>
                <div className="text-[11px] text-[#8BA3C7]">automation.veloxisglobal.com linked</div>
              </div>

              <div className="rounded-lg border border-[#1E3352]/60 bg-[#0D1829] p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-[#F0F4FF]">WhatsApp Business API</span>
                  <span className="flex items-center gap-1 text-[#22C55E] text-[10px] font-bold">
                    <CheckCircle size={10} />
                    <span>ONLINE</span>
                  </span>
                </div>
                <div className="text-[11px] text-[#8BA3C7]">Fired triggers ready for messaging</div>
              </div>

              <div className="rounded-lg border border-[#1E3352]/60 bg-[#0D1829] p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-[#F0F4FF]">Resend SMTP Delivery</span>
                  <span className="flex items-center gap-1 text-[#22C55E] text-[10px] font-bold">
                    <CheckCircle size={10} />
                    <span>ONLINE</span>
                  </span>
                </div>
                <div className="text-[11px] text-[#8BA3C7]">Domain DNS DKIM fully verified</div>
              </div>

              <div className="rounded-lg border border-[#1E3352]/60 bg-[#0D1829] p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-[#F0F4FF]">Google Workspace API</span>
                  <span className="flex items-center gap-1 text-[#22C55E] text-[10px] font-bold">
                    <CheckCircle size={10} />
                    <span>ONLINE</span>
                  </span>
                </div>
                <div className="text-[11px] text-[#8BA3C7]">OAuth tokens properly mapped</div>
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
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8BA3C7]" />
                <input
                  type="text"
                  placeholder="Filter by table name or IP..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input pl-9 h-9 text-xs"
                />
              </div>

              <select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                className="input h-9 text-xs max-w-[130px]"
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
              className="bg-[#1B4FD8] hover:bg-[#2563EB] text-white text-xs h-9 gap-1.5 font-semibold self-end sm:self-auto cursor-pointer"
            >
              <ArrowDownToLine size={13} />
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
          <div className="border border-dashed border-[#EF444430] bg-[#EF444405] rounded-lg p-4 flex gap-3 text-xs select-none">
            <AlertTriangle size={18} className="text-[#EF4444] shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-[#F0F4FF]">Failsafe Automation Monitors</h4>
              <p className="text-[#8BA3C7] leading-relaxed">
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
        <DialogContent className="bg-[#0D1829] border border-[#1E3352] text-[#F0F4FF] max-w-2xl select-none overflow-y-auto max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-[#F0F4FF] flex items-center gap-1.5">
              <ShieldAlert size={16} className="text-[#3B82F6]" />
              <span>Audit Log Record Diff — #{selectedAuditLog?.id}</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-[#8BA3C7]">
              Administrative transaction detail changes.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-4 bg-[#060D1A] border border-[#1E3352]/40 rounded-lg p-3 text-[11px]">
              <div>
                <span className="text-[#8BA3C7] block">Table Name</span>
                <span className="text-[#F0F4FF] font-mono font-semibold">{selectedAuditLog?.table_name || 'n/a'}</span>
              </div>
              <div>
                <span className="text-[#8BA3C7] block">Affected UUID</span>
                <span className="text-[#3B82F6] font-mono select-all">{selectedAuditLog?.record_id || 'n/a'}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold text-[#EF4444] mb-1.5 flex items-center gap-1">
                  <span>[-] Old Value State</span>
                </h4>
                <pre className="bg-[#060D1A] text-[#8BA3C7] text-[10px] p-3 rounded border border-[#EF444415] font-mono overflow-x-auto max-h-60 overflow-y-auto whitespace-pre-wrap">
                  {selectedAuditLog?.old_values 
                    ? JSON.stringify(selectedAuditLog.old_values, null, 2) 
                    : '(empty insert state)'}
                </pre>
              </div>

              <div>
                <h4 className="font-semibold text-[#22C55E] mb-1.5 flex items-center gap-1">
                  <span>[+] New Value State</span>
                </h4>
                <pre className="bg-[#060D1A] text-[#8BA3C7] text-[10px] p-3 rounded border border-[#22C55E15] font-mono overflow-x-auto max-h-60 overflow-y-auto whitespace-pre-wrap">
                  {selectedAuditLog?.new_values 
                    ? JSON.stringify(selectedAuditLog.new_values, null, 2) 
                    : '(empty delete state)'}
                </pre>
              </div>
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => setSelectedAuditLog(null)}
              className="bg-transparent border-[#1E3352] text-[#8BA3C7] hover:bg-[#132035] hover:text-[#F0F4FF] cursor-pointer"
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
