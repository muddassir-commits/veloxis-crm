// components/ads/google-ads-dashboard.tsx
'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import {
  Plus,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Target,
  DollarSign,
  Percent,
  Link2,
  Trash2,
  Search,
  Filter,
  AlertCircle
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { StatCard } from '@/components/shared/stat-card';
import { StatusBadge } from '@/components/shared/status-badge';
import { Progress } from '@/components/ui/progress';
import { DataTable } from '@/components/shared/data-table';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Client, GoogleAdsCampaign, GoogleAdsNegativeKeyword, GoogleAdsConnection } from '@/types';

interface GoogleAdsDashboardProps {
  initialClients: Client[];
  initialCampaigns: GoogleAdsCampaign[];
  initialNegativeKeywords: GoogleAdsNegativeKeyword[];
  initialConnections: GoogleAdsConnection[];
  selectedMonth: string;
}


export function GoogleAdsDashboard({
  initialClients,
  initialCampaigns,
  initialNegativeKeywords,
  initialConnections,
  selectedMonth,
}: GoogleAdsDashboardProps) {
  const router = useRouter();
  const supabase = createClient();
  const [isPending, startTransition] = useTransition();

  // Modals state
  const [logReportOpen, setLogReportOpen] = useState(false);
  const [connectModalOpen, setConnectModalOpen] = useState(false);
  const [addNegKeywordOpen, setAddNegKeywordOpen] = useState(false);

  // Syncing loaders
  const [syncingAll, setSyncingAll] = useState(false);
  const [syncingClientId, setSyncingClientId] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  // Negative keyword filtering
  const [negSearch, setNegSearch] = useState('');
  const [negClientFilter, setNegClientFilter] = useState('all');

  // Forms state
  const [connectForm, setConnectForm] = useState({
    clientId: '',
    customerId: '',
  });

  const [logForm, setLogForm] = useState({
    client_id: '',
    campaign_name: '',
    type: 'search',
    budget_allocated: '',
    budget_spent: '',
    impressions: '',
    clicks: '',
    conversions: '',
    status: 'active',
    notes: '',
  });

  const [negForm, setNegForm] = useState({
    client_id: '',
    keyword: '',
    match_type: 'exact',
    campaign: '',
    reason: '',
  });

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
      router.push(`/dashboard/google-ads?month=${encodeURIComponent(newMonthStr)}`);
    });
  };

  // Sync All connected integrations
  const handleSyncAll = async () => {
    setSyncingAll(true);
    const toastId = toast.loading('Syncing all active Google Ads clients...');
    try {
      const res = await fetch('/api/integrations/sync-all', {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to sync Google Ads accounts');
      }
      toast.success('Sync complete!', { id: toastId });
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Sync failed';
      toast.error(msg, { id: toastId });
    } finally {
      setSyncingAll(false);
    }
  };

  // Sync single client Google Ads account
  const handleSyncClient = async (clientId: string) => {
    setSyncingClientId(clientId);
    const toastId = toast.loading('Syncing client campaigns from Google Ads API...');
    try {
      const res = await fetch(`/api/integrations/google-ads/sync/${clientId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ monthYear: selectedMonth }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Sync failed');
      }
      toast.success(`Synced ${data.synced} campaigns successfully!`, { id: toastId });
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Client sync failed';
      toast.error(msg, { id: toastId });
    } finally {
      setSyncingClientId(null);
    }
  };

  // Connect Google Ads account Form Submit
  const handleConnectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!connectForm.clientId || !connectForm.customerId.trim()) {
      toast.error('All fields are required.');
      return;
    }

    setConnecting(true);
    const toastId = toast.loading('Connecting Google Ads account...');
    try {
      const res = await fetch('/api/integrations/google-ads/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: connectForm.clientId,
          customerId: connectForm.customerId.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Connection failed');
      }

      toast.success(`Connected Google Ads customer ID!`, { id: toastId });
      setConnectModalOpen(false);
      setConnectForm({ clientId: '', customerId: '' });
      router.refresh();
      handleSyncClient(connectForm.clientId);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Connection failed';
      toast.error(msg, { id: toastId });
    } finally {
      setConnecting(false);
    }
  };

  // Log Campaign Form Submit
  const handleLogSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!logForm.client_id || !logForm.campaign_name.trim()) {
      toast.error('Client and Campaign Name are required.');
      return;
    }

    try {
      const budgetSpentVal = Number(logForm.budget_spent || 0);
      const conversionsVal = Number(logForm.conversions || 0);
      const clicksVal = Number(logForm.clicks || 0);
      const impressionsVal = Number(logForm.impressions || 0);

      // Calculations
      const ctrVal = impressionsVal > 0 ? Number(((clicksVal / impressionsVal) * 100).toFixed(2)) : 0;
      const cpcVal = clicksVal > 0 ? Number((budgetSpentVal / clicksVal).toFixed(2)) : 0;
      const costPerConvVal = conversionsVal > 0 ? Number((budgetSpentVal / conversionsVal).toFixed(2)) : 0;

      const { error } = await supabase.from('google_ads_campaigns').insert({
        client_id: logForm.client_id,
        campaign_name: logForm.campaign_name,
        month_year: selectedMonth,
        type: logForm.type || 'search',
        budget_allocated: Number(logForm.budget_allocated || 0),
        budget_spent: budgetSpentVal,
        impressions: impressionsVal,
        clicks: clicksVal,
        conversions: conversionsVal,
        ctr: ctrVal,
        avg_cpc: cpcVal,
        cost_per_conv: costPerConvVal,
        status: logForm.status,
        notes: logForm.notes || null,
        data_synced_at: new Date().toISOString(),
      });

      if (error) throw error;

      toast.success('Google Ads campaign report logged.');
      setLogReportOpen(false);
      setLogForm({
        client_id: '',
        campaign_name: '',
        type: 'search',
        budget_allocated: '',
        budget_spent: '',
        impressions: '',
        clicks: '',
        conversions: '',
        status: 'active',
        notes: '',
      });
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to log campaign';
      toast.error(msg);
    }
  };

  // Add Negative Keyword Form Submit
  const handleAddNegKeywordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!negForm.client_id || !negForm.keyword.trim()) {
      toast.error('Client and keyword are required.');
      return;
    }

    try {
      const { error } = await supabase.from('google_ads_negative_keywords').insert({
        client_id: negForm.client_id,
        keyword: negForm.keyword.trim(),
        match_type: negForm.match_type,
        campaign: negForm.campaign.trim() || null,
        reason: negForm.reason.trim() || null,
      });

      if (error) throw error;

      toast.success('Negative keyword added.');
      setAddNegKeywordOpen(false);
      setNegForm({
        client_id: '',
        keyword: '',
        match_type: 'exact',
        campaign: '',
        reason: '',
      });
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to add negative keyword';
      toast.error(msg);
    }
  };

  // Delete Negative Keyword
  const handleDeleteNegKeyword = async (id: string) => {
    const ok = window.confirm('Are you sure you want to delete this negative keyword?');
    if (!ok) return;

    try {
      const { error } = await supabase.from('google_ads_negative_keywords').delete().eq('id', id);
      if (error) throw error;
      toast.success('Negative keyword deleted.');
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete';
      toast.error(msg);
    }
  };

  // Calculations for global KPIs
  const totalSpend = initialCampaigns.reduce((sum, c) => sum + Number(c.budget_spent || 0), 0);
  const totalConversions = initialCampaigns.reduce((sum, c) => sum + Number(c.conversions || 0), 0);
  const cplGlobal = totalConversions > 0 ? Math.round(totalSpend / totalConversions) : 0;
  const totalImpressions = initialCampaigns.reduce((sum, c) => sum + Number(c.impressions || 0), 0);
  const totalClicks = initialCampaigns.reduce((sum, c) => sum + Number(c.clicks || 0), 0);
  const ctrGlobal = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;

  // Sorting clients
  const sortedClients = [...initialClients].sort((a, b) => {
    if (a.is_agency_self && !b.is_agency_self) return -1;
    if (!a.is_agency_self && b.is_agency_self) return 1;
    return a.name.localeCompare(b.name);
  });

  // Filter Negative Keywords
  const filteredNegKeywords = initialNegativeKeywords.filter((k) => {
    const matchesSearch = k.keyword.toLowerCase().includes(negSearch.toLowerCase()) ||
      (k.campaign && k.campaign.toLowerCase().includes(negSearch.toLowerCase()));
    const matchesClient = negClientFilter === 'all' || k.client_id === negClientFilter;
    return matchesSearch && matchesClient;
  });

  // Negative Keywords DataTable Columns
  const negativeKeywordColumns = [
    {
      key: 'keyword',
      header: 'Keyword',
      render: (_value: unknown, row: Record<string, unknown>) => {
        const r = row as unknown as GoogleAdsNegativeKeyword;
        return (
          <span className="font-mono text-[#F0F4FF] font-semibold">{r.keyword}</span>
        );
      },
    },
    {
      key: 'client',
      header: 'Client',
      render: (_value: unknown, row: Record<string, unknown>) => {
        const r = row as unknown as GoogleAdsNegativeKeyword;
        const client = initialClients.find((c) => c.id === r.client_id);
        return <span>{client ? client.name : 'Unknown'}</span>;
      },
    },
    {
      key: 'match_type',
      header: 'Match Type',
      render: (_value: unknown, row: Record<string, unknown>) => {
        const r = row as unknown as GoogleAdsNegativeKeyword;
        return (
          <span className="capitalize text-xs font-semibold px-2 py-0.5 rounded bg-[#132035] border border-[#1E3352] text-[#8BA3C7]">
            {r.match_type || 'exact'}
          </span>
        );
      },
    },
    {
      key: 'campaign',
      header: 'Campaign Scope',
      render: (_value: unknown, row: Record<string, unknown>) => {
        const r = row as unknown as GoogleAdsNegativeKeyword;
        return (
          <span className="text-xs text-[#8BA3C7] font-mono">{r.campaign || 'All Campaigns'}</span>
        );
      },
    },
    {
      key: 'date_added',
      header: 'Date Added',
      render: (_value: unknown, row: Record<string, unknown>) => {
        const r = row as unknown as GoogleAdsNegativeKeyword;
        return <span>{formatDate(r.date_added)}</span>;
      },
    },
    {
      key: 'reason',
      header: 'Reason',
      render: (_value: unknown, row: Record<string, unknown>) => {
        const r = row as unknown as GoogleAdsNegativeKeyword;
        return (
          <span className="text-xs text-[#8BA3C7] line-clamp-1 max-w-[200px]" title={r.reason || ''}>
            {r.reason || '—'}
          </span>
        );
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (_value: unknown, row: Record<string, unknown>) => {
        const r = row as unknown as GoogleAdsNegativeKeyword;
        return (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleDeleteNegKeyword(r.id)}
            className="text-[#EF4444] hover:text-[#FF6B6B] hover:bg-[#EF444415] h-7 w-7 p-0 cursor-pointer"
          >
            <Trash2 size={12} />
          </Button>
        );
      },
    },
  ];

  return (
    <div className="space-y-8 page-enter">
      {/* Dashboard Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 select-none">
        {/* Month Navigator */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => handleMonthChange(-1)}
            disabled={isPending}
            className="p-1 rounded bg-[#132035] border border-[#1E3352] text-[#8BA3C7] hover:text-[#F0F4FF] disabled:opacity-50 cursor-pointer"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-semibold text-[#F0F4FF] min-w-[100px] text-center font-mono">
            {selectedMonth}
          </span>
          <button
            onClick={() => handleMonthChange(1)}
            disabled={isPending}
            className="p-1 rounded bg-[#132035] border border-[#1E3352] text-[#8BA3C7] hover:text-[#F0F4FF] disabled:opacity-50 cursor-pointer"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Action Triggers */}
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setConnectModalOpen(true)}
            variant="outline"
            className="border-[#1E3352] text-[#8BA3C7] hover:text-[#F0F4FF] hover:bg-[#132035] text-xs h-9 cursor-pointer"
          >
            <Link2 size={14} className="mr-1.5" />
            <span>Connect ID</span>
          </Button>

          <Button
            onClick={() => setLogReportOpen(true)}
            className="bg-[#1B4FD8] hover:bg-[#2563EB] text-white text-xs h-9 gap-1.5 cursor-pointer font-semibold"
          >
            <Plus size={14} />
            <span>Log Campaign</span>
          </Button>

          <Button
            onClick={handleSyncAll}
            disabled={syncingAll}
            className="bg-[#132035] hover:bg-[#1A2D47] border border-[#1E3352] text-[#8BA3C7] hover:text-[#F0F4FF] text-xs h-9 gap-1.5 cursor-pointer"
          >
            <RefreshCw size={14} className={syncingAll ? 'animate-spin' : ''} />
            <span>Sync All</span>
          </Button>
        </div>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Cost Per Conv. (Google)"
          value={formatCurrency(cplGlobal)}
          valueClassName="text-[#EF4444] font-mono"
          icon={TrendingUp}
          loading={isPending}
        />
        <StatCard
          title="Total Google Spend"
          value={formatCurrency(totalSpend)}
          valueClassName="text-[#F97316] font-mono"
          icon={DollarSign}
          loading={isPending}
        />
        <StatCard
          title="Conversions"
          value={totalConversions.toLocaleString()}
          icon={Target}
          loading={isPending}
        />
        <StatCard
          title="Average CTR"
          value={`${ctrGlobal.toFixed(2)}%`}
          icon={Percent}
          loading={isPending}
        />
      </div>

      {/* Client List Section */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-[#4A6480] select-none">
          Client Ad Accounts ({sortedClients.length})
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {sortedClients.map((client) => {
            // Find Campaigns for client
            const clientCampaigns = initialCampaigns.filter((c) => c.client_id === client.id);
            const connection = initialConnections.find((conn) => conn.client_id === client.id);

            const clientSpend = clientCampaigns.reduce((sum, c) => sum + Number(c.budget_spent || 0), 0);
            const clientAllocated = clientCampaigns.reduce((sum, c) => sum + Number(c.budget_allocated || 0), 0);
            const clientConvs = clientCampaigns.reduce((sum, c) => sum + Number(c.conversions || 0), 0);
            const clientCpl = clientConvs > 0 ? Math.round(clientSpend / clientConvs) : 0;
            const clientImpressions = clientCampaigns.reduce((sum, c) => sum + Number(c.impressions || 0), 0);
            const clientClicks = clientCampaigns.reduce((sum, c) => sum + Number(c.clicks || 0), 0);
            const clientCtr = clientImpressions > 0 ? (clientClicks / clientImpressions) * 100 : 0;

            const progressPct = clientAllocated > 0 ? Math.min((clientSpend / clientAllocated) * 100, 100) : 0;

            return (
              <div
                key={client.id}
                className="bg-[#0D1829] border border-[#1E3352] rounded-[10px] p-5 space-y-4 hover:border-[#1A2D47] transition-all flex flex-col justify-between"
              >
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-[#F0F4FF]">{client.name}</span>
                      {client.is_agency_self && (
                        <span className="badge badge-orange py-0.5 px-2 text-[9px] rounded-full uppercase font-bold">
                          My Agency
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-[#8BA3C7]">{client.company || 'No Company'}</span>
                  </div>

                  {connection ? (
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-[#22C55E] bg-[#22C55E15] px-2 py-0.5 rounded-full font-medium">
                        API Connected
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleSyncClient(client.id)}
                        disabled={syncingClientId === client.id}
                        className="h-7 w-7 p-0 hover:bg-[#132035] cursor-pointer"
                      >
                        <RefreshCw
                          size={12}
                          className={`${syncingClientId === client.id ? 'animate-spin' : ''}`}
                        />
                      </Button>
                    </div>
                  ) : (
                    <span className="text-[10px] text-[#4A6480] bg-[#132035] px-2 py-0.5 rounded-full font-medium">
                      Not Connected
                    </span>
                  )}
                </div>

                {/* Sub KPI Stats Grid */}
                <div className="grid grid-cols-4 gap-2 pt-2 border-t border-[#1E3352]/40">
                  <div>
                    <span className="text-[9px] text-[#4A6480] uppercase tracking-wider block">Spend</span>
                    <span className="font-semibold text-xs text-[#F97316] font-mono">{formatCurrency(clientSpend)}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-[#4A6480] uppercase tracking-wider block">Convs</span>
                    <span className="font-semibold text-xs text-[#F0F4FF] font-mono">{clientConvs}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-[#4A6480] uppercase tracking-wider block">Cost/Conv</span>
                    <span className="font-semibold text-xs text-[#EF4444] font-mono">{formatCurrency(clientCpl)}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-[#4A6480] uppercase tracking-wider block">CTR</span>
                    <span className="font-semibold text-xs text-[#8BA3C7] font-mono">{clientCtr.toFixed(2)}%</span>
                  </div>
                </div>

                {/* Campaign Progress details */}
                <div className="space-y-1.5 select-none pt-2 border-t border-[#1E3352]/40">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-[#8BA3C7]">Monthly Budget consumption</span>
                    <span className="font-semibold text-[#F0F4FF] font-mono">
                      {formatCurrency(clientSpend)} / {formatCurrency(clientAllocated)} ({progressPct.toFixed(0)}%)
                    </span>
                  </div>
                  <Progress value={progressPct} className="h-1.5 bg-[#060D1A]" />
                </div>

                {/* Campaigns List or Empty details */}
                <div className="pt-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#4A6480] mb-2 block">
                    Campaigns Logged ({clientCampaigns.length})
                  </span>
                  {clientCampaigns.length > 0 ? (
                    <div className="space-y-1.5 max-h-[120px] overflow-y-auto pr-1">
                      {clientCampaigns.map((c) => (
                        <div
                          key={c.id}
                          className="flex items-center justify-between text-xs p-2 rounded bg-[#060D1A] border border-[#1E3352]/60"
                        >
                          <span className="text-[#F0F4FF] font-medium truncate max-w-[150px]">{c.campaign_name}</span>
                          <div className="flex items-center gap-2 font-mono">
                            <span className="text-[#F97316]">{formatCurrency(c.budget_spent || 0)}</span>
                            <span className="text-[#8BA3C7] text-[10px]">({c.conversions} C)</span>
                            <StatusBadge status={c.status} />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 border border-dashed border-[#1E3352]/60 rounded text-[#4A6480] text-xs">
                      No campaigns logged for {selectedMonth}.
                    </div>
                  )}
                </div>

                {/* Account Details footer */}
                {connection && (
                  <div className="flex items-center gap-1.5 text-[9px] text-[#8BA3C7] pt-2 border-t border-[#1E3352]/40 font-mono">
                    <AlertCircle size={10} className="text-[#4A6480]" />
                    <span>Customer ID: {connection.customer_id}</span>
                    {connection.last_sync && (
                      <span className="text-[#4A6480] ml-auto">
                        Synced: {new Date(connection.last_sync).toLocaleTimeString()}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Negative Keywords Section */}
      <div className="bg-[#0D1829] border border-[#1E3352] rounded-[10px] p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 select-none">
          <div>
            <h3 className="text-base font-semibold text-[#F0F4FF]">Negative Keywords Manager</h3>
            <p className="text-xs text-[#8BA3C7]">Exclude queries that trigger irrelevant search queries.</p>
          </div>
          <Button
            onClick={() => setAddNegKeywordOpen(true)}
            className="bg-[#1B4FD8] hover:bg-[#2563EB] text-white text-xs h-9 gap-1.5 cursor-pointer font-semibold"
          >
            <Plus size={14} />
            <span>Add Negative Keyword</span>
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 select-none">
          {/* Search bar */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#4A6480]" />
            <input
              type="text"
              placeholder="Search negative keywords..."
              value={negSearch}
              onChange={(e) => setNegSearch(e.target.value)}
              className="input pl-9 h-9"
            />
          </div>

          {/* Client Filter */}
          <div className="flex items-center gap-1.5 bg-[#132035] border border-[#1E3352] px-3 py-1.5 rounded-[7px] text-xs">
            <Filter size={12} className="text-[#8BA3C7]" />
            <span className="text-[#8BA3C7] mr-1">Client:</span>
            <select
              value={negClientFilter}
              onChange={(e) => setNegClientFilter(e.target.value)}
              className="bg-transparent text-[#F0F4FF] outline-none font-semibold border-none cursor-pointer p-0"
            >
              <option value="all">All Clients</option>
              {initialClients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Data Table */}
        <DataTable
          columns={negativeKeywordColumns}
          data={filteredNegKeywords as unknown as Record<string, unknown>[]}
          loading={isPending}
          emptyState={{
            title: "No negative keywords found",
            description: "No negative keywords matching the selected filters were found."
          }}
        />
      </div>

      {/* ── MODAL: CONNECT GOOGLE CUSTOMER ID ── */}
      <Dialog open={connectModalOpen} onOpenChange={setConnectModalOpen}>
        <DialogContent className="bg-[#0D1829] border border-[#1E3352] text-[#F0F4FF] max-w-sm select-none">
          <form onSubmit={handleConnectSubmit}>
            <DialogHeader>
              <DialogTitle className="text-base font-semibold text-[#F0F4FF]">Connect Google Ads account</DialogTitle>
              <DialogDescription className="text-xs text-[#8BA3C7]">
                Provide client&apos;s Google Ads Customer ID (format: XXXXXXXXXX).
              </DialogDescription>
            </DialogHeader>


            <div className="space-y-3 my-4 text-xs">
              <div className="space-y-1">
                <label className="label">Select Client *</label>
                <select
                  value={connectForm.clientId}
                  onChange={(e) => setConnectForm((p) => ({ ...p, clientId: e.target.value }))}
                  className="input h-9"
                  required
                >
                  <option value="">-- Choose Client --</option>
                  {initialClients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="label">Customer ID *</label>
                <input
                  type="text"
                  placeholder="e.g. 1234567890"
                  value={connectForm.customerId}
                  onChange={(e) => setConnectForm((p) => ({ ...p, customerId: e.target.value }))}
                  className="input h-9 font-mono"
                  required
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setConnectModalOpen(false)}
                className="bg-transparent border-[#1E3352] text-[#8BA3C7] hover:bg-[#132035] hover:text-[#F0F4FF] cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={connecting}
                className="bg-[#1B4FD8] hover:bg-[#2563EB] text-white cursor-pointer"
              >
                {connecting ? 'Verifying...' : 'Connect Account'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── MODAL: LOG CAMPAIGN MANUALLY ── */}
      <Dialog open={logReportOpen} onOpenChange={setLogReportOpen}>
        <DialogContent className="bg-[#0D1829] border border-[#1E3352] text-[#F0F4FF] max-w-md select-none max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleLogSubmit}>
            <DialogHeader>
              <DialogTitle className="text-base font-semibold text-[#F0F4FF]">Log Google Ads Campaign</DialogTitle>
              <DialogDescription className="text-xs text-[#8BA3C7]">
                Manually log campaign metrics for {selectedMonth}.
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-4 my-3 text-xs">
              <div className="col-span-2 space-y-1">
                <label className="label">Client *</label>
                <select
                  value={logForm.client_id}
                  onChange={(e) => setLogForm((p) => ({ ...p, client_id: e.target.value }))}
                  className="input h-9"
                  required
                >
                  <option value="">-- Choose Client --</option>
                  {initialClients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="label">Campaign Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Kanpur SEO Keywords Search"
                  value={logForm.campaign_name}
                  onChange={(e) => setLogForm((p) => ({ ...p, campaign_name: e.target.value }))}
                  className="input h-9"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="label">Campaign Type</label>
                <select
                  value={logForm.type}
                  onChange={(e) => setLogForm((p) => ({ ...p, type: e.target.value }))}
                  className="input h-9"
                >
                  <option value="search">Search</option>
                  <option value="display">Display</option>
                  <option value="pmax">Performance Max</option>
                  <option value="shopping">Shopping</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="label">Allocated Budget (₹)</label>
                <input
                  type="number"
                  placeholder="e.g. 30000"
                  value={logForm.budget_allocated}
                  onChange={(e) => setLogForm((p) => ({ ...p, budget_allocated: e.target.value }))}
                  className="input h-9"
                />
              </div>

              <div className="space-y-1">
                <label className="label">Spent Budget (₹)</label>
                <input
                  type="number"
                  placeholder="e.g. 24500"
                  value={logForm.budget_spent}
                  onChange={(e) => setLogForm((p) => ({ ...p, budget_spent: e.target.value }))}
                  className="input h-9"
                />
              </div>

              <div className="space-y-1">
                <label className="label">Impressions</label>
                <input
                  type="number"
                  placeholder="e.g. 80000"
                  value={logForm.impressions}
                  onChange={(e) => setLogForm((p) => ({ ...p, impressions: e.target.value }))}
                  className="input h-9"
                />
              </div>

              <div className="space-y-1">
                <label className="label">Clicks</label>
                <input
                  type="number"
                  placeholder="e.g. 2500"
                  value={logForm.clicks}
                  onChange={(e) => setLogForm((p) => ({ ...p, clicks: e.target.value }))}
                  className="input h-9"
                />
              </div>

              <div className="col-span-2 space-y-1">
                <label className="label">Conversions Generated</label>
                <input
                  type="number"
                  placeholder="e.g. 120"
                  value={logForm.conversions}
                  onChange={(e) => setLogForm((p) => ({ ...p, conversions: e.target.value }))}
                  className="input h-9"
                />
              </div>

              <div className="col-span-2 space-y-1">
                <label className="label">Status</label>
                <select
                  value={logForm.status}
                  onChange={(e) => setLogForm((p) => ({ ...p, status: e.target.value }))}
                  className="input h-9"
                >
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              <div className="col-span-2 space-y-1">
                <label className="label">Ad Strategy Notes</label>
                <textarea
                  placeholder="Log specific search groups, keywords targeted..."
                  value={logForm.notes}
                  onChange={(e) => setLogForm((p) => ({ ...p, notes: e.target.value }))}
                  rows={2}
                  className="input resize-none"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setLogReportOpen(false)}
                className="bg-transparent border-[#1E3352] text-[#8BA3C7] hover:bg-[#132035] hover:text-[#F0F4FF] cursor-pointer"
              >
                Cancel
              </Button>
              <Button type="submit" className="bg-[#1B4FD8] hover:bg-[#2563EB] text-white cursor-pointer">
                Log Campaign
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── MODAL: ADD NEGATIVE KEYWORD ── */}
      <Dialog open={addNegKeywordOpen} onOpenChange={setAddNegKeywordOpen}>
        <DialogContent className="bg-[#0D1829] border border-[#1E3352] text-[#F0F4FF] max-w-sm select-none">
          <form onSubmit={handleAddNegKeywordSubmit}>
            <DialogHeader>
              <DialogTitle className="text-base font-semibold text-[#F0F4FF]">Add Negative Keyword</DialogTitle>
              <DialogDescription className="text-xs text-[#8BA3C7]">
                Add queries that you want to exclude from triggering client ads.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 my-4 text-xs">
              <div className="space-y-1">
                <label className="label">Client *</label>
                <select
                  value={negForm.client_id}
                  onChange={(e) => setNegForm((p) => ({ ...p, client_id: e.target.value }))}
                  className="input h-9"
                  required
                >
                  <option value="">-- Choose Client --</option>
                  {initialClients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="label">Negative Keyword *</label>
                <input
                  type="text"
                  placeholder="e.g. cheap services"
                  value={negForm.keyword}
                  onChange={(e) => setNegForm((p) => ({ ...p, keyword: e.target.value }))}
                  className="input h-9 font-mono"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="label">Match Type</label>
                <select
                  value={negForm.match_type}
                  onChange={(e) => setNegForm((p) => ({ ...p, match_type: e.target.value }))}
                  className="input h-9"
                >
                  <option value="exact">Exact Match</option>
                  <option value="phrase">Phrase Match</option>
                  <option value="broad">Broad Match</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="label">Campaign Scope (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Search - Brand Keywords"
                  value={negForm.campaign}
                  onChange={(e) => setNegForm((p) => ({ ...p, campaign: e.target.value }))}
                  className="input h-9"
                />
              </div>

              <div className="space-y-1">
                <label className="label">Reason / Observation (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Irrelevant budget clicks"
                  value={negForm.reason}
                  onChange={(e) => setNegForm((p) => ({ ...p, reason: e.target.value }))}
                  className="input h-9"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setAddNegKeywordOpen(false)}
                className="bg-transparent border-[#1E3352] text-[#8BA3C7] hover:bg-[#132035] hover:text-[#F0F4FF] cursor-pointer"
              >
                Cancel
              </Button>
              <Button type="submit" className="bg-[#1B4FD8] hover:bg-[#2563EB] text-white cursor-pointer">
                Add Keyword
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
