// components/seo/seo-dashboard.tsx
'use client';

import React, { useState, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import {
  Search,
  Plus,
  RefreshCw,
  Compass,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/shared/data-table';
import { LogReportModal } from './log-report-modal';
import { AddKeywordModal } from './add-keyword-modal';
import { Client, SeoCampaign, SeoKeyword, GscConnection, Ga4Connection } from '@/types';

interface SeoDashboardProps {
  initialClients: Client[];
  initialCampaigns: SeoCampaign[];
  initialKeywords: SeoKeyword[];
  initialGscConns: GscConnection[];
  initialGa4Conns: Ga4Connection[];
  selectedMonth: string;
}

export function SeoDashboard({
  initialClients,
  initialCampaigns,
  initialKeywords,
  initialGscConns,
  initialGa4Conns,
  selectedMonth,
}: SeoDashboardProps) {
  const router = useRouter();
  const supabase = createClient();
  const [isPending, startTransition] = useTransition();

  // Modals state
  const [logReportOpen, setLogReportOpen] = useState(false);
  const [addKeywordOpen, setAddKeywordOpen] = useState(false);

  // Table sorting & filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterClientId, setFilterClientId] = useState('all');
  const [sortField, setSortField] = useState<'current_position' | 'keyword' | 'client'>('current_position');
  const [sortAsc, setSortAsc] = useState(true);

  // Syncing loaders
  const [syncingAll, setSyncingAll] = useState(false);
  const [syncingClientId, setSyncingClientId] = useState<string | null>(null);

  useEffect(() => {
    const campaignsChannel = supabase
      .channel('seo-campaigns-dashboard')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'seo_campaigns'
        },
        (payload) => {
          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            toast.success('Live Update: SEO Campaign metrics updated in real-time!', {
              description: 'Dashboard metrics refreshed automatically.'
            });
          }
          router.refresh();
        }
      )
      .subscribe();

    const keywordsChannel = supabase
      .channel('seo-keywords-dashboard')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'seo_keywords'
        },
        (payload) => {
          router.refresh();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(campaignsChannel);
      supabase.removeChannel(keywordsChannel);
    };
  }, [supabase, router]);

  // Month navigation (e.g. "Jun 2026")
  const handleMonthChange = (offset: number) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const [month, year] = selectedMonth.split(' ');
    const monthIndex = months.indexOf(month);
    if (monthIndex === -1) return;

    const date = new Date(Number(year), monthIndex, 1);
    date.setMonth(date.getMonth() + offset);

    const newMonthStr = `${months[date.getMonth()]} ${date.getFullYear()}`;
    startTransition(() => {
      router.push(`/dashboard/seo?month=${encodeURIComponent(newMonthStr)}`);
    });
  };

  // Sync All connected integrations
  const handleSyncAll = async () => {
    setSyncingAll(true);
    const toastId = toast.loading('Syncing all active GSC & GA4 clients...');
    try {
      const res = await fetch('/api/integrations/sync-all', {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to sync all integrations');
      }
      toast.success('All client integrations synced successfully!', { id: toastId });
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Sync failed';
      toast.error(msg, { id: toastId });
    } finally {
      setSyncingAll(false);
    }
  };

  // Sync single client
  const handleSyncClient = async (clientId: string) => {
    setSyncingClientId(clientId);
    const toastId = toast.loading('Syncing client Search Console & GA4 data...');
    try {
      // 1. Sync GSC
      const gscRes = await fetch(`/api/integrations/gsc/sync/${clientId}`, {
        method: 'POST',
      });
      const gscData = await gscRes.json();

      // 2. Sync GA4
      const ga4Res = await fetch(`/api/integrations/ga4/sync/${clientId}`, {
        method: 'POST',
      });
      const ga4Data = await ga4Res.json();

      if (gscData.error && ga4Data.error) {
        throw new Error(`Sync failed. GSC: ${gscData.error}. GA4: ${ga4Data.error}`);
      }

      toast.success('Client integration data synced.', { id: toastId });
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Client sync failed';
      toast.error(msg, { id: toastId });
    } finally {
      setSyncingClientId(null);
    }
  };

  // Delete Keyword
  const handleDeleteKeyword = async (id: string) => {
    const ok = window.confirm('Are you sure you want to remove this keyword from tracking?');
    if (!ok) return;

    try {
      const { error } = await supabase.from('seo_keywords').delete().eq('id', id);
      if (error) throw error;
      toast.success('Keyword removed.');
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete keyword';
      toast.error(msg);
    }
  };

  // Sort toggle handler
  const handleSort = (field: 'current_position' | 'keyword' | 'client') => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  // Sort clients: pin self-client (is_agency_self === true) first, then sort by name
  const sortedClients = [...initialClients].sort((a, b) => {
    if (a.is_agency_self && !b.is_agency_self) return -1;
    if (!a.is_agency_self && b.is_agency_self) return 1;
    return a.name.localeCompare(b.name);
  });

  // Map keywords with client names
  const mappedKeywords = initialKeywords.map((kw) => ({
    ...kw,
    clientName: initialClients.find((c) => c.id === kw.client_id)?.name || 'Unknown Client',
  }));

  // Filter keywords
  const filteredKeywords = mappedKeywords.filter((kw) => {
    const matchesClient = filterClientId === 'all' || kw.client_id === filterClientId;
    const matchesSearch = kw.keyword.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesClient && matchesSearch;
  });

  // Sort keywords
  const sortedKeywords = [...filteredKeywords].sort((a, b) => {
    let valA: string | number = '';
    let valB: string | number = '';

    if (sortField === 'keyword') {
      valA = a.keyword.toLowerCase();
      valB = b.keyword.toLowerCase();
    } else if (sortField === 'client') {
      valA = a.clientName.toLowerCase();
      valB = b.clientName.toLowerCase();
    } else if (sortField === 'current_position') {
      valA = a.current_position !== null && a.current_position !== undefined ? a.current_position : 999;
      valB = b.current_position !== null && b.current_position !== undefined ? b.current_position : 999;
    }

    if (valA < valB) return sortAsc ? -1 : 1;
    if (valA > valB) return sortAsc ? 1 : -1;
    return 0;
  });

  // Format sync hours ago
  const formatHoursAgo = (dateString?: string | null) => {
    if (!dateString) return 'Never synced';
    // eslint-disable-next-line react-hooks/purity
    const diffMs = Date.now() - new Date(dateString).getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours <= 0) {
      const diffMins = Math.floor(diffMs / (1000 * 60));
      if (diffMins <= 0) return 'Just now';
      return `${diffMins}m ago`;
    }
    if (diffHours >= 24) {
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays}d ago`;
    }
    return `${diffHours}h ago`;
  };

  // Columns for Keyword DataTable
  const columns = [
    {
      key: 'keyword',
      header: (
        <button
          onClick={() => handleSort('keyword')}
          className="flex items-center gap-1 hover:text-[#F0F4FF] cursor-pointer"
        >
          <span>Keyword Target</span>
          {sortField === 'keyword' && (sortAsc ? ' ▲' : ' ▼')}
        </button>
      ),
      width: '28%',
      render: (val: unknown, row: Record<string, unknown>) => (
        <div className="flex flex-col gap-0.5">
          <span className="font-semibold text-xs text-[#F0F4FF]">{String(val)}</span>
          {Boolean(row.target_url) && (
            <a
              href={String(row.target_url).startsWith('http') ? String(row.target_url) : `https://${String(row.target_url)}`}
              target="_blank"
              rel="noreferrer"
              className="text-[9px] text-[#4D90FE] hover:underline truncate max-w-[220px]"
            >
              {String(row.target_url)}
            </a>
          )}
        </div>
      ),
    },
    {
      key: 'clientName',
      header: (
        <button
          onClick={() => handleSort('client')}
          className="flex items-center gap-1 hover:text-[#F0F4FF] cursor-pointer"
        >
          <span>Client</span>
          {sortField === 'client' && (sortAsc ? ' ▲' : ' ▼')}
        </button>
      ),
      width: '16%',
      render: (val: unknown) => <span className="font-semibold text-xs text-[#8BA3C7]">{String(val)}</span>,
    },
    {
      key: 'current_position',
      header: (
        <button
          onClick={() => handleSort('current_position')}
          className="flex items-center gap-1 hover:text-[#F0F4FF] cursor-pointer"
        >
          <span>Current Pos</span>
          {sortField === 'current_position' && (sortAsc ? ' ▲' : ' ▼')}
        </button>
      ),
      width: '12%',
      render: (val: unknown) => {
        const pos = Number(val);
        if (val === null || isNaN(pos)) return <span className="text-[#4A6480] font-mono">-</span>;

        let colorClass = 'text-[#EF4444]'; // 20+
        if (pos <= 3) colorClass = 'text-[#22C55E] font-bold';
        else if (pos <= 10) colorClass = 'text-[#1B4FD8] font-bold';
        else if (pos <= 20) colorClass = 'text-[#F59E0B]';

        return <span className={`font-mono text-xs ${colorClass}`}>#{pos}</span>;
      },
    },
    {
      key: 'previous_position',
      header: 'Prev Pos',
      width: '10%',
      render: (val: unknown) => {
        const pos = Number(val);
        if (val === null || isNaN(pos)) return <span className="text-[#4A6480] font-mono">-</span>;
        return <span className="text-[#4A6480] font-mono text-xs">#{pos}</span>;
      },
    },
    {
      key: 'change',
      header: 'Change',
      width: '10%',
      render: (_val: unknown, row: Record<string, unknown>) => {
        const curr = row.current_position !== null ? Number(row.current_position) : null;
        const prev = row.previous_position !== null ? Number(row.previous_position) : null;

        if (curr === null || prev === null) return <span className="text-[#4A6480] font-mono">-</span>;

        const diff = prev - curr; // positive = moved up in rankings (nearer to #1)
        if (diff > 0) return <span className="text-[#22C55E] text-xs font-mono">↑{diff}</span>;
        if (diff < 0) return <span className="text-[#EF4444] text-xs font-mono">↓{Math.abs(diff)}</span>;
        return <span className="text-[#4A6480] text-xs font-mono">→</span>;
      },
    },
    {
      key: 'search_volume',
      header: 'Volume',
      width: '10%',
      render: (val: unknown) => (
        <span className="font-mono text-xs text-[#8BA3C7]">
          {val ? Number(val).toLocaleString() : '-'}
        </span>
      ),
    },
    {
      key: 'intent',
      header: 'Intent',
      width: '14%',
      render: (val: unknown) => (
        <span className="text-[10px] bg-[#132035] border border-[#1E3352] text-[#8BA3C7] px-1.5 py-0.5 rounded uppercase font-medium">
          {String(val || '')}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6 select-none p-6">
      {/* ━━━ HEADER SECTION ━━━ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1E3352]/30 pb-5">
        <div>
          <h1 className="text-[26px] font-black text-[#F0F4FF] leading-tight">SEO Campaigns</h1>
          <p className="text-xs text-[#8BA3C7]">Manage organic search analytics integrations and keyword tracklists.</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Month Selector */}
          <div className="flex items-center gap-1 mr-2">
            <button
              onClick={() => handleMonthChange(-1)}
              disabled={isPending}
              className="p-1.5 rounded bg-[#132035] border border-[#1E3352] text-[#8BA3C7] hover:text-[#F0F4FF] disabled:opacity-50 cursor-pointer transition-colors"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="text-xs font-bold text-[#F0F4FF] min-w-[85px] text-center font-mono py-1 bg-[#132035] border border-[#1E3352] rounded">
              {selectedMonth}
            </span>
            <button
              onClick={() => handleMonthChange(1)}
              disabled={isPending}
              className="p-1.5 rounded bg-[#132035] border border-[#1E3352] text-[#8BA3C7] hover:text-[#F0F4FF] disabled:opacity-50 cursor-pointer transition-colors"
            >
              <ChevronRight size={14} />
            </button>
          </div>

          <Button
            onClick={() => setLogReportOpen(true)}
            size="sm"
            className="bg-[#1B4FD8]/20 text-[#4D90FE] border border-[#1E3352] hover:bg-[#1B4FD8] hover:text-white text-xs h-9 gap-1.5 cursor-pointer font-bold transition-all"
          >
            <span>+ Log SEO Report</span>
          </Button>

          <Button
            onClick={() => setAddKeywordOpen(true)}
            size="sm"
            className="bg-[#1B4FD8] hover:bg-[#2563EB] text-white text-xs h-9 gap-1.5 cursor-pointer font-bold transition-all"
          >
            <Plus size={14} />
            <span>Add Keyword</span>
          </Button>

          <Button
            onClick={handleSyncAll}
            disabled={syncingAll}
            size="sm"
            className="bg-[#132035] hover:bg-[#1A2D47] border border-[#1E3352] text-[#8BA3C7] hover:text-[#F0F4FF] text-xs h-9 gap-1.5 cursor-pointer transition-colors"
          >
            <RefreshCw size={13} className={syncingAll ? 'animate-spin' : ''} />
            <span>🔄 Sync All</span>
          </Button>
        </div>
      </div>

      {/* ━━━ CLIENT SEO CARDS GRID ━━━ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {sortedClients.map((client) => {
          const campaign = initialCampaigns.find((c) => c.client_id === client.id);
          const gscConn = initialGscConns.find((c) => c.client_id === client.id);
          const ga4Conn = initialGa4Conns.find((c) => c.client_id === client.id);

          const gscConnected = !!(gscConn && gscConn.is_active);
          const ga4Connected = !!(ga4Conn && ga4Conn.is_active && ga4Conn.property_id);

          // MoM organic traffic calculations
          const traffic = campaign?.organic_traffic ?? 0;
          const trafficPrev = campaign?.organic_traffic_prev ?? 0;
          let momText = '-';
          let momColor = 'text-[#8BA3C7]';
          if (trafficPrev > 0) {
            const diffPct = Math.round(((traffic - trafficPrev) / trafficPrev) * 100);
            if (diffPct > 0) {
              momText = `↑${diffPct}%`;
              momColor = 'text-[#22C55E] font-bold';
            } else if (diffPct < 0) {
              momText = `↓${Math.abs(diffPct)}%`;
              momColor = 'text-[#EF4444] font-bold';
            } else {
              momText = '→ 0%';
            }
          }

          // Progress calculation for top3/top10/top20 stacked progress
          const totalKeywords = campaign?.keywords_tracked || 1;
          const kTop3 = campaign?.keywords_top3 || 0;
          const kTop10 = campaign?.keywords_top10 || 0;
          const kTop20 = campaign?.keywords_top20 || 0;

          // Nested segments subtraction
          const top3W = kTop3;
          const top10W = Math.max(0, kTop10 - kTop3);
          const top20W = Math.max(0, kTop20 - kTop10);
          const otherW = Math.max(0, totalKeywords - kTop20);

          const pct3 = (top3W / totalKeywords) * 100;
          const pct10 = (top10W / totalKeywords) * 100;
          const pct20 = (top20W / totalKeywords) * 100;
          const pctOther = (otherW / totalKeywords) * 100;

          // Audit progress bar
          const auditIssues = campaign?.audit_issues_found ?? 0;
          const auditResolved = campaign?.audit_issues_resolved ?? 0;
          const auditProgressPct = auditIssues > 0 ? Math.min(100, Math.round((auditResolved / auditIssues) * 100)) : 0;

          // Last synced time
          const lastSynced = campaign?.data_synced_at || gscConn?.last_sync || ga4Conn?.last_sync;

          return (
            <div
              key={client.id}
              className="bg-[#0D1829] border border-[#1E3352] rounded-[10px] p-5 flex flex-col justify-between space-y-4 hover:border-[#1B4FD8]/40 transition-colors"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-[#1E3352]/20 pb-3">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[#F0F4FF] text-sm">{client.name}</span>
                  {client.is_agency_self ? (
                    <span className="text-[9px] font-bold bg-[#F97316]/10 border border-[#F97316]/20 text-[#F97316] rounded-full px-2 py-0.5 uppercase tracking-wide">
                      My Agency
                    </span>
                  ) : (
                    <span className={`text-[9px] font-bold ${
                      client.status === 'active' ? 'bg-[#22C55E]/10 border-[#22C55E]/20 text-[#22C55E]' :
                      client.status === 'paused' ? 'bg-[#F59E0B]/10 border-[#F59E0B]/20 text-[#F59E0B]' :
                      'bg-[#EF4444]/10 border-[#EF4444]/20 text-[#EF4444]'
                    } border rounded-full px-2 py-0.5 uppercase`}>
                      {client.status}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  {(gscConnected || ga4Connected) && (
                    <button
                      onClick={() => handleSyncClient(client.id)}
                      disabled={syncingClientId === client.id}
                      className="p-1 rounded bg-[#132035] border border-[#1E3352] text-[#8BA3C7] hover:text-[#F0F4FF] cursor-pointer disabled:opacity-50 transition-colors"
                      title="Sync client reports"
                    >
                      <RefreshCw size={11} className={syncingClientId === client.id ? 'animate-spin' : ''} />
                    </button>
                  )}
                  <a
                    href={`/dashboard/clients/${client.id}?tab=seo`}
                    className="text-[11px] text-[#4D90FE] hover:underline inline-flex items-center gap-1 font-semibold"
                  >
                    <span>View Details</span>
                    <ExternalLink size={10} />
                  </a>
                </div>
              </div>

              {/* 6-metric mini-grid (2x3) */}
              <div className="grid grid-cols-3 gap-3">
                {/* 1. Organic Traffic */}
                <div className="bg-[#132035]/30 border border-[#1E3352]/20 p-2.5 rounded flex flex-col justify-between h-[66px]">
                  <span className="text-[10px] text-[#4A6480] uppercase tracking-wider">Organic Traffic</span>
                  <div className="flex items-baseline justify-between mt-1">
                    <span className="text-sm font-bold text-[#F0F4FF] font-mono">
                      {traffic.toLocaleString()}
                    </span>
                    <span className={`text-[10px] ${momColor}`}>{momText}</span>
                  </div>
                </div>

                {/* 2. Keywords Top 10 */}
                <div className="bg-[#132035]/30 border border-[#1E3352]/20 p-2.5 rounded flex flex-col justify-between h-[66px]">
                  <span className="text-[10px] text-[#4A6480] uppercase tracking-wider">Top 10 Keywords</span>
                  <div>
                    <div className="text-sm font-bold text-[#F0F4FF] font-mono mt-1">{kTop10}</div>
                    {/* Nested Breakdown Progress */}
                    <div className="w-full bg-[#132035] h-[3px] rounded-full mt-1.5 flex overflow-hidden">
                      <div className="bg-[#22C55E] h-full" style={{ width: `${pct3}%` }} title={`Top 3: ${kTop3}`} />
                      <div className="bg-[#1B4FD8] h-full" style={{ width: `${pct10}%` }} title={`Top 10: ${kTop10 - kTop3}`} />
                      <div className="bg-[#F59E0B] h-full" style={{ width: `${pct20}%` }} title={`Top 20: ${kTop20 - kTop10}`} />
                      <div className="bg-[#1E3352] h-full" style={{ width: `${pctOther}%` }} title={`Other: ${totalKeywords - kTop20}`} />
                    </div>
                  </div>
                </div>

                {/* 3. Backlinks */}
                <div className="bg-[#132035]/30 border border-[#1E3352]/20 p-2.5 rounded flex flex-col justify-between h-[66px]">
                  <span className="text-[10px] text-[#4A6480] uppercase tracking-wider">Backlinks Built</span>
                  <span className="text-sm font-bold text-[#F0F4FF] font-mono mt-1">
                    {campaign?.backlinks_built ?? 0}
                  </span>
                </div>

                {/* 4. GBP Calls */}
                <div className="bg-[#132035]/30 border border-[#1E3352]/20 p-2.5 rounded flex flex-col justify-between h-[66px]">
                  <span className="text-[10px] text-[#4A6480] uppercase tracking-wider">GBP Calls</span>
                  <span className="text-sm font-bold text-[#F0F4FF] font-mono mt-1">
                    {campaign?.gbp_calls ?? 0}
                  </span>
                </div>

                {/* 5. GSC Clicks & CTR */}
                <div className="bg-[#132035]/30 border border-[#1E3352]/20 p-2.5 rounded flex flex-col justify-between h-[66px]">
                  <span className="text-[10px] text-[#4A6480] uppercase tracking-wider">GSC Clicks</span>
                  <div className="flex flex-col mt-0.5">
                    <span className="text-sm font-bold text-[#F0F4FF] font-mono">
                      {(campaign?.gsc_clicks ?? 0).toLocaleString()}
                    </span>
                    <span className="text-[8.5px] text-[#4A6480] font-mono">
                      CTR: {campaign?.gsc_ctr ? `${campaign.gsc_ctr}%` : '0%'}
                    </span>
                  </div>
                </div>

                {/* 6. Avg Position */}
                <div className="bg-[#132035]/30 border border-[#1E3352]/20 p-2.5 rounded flex flex-col justify-between h-[66px]">
                  <span className="text-[10px] text-[#4A6480] uppercase tracking-wider">Avg Position</span>
                  <span className="text-sm font-bold text-[#EF4444] font-mono mt-1">
                    {campaign?.gsc_avg_position ? `#${campaign.gsc_avg_position}` : '-'}
                  </span>
                </div>
              </div>

              {/* Audit progress bar */}
              <div className="space-y-1 bg-[#132035]/10 p-3 rounded border border-[#1E3352]/10">
                <div className="flex items-center justify-between text-[10px] font-semibold text-[#8BA3C7]">
                  <span>Site Technical Audit</span>
                  <span className="text-[#22C55E]">{auditResolved}/{auditIssues} resolved</span>
                </div>
                <div className="w-full bg-[#132035] h-1.5 rounded-full overflow-hidden border border-[#1E3352]/20 mt-1">
                  <div
                    className="bg-[#22C55E] h-full rounded-full transition-all duration-300"
                    style={{ width: `${auditProgressPct}%` }}
                  />
                </div>
              </div>

              {/* Card Footer: Integration and Last synced details */}
              <div className="flex items-center justify-between text-[10px] font-semibold text-[#8BA3C7] pt-1">
                {/* Integration states */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-0.5">
                    <span>GSC</span>
                    {gscConnected ? (
                      <span className="text-[#22C55E]">✅</span>
                    ) : (
                      <span className="text-[#4A6480]" title="Not Connected">⚠</span>
                    )}
                  </div>
                  <span className="text-[#1E3352]/50">|</span>
                  <div className="flex items-center gap-0.5">
                    <span>GA4</span>
                    {ga4Connected ? (
                      <span className="text-[#22C55E]">✅</span>
                    ) : (
                      <span className="text-[#4A6480]" title="Not Connected">⚠</span>
                    )}
                  </div>
                </div>

                <div className="text-[10px] text-[#4A6480] font-mono">
                  Last synced: {formatHoursAgo(lastSynced)}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ━━━ KEYWORD RANKINGS TABLE ━━━ */}
      <div className="bg-[#0D1829] border border-[#1E3352] rounded-[10px] p-6 space-y-4">
        {/* Table Title and Filter bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#4A6480]">
            Keyword Tracking List ({selectedMonth})
          </h2>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Client Filter */}
            <select
              value={filterClientId}
              onChange={(e) => setFilterClientId(e.target.value)}
              className="h-9 bg-[#132035] border border-[#1E3352] rounded px-3 text-xs text-[#F0F4FF] focus:outline-none focus:border-[#1B4FD8] cursor-pointer min-w-[150px]"
            >
              <option value="all">All Clients</option>
              {initialClients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.is_agency_self ? '(My Agency)' : ''}
                </option>
              ))}
            </select>

            {/* Keyword Search */}
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search keywords..."
                className="h-9 bg-[#132035] border border-[#1E3352] rounded pl-9 pr-4 text-xs text-[#F0F4FF] placeholder-[#4A6480] focus:outline-none focus:border-[#1B4FD8] w-48 sm:w-60"
              />
              <Search className="absolute left-3 top-2.5 text-[#4A6480] h-3.5 w-3.5" />
            </div>
          </div>
        </div>

        {/* Data Table */}
        <DataTable
          columns={columns}
          data={sortedKeywords as unknown as Record<string, unknown>[]}
          rowActions={(row) => (
            <button
              onClick={() => handleDeleteKeyword(String(row.id))}
              className="flex items-center w-full text-xs text-[#EF4444] hover:bg-[#EF4444]/10 rounded px-2.5 py-1.5 font-medium transition-colors cursor-pointer gap-2"
            >
              <Trash2 size={13} />
              <span>Delete Keyword</span>
            </button>
          )}
          emptyState={{
            icon: Compass,
            title: 'No Keywords Tracked',
            description: `No keywords matching filters were found for ${selectedMonth}.`,
            actionLabel: 'Add Keyword',
            onAction: () => setAddKeywordOpen(true),
          }}
        />
      </div>

      {/* ━━━ DIALOG MODALS ━━━ */}
      <LogReportModal
        isOpen={logReportOpen}
        onClose={() => setLogReportOpen(false)}
        clients={sortedClients}
        monthYear={selectedMonth}
        onSuccess={() => router.refresh()}
      />

      <AddKeywordModal
        isOpen={addKeywordOpen}
        onClose={() => setAddKeywordOpen(false)}
        clients={sortedClients}
        monthYear={selectedMonth}
        onSuccess={() => router.refresh()}
      />
    </div>
  );
}
