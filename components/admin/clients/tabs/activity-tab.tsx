'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Client, ActivityLog } from '@/types';
import { RefreshCw, Activity, User, FileEdit, DollarSign, CheckCircle, AlertTriangle, MessageSquare } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

interface ActivityTabProps {
  client: Client;
}

const ACTION_ICONS: Record<string, React.ElementType> = {
  task_submitted: CheckCircle,
  task_created: FileEdit,
  invoice_created: DollarSign,
  invoice_paid: DollarSign,
  client_updated: User,
  project_created: Activity,
  note_added: MessageSquare,
  default: AlertTriangle,
};

const ACTION_COLORS: Record<string, string> = {
  task_submitted: 'text-online bg-online/10 border-online/20',
  task_created: 'text-primary-light bg-[#4D90FE]/10 border-[#4D90FE]/20',
  invoice_created: 'text-warning bg-warning/10 border-warning/20',
  invoice_paid: 'text-online bg-online/10 border-online/20',
  client_updated: 'text-[#A78BFA] bg-[#A78BFA]/10 border-[#A78BFA]/20',
  project_created: 'text-primary-light bg-[#4D90FE]/10 border-[#4D90FE]/20',
  note_added: 'text-text-secondary bg-[#8BA3C7]/10 border-[#8BA3C7]/20',
  default: 'text-text-tertiary bg-[#4A6480]/10 border-border/20/20',
};

const ACTION_OPTIONS = [
  { value: 'all', label: 'All Actions' },
  { value: 'task_submitted', label: 'Task Submissions' },
  { value: 'task_created', label: 'Tasks Created' },
  { value: 'invoice_created', label: 'Invoices Created' },
  { value: 'invoice_paid', label: 'Invoices Paid' },
  { value: 'client_updated', label: 'Client Updates' },
  { value: 'project_created', label: 'Projects Created' },
  { value: 'note_added', label: 'Strategy Notes' },
];

function getIconAndColor(action: string) {
  const Icon = ACTION_ICONS[action] || ACTION_ICONS.default;
  const color = ACTION_COLORS[action] || ACTION_COLORS.default;
  return { Icon, color };
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMins = Math.floor(diffMs / (1000 * 60));

  if (diffMins < 5) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(dateStr);
}

export function ActivityTab({ client }: ActivityTabProps) {
  const supabase = createClient();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [actionFilter, setActionFilter] = useState('all');

  const PAGE_SIZE = 20;

  const fetchLogs = useCallback(async (pageNum: number, filter: string, isLoadMore = false) => {
    if (isLoadMore) setLoadingMore(true);
    else setLoading(true);

    try {
      const fromOffset = pageNum * PAGE_SIZE;
      const toOffset = fromOffset + PAGE_SIZE - 1;

      let query = supabase
        .from('activity_log')
        .select('*')
        .eq('client_id', client.id)
        .order('created_at', { ascending: false })
        .range(fromOffset, toOffset);

      if (filter !== 'all') {
        query = query.eq('action', filter);
      }

      const { data, error } = await query;
      if (error) throw error;

      if (data) {
        if (isLoadMore) {
          setLogs((prev) => [...prev, ...data]);
        } else {
          setLogs(data);
        }
        if (data.length < PAGE_SIZE) {
          setHasMore(false);
        } else {
          setHasMore(true);
        }
      }
    } catch {
      toast.error('Failed to load client activity log.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [client.id, supabase]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPage(0);
    setHasMore(true);
    fetchLogs(0, actionFilter, false);
  }, [actionFilter, fetchLogs]);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchLogs(nextPage, actionFilter, true);
  };

  const handleRefresh = () => {
    setPage(0);
    setHasMore(true);
    fetchLogs(0, actionFilter, false);
  };

  return (
    <div className="space-y-5">
      {/* Header controls strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 select-none">
        <div>
          <h3 className="text-sm font-semibold text-text-primary">Activity Timeline</h3>
          <p className="text-[10px] text-text-tertiary mt-0.5">
            Recent audit activities across tasks, invoices, and campaigns.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Action Filter */}
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="bg-bg-card border border-border/30 text-xs rounded px-2.5 py-1.5 focus:outline-none focus:border-primary font-semibold text-text-secondary cursor-pointer"
          >
            {ACTION_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <button
            onClick={handleRefresh}
            disabled={loading}
            className="flex items-center gap-1.5 text-[10px] text-text-tertiary hover:text-text-primary bg-bg-card-hover/20 border border-border/30 px-2.5 py-1.5 rounded-[6px] cursor-pointer transition-all"
          >
            <RefreshCw size={11} className={loading && !loadingMore ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Activity Timeline list */}
      {loading && !loadingMore ? (
        <div className="flex items-center justify-center h-40 text-text-tertiary text-xs gap-2">
          <RefreshCw size={14} className="animate-spin" />
          <span>Loading activity timeline...</span>
        </div>
      ) : logs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-border/30 rounded-[10px] bg-bg-dark">
          <Activity size={32} className="text-[#1E3352] mb-3" />
          <p className="text-sm font-medium text-text-tertiary">No Activity Recorded Yet</p>
          <p className="text-xs text-[#2A4060] mt-1 max-w-xs">
            Events will render automatically when updates are processed.
          </p>
        </div>
      ) : (
        <div className="relative space-y-4">
          <div className="relative">
            {/* Connector line */}
            <div className="absolute left-4 top-4 bottom-4 w-px bg-[#1E3352]" />

            <div className="space-y-1">
              {logs.map((log, index) => {
                const { Icon, color } = getIconAndColor(log.action);
                return (
                  <div key={log.id} className="flex gap-4 pl-0 group">
                    {/* Circle icon */}
                    <div className={`relative z-10 w-8 h-8 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${color}`}>
                      <Icon size={12} />
                    </div>

                    {/* Timeline box description */}
                    <div className={`flex-1 pb-5 ${index < logs.length - 1 ? 'border-b border-[#0D1829]' : ''}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-text-primary leading-tight">
                            {log.title}
                          </p>
                          {log.description && (
                            <p className="text-[10px] text-text-secondary mt-0.5 leading-relaxed">
                              {log.description}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className={`text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded border ${color}`}>
                              {log.action.replace(/_/g, ' ')}
                            </span>
                            {log.entity_type && (
                              <span className="text-[9px] text-[#2A4060] font-mono">
                                {log.entity_type}
                              </span>
                            )}
                          </div>
                        </div>
                        <span className="text-[10px] text-text-tertiary font-mono shrink-0 mt-0.5">
                          {formatRelativeTime(log.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Load More Button */}
          {hasMore && (
            <div className="flex justify-center pt-2">
              <Button
                onClick={handleLoadMore}
                disabled={loadingMore}
                size="sm"
                className="bg-bg-card-hover/20 hover:bg-bg-card-hover/40 border border-border/30 text-text-secondary hover:text-text-primary text-xs h-8 gap-1.5 cursor-pointer font-semibold"
              >
                {loadingMore ? <RefreshCw size={12} className="animate-spin" /> : null}
                <span>{loadingMore ? 'Loading more...' : 'Load More'}</span>
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ActivityTab;
