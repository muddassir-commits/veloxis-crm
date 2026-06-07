'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { 
  Search, 
  Clock, 
  ArrowRight, 
  History, 
  User, 
  Briefcase, 
  DollarSign, 
  Activity, 
  FileText, 
  CheckCircle2, 
  FilterX,
  RefreshCw,
  SlidersHorizontal,
  ChevronDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

interface ClientRelation {
  id: string;
  name: string;
}

interface ActivityLog {
  id: string;
  user_id: string | null;
  client_id: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  title: string;
  description: string | null;
  metadata: Record<string, unknown> | null;
  is_read: boolean;
  created_at: string;
  clients: ClientRelation | null;
}

interface ActivityDashboardProps {
  initialLogs: ActivityLog[];
  clients: { id: string; name: string; }[];
}

export function ActivityDashboard({ initialLogs, clients }: ActivityDashboardProps) {
  const supabase = createClient();
  const [logs, setLogs] = useState<ActivityLog[]>(initialLogs);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClient, setSelectedClient] = useState<string>('all');
  const [selectedAction, setSelectedAction] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(initialLogs.length === 50);
  const [offset, setOffset] = useState(50);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Real-time listener for new activities
  useEffect(() => {
    const channel = supabase
      .channel('realtime-activity-log')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'activity_log',
        },
        async (payload) => {
          // Fetch client info if available
          let clientData = null;
          if (payload.new.client_id) {
            const { data } = await supabase
              .from('clients')
              .select('id, name')
              .eq('id', payload.new.client_id)
              .single();
            clientData = data;
          }

          const newLog = {
            ...payload.new,
            clients: clientData,
          } as ActivityLog;

          setLogs((prev) => [newLog, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  // Handle mark all as read
  const handleMarkAllRead = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('activity_log')
        .update({ is_read: true })
        .eq('is_read', false);

      if (error) throw error;

      setLogs((prev) => prev.map((log) => ({ ...log, is_read: true })));
      toast.success('All activities marked as read.');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- cosmetic catch block error
    } catch (err: any) {
      toast.error(err.message || 'Failed to mark activities as read.');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch filtered logs
  const fetchFilteredLogs = async (resetOffset = false) => {
    setIsRefreshing(true);
    const currentOffset = resetOffset ? 0 : offset;
    try {
      let query = supabase
        .from('activity_log')
        .select(`
          *,
          clients(id, name)
        `)
        .order('created_at', { ascending: false });

      if (selectedClient !== 'all') {
        query = query.eq('client_id', selectedClient);
      }
      if (selectedAction !== 'all') {
        query = query.eq('action', selectedAction);
      }
      if (searchQuery.trim() !== '') {
        query = query.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query
        .range(currentOffset, currentOffset + 49);

      if (error) throw error;

      if (resetOffset) {
        setLogs(data || []);
        setOffset(50);
        setHasMore(data?.length === 50);
      } else {
        setLogs((prev) => [...prev, ...(data || [])]);
        setOffset((prev) => prev + 50);
        setHasMore(data?.length === 50);
      }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- cosmetic catch block error
    } catch (err: any) {
      toast.error(err.message || 'Failed to query activities.');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Trigger search/filters
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchFilteredLogs(true);
    }, 0);
    return () => clearTimeout(timer);
  }, [selectedClient, selectedAction, searchQuery]);

  // Load more handler
  const handleLoadMore = () => {
    fetchFilteredLogs(false);
  };

  // Reset filters helper
  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedClient('all');
    setSelectedAction('all');
  };

  // Colored action icons based on action type
  const getActionIcon = (action: string) => {
    switch (action) {
      case 'invoice_paid':
        return (
          <div className="h-8 w-8 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center border border-green-500/20">
            <DollarSign className="h-4 w-4" />
          </div>
        );
      case 'invoice_created':
        return (
          <div className="h-8 w-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/20">
            <FileText className="h-4 w-4" />
          </div>
        );
      case 'client_created':
        return (
          <div className="h-8 w-8 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
            <Briefcase className="h-4 w-4" />
          </div>
        );
      case 'lead_new':
      case 'lead_created':
        return (
          <div className="h-8 w-8 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center border border-orange-500/20">
            <User className="h-4 w-4" />
          </div>
        );
      case 'task_submitted':
        return (
          <div className="h-8 w-8 rounded-full bg-yellow-500/20 text-yellow-400 flex items-center justify-center border border-yellow-500/20">
            <Clock className="h-4 w-4" />
          </div>
        );
      case 'task_completed':
      case 'task_approved':
        return (
          <div className="h-8 w-8 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center border border-green-500/20">
            <CheckCircle2 className="h-4 w-4" />
          </div>
        );
      default:
        return (
          <div className="h-8 w-8 rounded-full bg-slate-500/20 text-slate-400 flex items-center justify-center border border-slate-500/20">
            <Activity className="h-4 w-4" />
          </div>
        );
    }
  };

  const timeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago — ${date.toLocaleDateString()}`;
  };

  return (
    <div className="space-y-6">
      {/* Action Header Banner */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 select-none">
        <div className="flex items-center gap-2">
          <History className="h-5 w-5 text-primary-light stroke-[1.5] animate-pulse" />
          <h3 className="text-sm font-semibold text-text-primary">System Audit Trails</h3>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchFilteredLogs(true)}
            className="h-8 border-border/30 bg-bg-card hover:bg-bg-card-hover/20 text-text-secondary hover:text-text-primary text-xs gap-1.5 cursor-pointer"
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAllRead}
            disabled={isLoading || logs.every(l => l.is_read)}
            className="h-8 border-primary/40 hover:border-primary bg-primary/10 hover:bg-primary/20 text-primary-light text-xs gap-1.5 cursor-pointer font-semibold transition-all duration-150"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            Mark all read
          </Button>
        </div>
      </div>

      {/* Modern Filter panel */}
      <Card className="p-4 bg-bg-card border-border/30 grid grid-cols-1 md:grid-cols-4 gap-4 shadow-xl">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary/60" />
          <Input
            type="text"
            placeholder="Search activity..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 pl-9 bg-bg-dark border-border/30 text-text-primary placeholder-[#8BA3C7]/40 text-xs rounded-md focus:border-primary focus:ring-1 focus:ring-[#1B4FD8]/30 transition-all"
          />
        </div>

        {/* Client dropdown */}
        <Select value={selectedClient} onValueChange={(val) => setSelectedClient(val || 'all')}>
          <SelectTrigger className="h-9 bg-bg-dark border-border/30 text-text-primary text-xs focus:ring-[#1B4FD8]/30">
            <SelectValue placeholder="All Clients" />
          </SelectTrigger>
          <SelectContent className="bg-bg-card border-border/30 text-text-primary">
            <SelectItem value="all" className="text-xs focus:bg-bg-card-hover/20 focus:text-text-primary cursor-pointer">All Clients</SelectItem>
            {clients.map((c) => (
              <SelectItem key={c.id} value={c.id} className="text-xs focus:bg-bg-card-hover/20 focus:text-text-primary cursor-pointer">
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Action Type Dropdown */}
        <Select value={selectedAction} onValueChange={(val) => setSelectedAction(val || 'all')}>
          <SelectTrigger className="h-9 bg-bg-dark border-border/30 text-text-primary text-xs focus:ring-[#1B4FD8]/30">
            <SelectValue placeholder="All Action Types" />
          </SelectTrigger>
          <SelectContent className="bg-bg-card border-border/30 text-text-primary">
            <SelectItem value="all" className="text-xs focus:bg-bg-card-hover/20 focus:text-text-primary cursor-pointer">All Actions</SelectItem>
            <SelectItem value="client_created" className="text-xs focus:bg-bg-card-hover/20 focus:text-text-primary cursor-pointer">Client Created</SelectItem>
            <SelectItem value="lead_new" className="text-xs focus:bg-bg-card-hover/20 focus:text-text-primary cursor-pointer">New Lead Added</SelectItem>
            <SelectItem value="invoice_created" className="text-xs focus:bg-bg-card-hover/20 focus:text-text-primary cursor-pointer">Invoice Created</SelectItem>
            <SelectItem value="invoice_paid" className="text-xs focus:bg-bg-card-hover/20 focus:text-text-primary cursor-pointer">Invoice Paid</SelectItem>
            <SelectItem value="task_submitted" className="text-xs focus:bg-bg-card-hover/20 focus:text-text-primary cursor-pointer">Task Submitted</SelectItem>
            <SelectItem value="task_completed" className="text-xs focus:bg-bg-card-hover/20 focus:text-text-primary cursor-pointer">Task Completed</SelectItem>
            <SelectItem value="activity_created" className="text-xs focus:bg-bg-card-hover/20 focus:text-text-primary cursor-pointer">General Activity</SelectItem>
          </SelectContent>
        </Select>

        {/* Reset button */}
        {(selectedClient !== 'all' || selectedAction !== 'all' || searchQuery !== '') ? (
          <Button
            variant="ghost"
            onClick={handleResetFilters}
            className="h-9 text-accent hover:text-accent hover:bg-accent/10 text-xs gap-1.5 transition-all select-none cursor-pointer"
          >
            <FilterX className="h-3.5 w-3.5" />
            Clear Filters
          </Button>
        ) : (
          <div className="flex items-center gap-1.5 px-3 text-text-secondary/40 text-xs font-semibold select-none">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Filters Pinned
          </div>
        )}
      </Card>

      {/* Main List */}
      <div className="space-y-3">
        {logs.length === 0 ? (
          <Card className="py-12 bg-bg-card border-border/30/60 text-center flex flex-col items-center justify-center gap-3">
            <History className="h-10 w-10 text-text-tertiary stroke-[1]" />
            <h4 className="text-sm font-semibold text-text-primary">No Activities Recorded</h4>
            <p className="text-xs text-text-secondary max-w-xs leading-relaxed">
              There are no activities matching your current filters or system has not registered any logs yet.
            </p>
          </Card>
        ) : (
          <div className="divide-y divide-border/30 rounded-lg border border-border/30 bg-bg-card overflow-hidden shadow-xl">
            {logs.map((log) => (
              <div 
                key={log.id} 
                className={`p-4 flex items-start gap-4 transition-all duration-150 hover:bg-bg-card-hover/20/30 relative ${
                  !log.is_read ? 'bg-primary/5' : ''
                }`}
              >
                {/* Left Blue accent for unread items */}
                {!log.is_read && (
                  <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-primary" />
                )}

                {/* Colored action icon */}
                {getActionIcon(log.action)}

                {/* Action details */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-start sm:items-center justify-between gap-3 flex-col sm:flex-row">
                    <h4 className="text-xs font-semibold text-text-primary leading-snug truncate">
                      {log.title}
                    </h4>
                    <span className="text-[10px] text-text-secondary/60 flex items-center gap-1 shrink-0 font-medium select-none">
                      <Clock className="h-3 w-3" />
                      {timeAgo(log.created_at)}
                    </span>
                  </div>
                  
                  {log.description && (
                    <p className="text-xs text-text-secondary leading-relaxed pr-2 whitespace-pre-wrap">
                      {log.description}
                    </p>
                  )}

                  {/* Badges and metadata */}
                  <div className="flex items-center gap-3 pt-1 select-none flex-wrap">
                    {/* Action Type Badge */}
                    <Badge variant="outline" className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 bg-bg-dark border-border/30 text-text-secondary">
                      {log.action.replace('_', ' ')}
                    </Badge>

                    {/* Linked Client Badge */}
                    {log.clients && (
                      <Badge variant="outline" className="text-[9px] font-semibold px-1.5 py-0.5 bg-primary/10 border-primary/30 text-primary-light flex items-center gap-0.5">
                        <Briefcase className="h-2.5 w-2.5" />
                        {log.clients.name}
                      </Badge>
                    )}

                    {/* Read/Unread Badge */}
                    {!log.is_read ? (
                      <span className="h-1.5 w-1.5 rounded-full bg-primary" title="Unread" />
                    ) : (
                      <span className="text-[9px] text-text-tertiary">read</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Load more button */}
        {hasMore && (
          <div className="flex justify-center pt-4">
            <Button
              variant="outline"
              onClick={handleLoadMore}
              disabled={isRefreshing}
              className="border-border/30 bg-bg-card hover:bg-bg-card-hover/20 text-text-secondary hover:text-text-primary text-xs font-semibold h-9 px-6 cursor-pointer select-none gap-2 shrink-0 transition-all duration-150"
            >
              {isRefreshing && <RefreshCw className="h-3 w-3 animate-spin" />}
              Load More Activities
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
