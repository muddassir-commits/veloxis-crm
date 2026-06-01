'use client';

/* eslint-disable */

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import {
  Play,
  RefreshCw,
  Cpu,
  CheckCircle2,
  XCircle,
  Clock,
  ToggleLeft,
  ToggleRight,
  ChevronRight,
  Database,
  Activity,
  Workflow
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { DataTable } from '@/components/shared/data-table';
import { StatusBadge } from '@/components/shared/status-badge';
import { StatCard } from '@/components/shared/stat-card';
import { CronJob, CronJobRun } from '@/types';

interface AutomationsDashboardProps {
  initialCronJobs: CronJob[] | null;
}

export function AutomationsDashboard({ initialCronJobs }: AutomationsDashboardProps) {
  const supabase = createClient();
  const [jobs, setJobs] = useState<CronJob[]>(initialCronJobs || []);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedJob, setSelectedJob] = useState<CronJob | null>(null);
  const [runHistory, setRunHistory] = useState<CronJobRun[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [triggeringJobId, setTriggeringJobId] = useState<string | null>(null);

  // Hardcoded event-triggered workflows
  const [eventWorkflows, setEventWorkflows] = useState([
    {
      id: 'evt-1',
      name: 'Website Lead Capture Sync',
      description: 'Triggered when a user submits the audit form. Adds to Leads table, scores, and notifies agent.',
      triggerEvent: 'Website Form Submission webhook',
      isActive: true,
      lastTriggered: new Date(Date.now() - 30 * 60 * 1000).toISOString() // 30 mins ago
    },
    {
      id: 'evt-2',
      name: 'Paid Invoice n8n Callback',
      description: 'Triggered when invoice status updates to paid. Sends thank you email via Resend and logs activity.',
      triggerEvent: 'Invoice Status -> paid',
      isActive: true,
      lastTriggered: new Date(Date.now() - 2 * 3600 * 1000).toISOString() // 2 hours ago
    },
    {
      id: 'evt-3',
      name: 'Task Submission Review Notify',
      description: 'Triggered when employee submits a task for review. Sends WhatsApp and email notification to Muddassir.',
      triggerEvent: 'Task Status -> review',
      isActive: true,
      lastTriggered: new Date(Date.now() - 5 * 3600 * 1000).toISOString() // 5 hours ago
    },
    {
      id: 'evt-4',
      name: 'Invoice Overdue Automated Alert',
      description: 'Triggered daily to check and flag unpaid invoice balances, sending gentle automated email sequences.',
      triggerEvent: 'Daily 6pm cron check',
      isActive: false,
      lastTriggered: new Date(Date.now() - 24 * 3600 * 1000).toISOString() // 24 hours ago
    }
  ]);

  const refreshData = async () => {
    setIsRefreshing(true);
    try {
      const { data, error } = await supabase
        .from('cron_jobs')
        .select('*')
        .order('name', { ascending: true });
      if (error) throw error;
      setJobs(data || []);
      toast.success('Workflow configurations synced.');
    } catch (err) {
      toast.error('Failed to sync workflows.');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleTriggerJob = async (job: CronJob, e: React.MouseEvent) => {
    e.stopPropagation(); // prevent row click sheet open
    setTriggeringJobId(job.id);
    const toastId = toast.loading(`Triggering workflow '${job.name}'...`);
    try {
      const response = await fetch(`/api/automations/trigger/${job.id}`, {
        method: 'POST',
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to trigger');
      toast.success(`Workflow '${job.name}' started successfully!`, { id: toastId });
      refreshData();
    } catch (err: any) {
      toast.error(`Trigger failed: ${err.message}`, { id: toastId });
    } finally {
      setTriggeringJobId(null);
    }
  };

  const handleToggleEventWorkflow = (id: string, name: string) => {
    setEventWorkflows((prev) =>
      prev.map((w) => {
        if (w.id === id) {
          const nextState = !w.isActive;
          toast.success(`${name} has been ${nextState ? 'enabled' : 'disabled'}.`);
          return { ...w, isActive: nextState };
        }
        return w;
      })
    );
  };

  const fetchJobHistory = async (job: CronJob) => {
    setIsHistoryLoading(true);
    try {
      const { data, error } = await supabase
        .from('cron_job_runs')
        .select('*')
        .eq('job_id', job.id)
        .order('started_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      setRunHistory(data || []);
    } catch (err) {
      toast.error('Failed to load execution runs.');
    } finally {
      setIsHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (selectedJob) {
      fetchJobHistory(selectedJob);
    }
  }, [selectedJob]);

  // Statistics calculations
  const totalJobsCount = jobs.length;
  const activeJobsCount = jobs.filter((j) => j.is_active).length;
  const successRate = jobs.length 
    ? Math.round((jobs.filter((j) => j.last_status === 'success').length / jobs.length) * 100) 
    : 100;

  const columns = [
    {
      key: 'name',
      header: 'Workflow Name',
      render: (val: any, row: any) => (
        <div className="flex flex-col select-none">
          <span className="font-semibold text-[#F0F4FF] text-xs sm:text-sm">{row.name}</span>
          <span className="text-[11px] text-[#8BA3C7]/80 line-clamp-1 max-w-xs">{row.description || 'No description provided'}</span>
        </div>
      )
    },
    {
      key: 'cron_expression',
      header: 'Schedule / Express',
      render: (val: any) => (
        <code className="text-[11px] font-mono text-[#F97316] bg-[#F9731610] px-1.5 py-0.5 rounded border border-[#F9731620]">
          {val}
        </code>
      )
    },
    {
      key: 'last_run',
      header: 'Last Executed',
      render: (val: any) => val ? new Date(val).toLocaleString() : 'Never'
    },
    {
      key: 'next_run',
      header: 'Next Target Run',
      render: (val: any) => val ? new Date(val).toLocaleString() : 'Not scheduled'
    },
    {
      key: 'last_status',
      header: 'Last Execution Status',
      render: (val: any) => {
        const status = val || 'never';
        let badgeColor = 'bg-[#1E335220] text-[#8BA3C7] border-[#1E335230]';
        let statusLabel = 'Never Run';
        if (status === 'success') {
          badgeColor = 'bg-[#22C55E15] text-[#22C55E] border-[#22C55E30]';
          statusLabel = 'Success';
        } else if (status === 'failed') {
          badgeColor = 'bg-[#EF444415] text-[#EF4444] border-[#EF444430]';
          statusLabel = 'Failed';
        } else if (status === 'running') {
          badgeColor = 'bg-[#3B82F615] text-[#3B82F6] border-[#3B82F630]';
          statusLabel = 'Running';
        }
        return (
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${badgeColor}`}>
            {statusLabel}
          </span>
        );
      }
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (val: any, row: any) => (
        <Button
          onClick={(e) => handleTriggerJob(row, e)}
          disabled={triggeringJobId === row.id}
          size="sm"
          className="bg-[#1B4FD8] hover:bg-[#2563EB] text-white text-[11px] h-7 px-2.5 gap-1 select-none cursor-pointer"
        >
          <Play size={10} className="fill-current" />
          <span>{triggeringJobId === row.id ? 'Running...' : 'Run Now'}</span>
        </Button>
      )
    }
  ];

  return (
    <div className="space-y-6 select-none">
      {/* ━━━ TOP STAT CARDS ━━━ */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="Total Cron Automations"
          value={totalJobsCount}
          subtext="Active recurring tasks mapped in DB"
          icon={Cpu}
        />
        <StatCard
          title="Active Integrations"
          value={activeJobsCount}
          subtext="Schedules currently turned ON"
          icon={Activity}
        />
        <StatCard
          title="Avg Success Rate"
          value={`${successRate}%`}
          subtext="Based on last execution runs status"
          icon={CheckCircle2}
        />
        <StatCard
          title="Event Webhooks"
          value={eventWorkflows.filter((w) => w.isActive).length}
          subtext="Active real-time system triggers"
          icon={Workflow}
        />
      </div>

      {/* ━━━ MAIN AUTOMATION LISTS ━━━ */}
      <div className="border-b border-[#1E3352] pb-2 flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-[#F0F4FF] flex items-center gap-2">
            <Database size={16} className="text-[#3B82F6]" />
            <span>Scheduled Workflows (n8n Sync)</span>
          </h2>
          <p className="text-xs text-[#8BA3C7] mt-0.5">Click any scheduled row to inspect execution runs history.</p>
        </div>
        <Button
          onClick={refreshData}
          disabled={isRefreshing}
          size="sm"
          className="bg-[#132035] hover:bg-[#1A2D47] border border-[#1E3352] text-[#8BA3C7] hover:text-[#F0F4FF] text-xs h-8 gap-1.5 cursor-pointer font-semibold"
        >
          <RefreshCw size={13} className={isRefreshing ? 'animate-spin' : ''} />
          <span>Sync Status</span>
        </Button>
      </div>

      <div className="w-full">
        <DataTable
          columns={columns}
          data={jobs as any}
          onRowClick={(row) => setSelectedJob(row as any)}
          emptyState={{
            title: 'No Automation Workflows Configured',
            description: 'Insert cron job records in Supabase to start monitoring.',
          }}
        />
      </div>

      {/* ━━━ EVENT TRIGGERS SECTION ━━━ */}
      <div className="mt-8 space-y-4">
        <div>
          <h2 className="text-base font-semibold text-[#F0F4FF] flex items-center gap-2">
            <Workflow size={16} className="text-[#F97316]" />
            <span>Real-time Event Triggers</span>
          </h2>
          <p className="text-xs text-[#8BA3C7] mt-0.5">Real-time webhooks fired on specific events inside Veloxis CRM.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {eventWorkflows.map((flow) => (
            <div 
              key={flow.id} 
              className="rounded-lg border border-[#1E3352]/60 bg-[#0D1829] p-4 flex flex-col justify-between hover:border-[#1E3352] transition-colors"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="space-y-0.5">
                    <h3 className="font-semibold text-xs sm:text-sm text-[#F0F4FF]">{flow.name}</h3>
                    <code className="text-[10px] font-mono text-[#F97316] bg-[#F973160c] px-1.5 py-0.5 rounded border border-[#F973161c]">
                      {flow.triggerEvent}
                    </code>
                  </div>
                  <Switch
                    checked={flow.isActive}
                    onCheckedChange={() => handleToggleEventWorkflow(flow.id, flow.name)}
                  />
                </div>
                <p className="text-xs text-[#8BA3C7]/90 mt-3 leading-relaxed">{flow.description}</p>
              </div>

              <div className="mt-4 pt-3 border-t border-[#1E3352]/20 flex items-center justify-between text-[11px] text-[#8BA3C7]">
                <span className="flex items-center gap-1 font-semibold">
                  <span className={`w-2 h-2 rounded-full ${flow.isActive ? 'bg-[#22C55E] animate-pulse' : 'bg-gray-500'}`} />
                  <span>{flow.isActive ? 'LISTENING' : 'DISABLED'}</span>
                </span>
                <span>Last Fired: {flow.lastTriggered ? new Date(flow.lastTriggered).toLocaleTimeString() : 'Never'}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ━━━ DRAWER SHEET: JOB HISTORY RUNS ━━━ */}
      <Sheet open={selectedJob !== null} onOpenChange={(open) => !open && setSelectedJob(null)}>
        <SheetContent side="right" className="bg-[#0D1829] border-l border-[#1E3352] text-[#F0F4FF] sm:max-w-md select-none overflow-y-auto p-0">
          <SheetHeader className="p-6 border-b border-[#1E3352]/40">
            <SheetTitle className="text-[#F0F4FF] text-base font-semibold">{selectedJob?.name}</SheetTitle>
            <SheetDescription className="text-[#8BA3C7] text-xs">
              Workflow schedule runs and execution logs.
            </SheetDescription>
          </SheetHeader>

          <div className="p-6 space-y-6 text-xs">
            <div>
              <h4 className="font-semibold text-[#F0F4FF] mb-1">Schedule Details</h4>
              <div className="grid grid-cols-2 gap-2 bg-[#060D1A] border border-[#1E3352]/40 rounded-lg p-3 text-[11px]">
                <div>
                  <span className="text-[#8BA3C7] block">Cron Expression</span>
                  <code className="text-[#F97316] font-mono">{selectedJob?.cron_expression}</code>
                </div>
                <div>
                  <span className="text-[#8BA3C7] block">n8n ID</span>
                  <code className="text-[#3B82F6] font-mono">{selectedJob?.n8n_workflow_id || 'n/a'}</code>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-[#F0F4FF] mb-3 flex items-center gap-1.5">
                <Clock size={13} className="text-[#8BA3C7]" />
                <span>Last 10 Execution Runs</span>
              </h4>

              {isHistoryLoading ? (
                <div className="space-y-3 py-4 text-center text-[#8BA3C7]">
                  <RefreshCw size={20} className="animate-spin mx-auto text-[#1B4FD8]" />
                  <span>Loading history...</span>
                </div>
              ) : runHistory.length === 0 ? (
                <div className="border border-dashed border-[#1E3352]/40 rounded-lg p-6 text-center text-[#8BA3C7] my-2">
                  No execution runs found. Click "Run Now" to trigger a run.
                </div>
              ) : (
                <div className="space-y-3">
                  {runHistory.map((run) => {
                    const isSuccess = run.status === 'success';
                    const runDuration = run.started_at && run.ended_at
                      ? Math.round(new Date(run.ended_at).getTime() - new Date(run.started_at).getTime())
                      : null;

                    return (
                      <div 
                        key={run.id} 
                        className="rounded-lg border border-[#1E3352]/50 bg-[#060D1A]/50 p-3 space-y-2 hover:border-[#1E3352] transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-[#F0F4FF] font-medium">
                            {new Date(run.started_at).toLocaleString()}
                          </span>
                          <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold ${
                            isSuccess 
                              ? 'bg-[#22C55E10] text-[#22C55E]' 
                              : 'bg-[#EF444410] text-[#EF4444]'
                          }`}>
                            {isSuccess ? <CheckCircle2 size={9} /> : <XCircle size={9} />}
                            <span>{run.status?.toUpperCase() || 'RUNNING'}</span>
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-[10px] text-[#8BA3C7]">
                          <div>
                            <span>Duration:</span>{' '}
                            <span className="text-[#F0F4FF]">
                              {runDuration !== null ? `${runDuration}ms` : 'n/a'}
                            </span>
                          </div>
                        </div>

                        {run.error && (
                          <div className="bg-[#EF44440c] border border-[#EF444420] text-[#EF4444] text-[10px] p-2 rounded font-mono break-all whitespace-pre-wrap max-h-24 overflow-y-auto">
                            {run.error}
                          </div>
                        )}
                        {!run.error && run.output && (
                          <details className="cursor-pointer group">
                            <summary className="text-[10px] text-[#3B82F6] hover:underline list-none flex items-center gap-0.5 select-none font-semibold">
                              <ChevronRight size={10} className="group-open:rotate-90 transition-transform" />
                              <span>View Payload / Result</span>
                            </summary>
                            <pre className="mt-2 bg-[#060D1A] text-[#8BA3C7] text-[9px] p-2 rounded border border-[#1E3352]/30 font-mono overflow-x-auto max-h-36 overflow-y-auto">
                              {JSON.stringify(run.output, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
export default AutomationsDashboard;
