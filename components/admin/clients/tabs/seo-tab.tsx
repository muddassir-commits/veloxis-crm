'use client';

import React, { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Client, SeoCampaign, SeoKeyword } from '@/types';
import { toast } from 'sonner';
import { getMonthYear, formatDate } from '@/lib/utils';
import {
  Plus,
  Compass,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  BarChart2,
  TrendingUp,
  Award,
  ChevronDown,
  ChevronUp,
  Link2,
  Link2Off,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/shared/data-table';
import { StatCard } from '@/components/shared/stat-card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';

interface SeoTabProps {
  client: Client;
}

interface ConnectionStatus {
  gsc: { connected: boolean; propertyUrl?: string; lastSync?: string } | null;
  ga4: { connected: boolean; propertyId?: string; lastSync?: string } | null;
}

function SeoTabContent({ client }: SeoTabProps) {
  const supabase = createClient();
  const searchParams = useSearchParams();

  const [seoCampaign, setSeoCampaign] = useState<SeoCampaign | null>(null);
  const [keywords, setKeywords] = useState<SeoKeyword[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Collapsible Integrations Panel
  const [integrationsOpen, setIntegrationsOpen] = useState(false);
  const [integrationStatus, setIntegrationStatus] = useState<ConnectionStatus>({ gsc: null, ga4: null });
  const [syncingService, setSyncingService] = useState<string | null>(null);
  const [disconnectingService, setDisconnectingService] = useState<string | null>(null);
  const [ga4PropertyModalOpen, setGa4PropertyModalOpen] = useState(false);
  const [ga4PropertyId, setGa4PropertyId] = useState('');
  const [connecting, setConnecting] = useState(false);

  // Month-Year state (defaults to current month)
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const monthYearString = getMonthYear(currentDate);

  // Modals state
  const [logReportOpen, setLogReportOpen] = useState(false);
  const [addKeywordOpen, setAddKeywordOpen] = useState(false);

  // Form states (contains all seo_campaigns fields)
  const [reportForm, setReportForm] = useState({
    organic_traffic: '',
    organic_traffic_prev: '',
    keywords_tracked: '',
    keywords_top3: '',
    keywords_top10: '',
    keywords_top20: '',
    backlinks_built: '',
    domain_authority: '',
    audit_issues_found: '',
    audit_issues_resolved: '',
    pages_optimized: '',
    gsc_clicks: '',
    gsc_impressions: '',
    gsc_ctr: '',
    gsc_avg_position: '',
    ga4_sessions: '',
    ga4_new_users: '',
    ga4_conversions: '',
    gbp_views: '',
    gbp_calls: '',
    gbp_directions: '',
    gbp_website_clicks: '',
    notes: '',
  });

  const [keywordForm, setKeywordForm] = useState({
    keyword: '',
    target_url: '',
    current_position: '',
    previous_position: '',
    best_position: '',
    search_volume: '',
    keyword_difficulty: '',
    intent: 'informational',
    notes: '',
  });

  const fetchSeoData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Fetch SEO Campaign metrics for client and month
      const { data: campaignData, error: campaignError } = await supabase
        .from('seo_campaigns')
        .select('*')
        .eq('client_id', client.id)
        .eq('month_year', monthYearString)
        .maybeSingle();

      if (campaignError) throw campaignError;
      setSeoCampaign(campaignData || null);

      // Fetch Keywords
      const { data: keywordData, error: keywordError } = await supabase
        .from('seo_keywords')
        .select('*')
        .eq('client_id', client.id)
        .eq('month_year', monthYearString)
        .order('current_position', { ascending: true });

      if (keywordError) throw keywordError;
      setKeywords(keywordData || []);
    } catch {
      toast.error('Failed to load SEO data.');
    } finally {
      setIsLoading(false);
    }
  }, [client.id, monthYearString, supabase]);

  const fetchIntegrationStatus = useCallback(async () => {
    try {
      const [gscRes, ga4Res] = await Promise.all([
        supabase.from('gsc_connections').select('*').eq('client_id', client.id).maybeSingle(),
        supabase.from('ga4_connections').select('*').eq('client_id', client.id).maybeSingle(),
      ]);
      setIntegrationStatus({
        gsc: gscRes.data
          ? { connected: gscRes.data.is_active, propertyUrl: gscRes.data.property_url, lastSync: gscRes.data.last_sync }
          : { connected: false },
        ga4: ga4Res.data
          ? { connected: ga4Res.data.is_active, propertyId: ga4Res.data.property_id, lastSync: ga4Res.data.last_sync }
          : { connected: false },
      });
    } catch {
      console.error('Failed to load integrations status.');
    }
  }, [client.id, supabase]);

  const handleSync = useCallback(async (service: 'gsc' | 'ga4') => {
    setSyncingService(service);
    try {
      const endpoint = service === 'ga4' 
        ? `/api/integrations/ga4/sync/${client.id}` 
        : `/api/integrations/gsc/sync/${client.id}`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      toast.success(`${service.toUpperCase()} data synced successfully!`);
      fetchIntegrationStatus();
      fetchSeoData();
    } catch (err) {
      toast.error(`Sync failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setSyncingService(null);
    }
  }, [client.id, fetchIntegrationStatus, fetchSeoData]);

  // Google OAuth Connections logic
  const handleConnectGoogle = (service: 'gsc' | 'ga4') => {
    window.location.href = `/api/integrations/gsc/auth?client_id=${client.id}&service=${service}`;
  };

  const handleSaveGa4Property = async () => {
    if (!ga4PropertyId.trim()) {
      toast.error('Please enter a GA4 Property ID.');
      return;
    }
    setConnecting(true);
    try {
      const res = await fetch('/api/integrations/ga4', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: client.id, propertyId: ga4PropertyId.trim() }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      toast.success('GA4 Property ID saved. Syncing data...');
      setGa4PropertyModalOpen(false);
      setGa4PropertyId('');
      fetchIntegrationStatus();
      handleSync('ga4');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save GA4 Property');
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async (service: 'gsc' | 'ga4') => {
    setDisconnectingService(service);
    try {
      const table = service === 'gsc' ? 'gsc_connections' : 'ga4_connections';
      const { error } = await supabase
        .from(table)
        .update({ is_active: false })
        .eq('client_id', client.id);
      if (error) throw error;
      toast.success(`${service.toUpperCase()} disconnected.`);
      fetchIntegrationStatus();
    } catch {
      toast.error('Failed to disconnect.');
    } finally {
      setDisconnectingService(null);
    }
  };

  // Run initial data queries inside non-blocking timeout
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSeoData();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchSeoData]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchIntegrationStatus();

      const oauthSuccess = searchParams.get('oauth_success');
      const oauthError = searchParams.get('oauth_error');
      if (oauthSuccess) {
        if (oauthSuccess === 'gsc') {
          toast.success('GSC connected! Syncing...');
          handleSync('gsc');
        } else if (oauthSuccess === 'ga4') {
          toast.success('Google Analytics connected! Enter GA4 Property ID.');
          setGa4PropertyModalOpen(true);
        }
      }
      if (oauthError) {
        toast.error(`OAuth error: ${decodeURIComponent(oauthError)}`);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [searchParams, fetchIntegrationStatus, handleSync]);

  useEffect(() => {
    const campaignsChannel = supabase
      .channel(`seo-campaigns-${client.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'seo_campaigns',
          filter: `client_id=eq.${client.id}`,
        },
        (payload) => {
          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            toast.success('Live Analytics Update: Organic search metrics synchronized in real time!', {
              description: 'The charts and stat cards have been refreshed dynamically.'
            });
          }
          fetchSeoData();
        }
      )
      .subscribe();

    const keywordsChannel = supabase
      .channel(`seo-keywords-${client.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'seo_keywords',
          filter: `client_id=eq.${client.id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            toast.success('Live Keyword Tracker: New organic search rank queries discovered in real time!');
          }
          fetchSeoData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(campaignsChannel);
      supabase.removeChannel(keywordsChannel);
    };
  }, [client.id, supabase, fetchSeoData]);

  const handlePrevMonth = () => {
    setCurrentDate((prev) => {
      const copy = new Date(prev);
      copy.setMonth(copy.getMonth() - 1);
      return copy;
    });
  };

  const handleNextMonth = () => {
    setCurrentDate((prev) => {
      const copy = new Date(prev);
      copy.setMonth(copy.getMonth() + 1);
      return copy;
    });
  };

  // Submit Handler: Log SEO Monthly Report
  const handleLogReport = async () => {
    try {
      const payload = {
        client_id: client.id,
        month_year: monthYearString,
        organic_traffic: Number(reportForm.organic_traffic || 0),
        organic_traffic_prev: Number(reportForm.organic_traffic_prev || 0),
        keywords_tracked: Number(reportForm.keywords_tracked || 0),
        keywords_top3: Number(reportForm.keywords_top3 || 0),
        keywords_top10: Number(reportForm.keywords_top10 || 0),
        keywords_top20: Number(reportForm.keywords_top20 || 0),
        backlinks_built: Number(reportForm.backlinks_built || 0),
        domain_authority: reportForm.domain_authority ? Number(reportForm.domain_authority) : null,
        audit_issues_found: Number(reportForm.audit_issues_found || 0),
        audit_issues_resolved: Number(reportForm.audit_issues_resolved || 0),
        pages_optimized: Number(reportForm.pages_optimized || 0),
        gsc_clicks: Number(reportForm.gsc_clicks || 0),
        gsc_impressions: Number(reportForm.gsc_impressions || 0),
        gsc_ctr: reportForm.gsc_ctr ? Number(reportForm.gsc_ctr) : null,
        gsc_avg_position: reportForm.gsc_avg_position ? Number(reportForm.gsc_avg_position) : null,
        ga4_sessions: Number(reportForm.ga4_sessions || 0),
        ga4_new_users: Number(reportForm.ga4_new_users || 0),
        ga4_conversions: Number(reportForm.ga4_conversions || 0),
        gbp_views: Number(reportForm.gbp_views || 0),
        gbp_calls: Number(reportForm.gbp_calls || 0),
        gbp_directions: Number(reportForm.gbp_directions || 0),
        gbp_website_clicks: Number(reportForm.gbp_website_clicks || 0),
        notes: reportForm.notes || null,
        data_synced_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('seo_campaigns')
        .upsert(payload, { onConflict: 'client_id, month_year' });

      if (error) throw error;

      toast.success('SEO monthly report saved.');
      setLogReportOpen(false);
      fetchSeoData();
    } catch {
      toast.error('Failed to log SEO report.');
    }
  };

  // Submit Handler: Add Keyword
  const handleAddKeyword = async () => {
    if (!keywordForm.keyword.trim()) {
      toast.error('Keyword string is required.');
      return;
    }

    try {
      const payload = {
        client_id: client.id,
        keyword: keywordForm.keyword,
        target_url: keywordForm.target_url || null,
        current_position: keywordForm.current_position ? Number(keywordForm.current_position) : null,
        previous_position: keywordForm.previous_position ? Number(keywordForm.previous_position) : null,
        best_position: keywordForm.best_position ? Number(keywordForm.best_position) : null,
        search_volume: keywordForm.search_volume ? Number(keywordForm.search_volume) : null,
        keyword_difficulty: keywordForm.keyword_difficulty ? Number(keywordForm.keyword_difficulty) : null,
        intent: keywordForm.intent,
        month_year: monthYearString,
        notes: keywordForm.notes || null,
        source: 'manual',
      };

      const { error } = await supabase.from('seo_keywords').insert(payload);
      if (error) throw error;

      toast.success('Keyword added to tracking list.');
      setAddKeywordOpen(false);
      setKeywordForm({
        keyword: '',
        target_url: '',
        current_position: '',
        previous_position: '',
        best_position: '',
        search_volume: '',
        keyword_difficulty: '',
        intent: 'informational',
        notes: '',
      });
      fetchSeoData();
    } catch {
      toast.error('Failed to add keyword.');
    }
  };

  // Columns for Keyword DataTable
  const columns = [
    {
      key: 'keyword',
      header: 'Keyword Target',
      width: '35%',
      render: (val: unknown, row: Record<string, unknown>) => (
        <div className="flex flex-col gap-0.5">
          <span className="font-semibold text-xs text-[#F0F4FF]">{String(val)}</span>
          {Boolean(row.target_url) && (
            <a
              href={String(row.target_url).startsWith('http') ? String(row.target_url) : `https://${String(row.target_url)}`}
              target="_blank"
              rel="noreferrer"
              className="text-[9px] text-[#4D90FE] hover:underline truncate max-w-[200px]"
            >
              {String(row.target_url)}
            </a>
          )}
        </div>
      ),
    },
    {
      key: 'current_position',
      header: 'Rank Position',
      width: '12%',
      render: (val: unknown) => {
        const pos = Number(val);
        if (val === null || isNaN(pos)) return <span className="text-[#4A6480] font-mono">-</span>;

        let colorClass = 'text-[#EF4444]'; // > 20
        if (pos <= 3) colorClass = 'text-[#22C55E] font-bold';
        else if (pos <= 10) colorClass = 'text-[#1B4FD8] font-bold';
        else if (pos <= 20) colorClass = 'text-[#F59E0B]';

        return <span className={`font-mono text-xs ${colorClass}`}>#{pos}</span>;
      },
    },
    {
      key: 'change',
      header: 'Change',
      width: '12%',
      render: (_val: unknown, row: Record<string, unknown>) => {
        const curr = row.current_position !== null ? Number(row.current_position) : null;
        const prev = row.previous_position !== null ? Number(row.previous_position) : null;

        if (curr === null || prev === null) return <span className="text-[#4A6480] font-mono">-</span>;

        const diff = prev - curr; // positive is positive shift closer to #1
        if (diff > 0) return <span className="text-[#22C55E] text-xs font-mono">↑{diff}</span>;
        if (diff < 0) return <span className="text-[#EF4444] text-xs font-mono">↓{Math.abs(diff)}</span>;
        return <span className="text-[#4A6480] text-xs font-mono">-</span>;
      },
    },
    {
      key: 'search_volume',
      header: 'Volume',
      width: '13%',
      render: (val: unknown) => (
        <span className="font-mono text-xs text-[#8BA3C7]">
          {val ? Number(val).toLocaleString() : '-'}
        </span>
      ),
    },
    {
      key: 'intent',
      header: 'Intent',
      width: '15%',
      render: (val: unknown) => (
        <span className="text-[10px] bg-[#132035] border border-[#1E3352] text-[#8BA3C7] px-1.5 py-0.5 rounded uppercase font-medium select-none">
          {String(val || '')}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Month Selector & Controls Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 select-none">
        {/* Month Selector */}
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrevMonth}
            className="p-1 rounded bg-[#132035] border border-[#1E3352] text-[#8BA3C7] hover:text-[#F0F4FF] cursor-pointer"
          >
            <ChevronLeft size={14} />
          </button>
          <span className="text-xs font-semibold text-[#F0F4FF] min-w-[80px] text-center font-mono">
            {monthYearString}
          </span>
          <button
            onClick={handleNextMonth}
            className="p-1 rounded bg-[#132035] border border-[#1E3352] text-[#8BA3C7] hover:text-[#F0F4FF] cursor-pointer"
          >
            <ChevronRight size={14} />
          </button>
        </div>

        {/* Triggers */}
        <div className="flex items-center gap-2">
          <Button
            onClick={() => {
              if (seoCampaign) {
                setReportForm({
                  organic_traffic: String(seoCampaign.organic_traffic || ''),
                  organic_traffic_prev: String(seoCampaign.organic_traffic_prev || ''),
                  keywords_tracked: String(seoCampaign.keywords_tracked || ''),
                  keywords_top3: String(seoCampaign.keywords_top3 || ''),
                  keywords_top10: String(seoCampaign.keywords_top10 || ''),
                  keywords_top20: String(seoCampaign.keywords_top20 || ''),
                  backlinks_built: String(seoCampaign.backlinks_built || ''),
                  domain_authority: String(seoCampaign.domain_authority || ''),
                  audit_issues_found: String(seoCampaign.audit_issues_found || ''),
                  audit_issues_resolved: String(seoCampaign.audit_issues_resolved || ''),
                  pages_optimized: String(seoCampaign.pages_optimized || ''),
                  gsc_clicks: String(seoCampaign.gsc_clicks || ''),
                  gsc_impressions: String(seoCampaign.gsc_impressions || ''),
                  gsc_ctr: String(seoCampaign.gsc_ctr || ''),
                  gsc_avg_position: String(seoCampaign.gsc_avg_position || ''),
                  ga4_sessions: String(seoCampaign.ga4_sessions || ''),
                  ga4_new_users: String(seoCampaign.ga4_new_users || ''),
                  ga4_conversions: String(seoCampaign.ga4_conversions || ''),
                  gbp_views: String(seoCampaign.gbp_views || ''),
                  gbp_calls: String(seoCampaign.gbp_calls || ''),
                  gbp_directions: String(seoCampaign.gbp_directions || ''),
                  gbp_website_clicks: String(seoCampaign.gbp_website_clicks || ''),
                  notes: seoCampaign.notes || '',
                });
              } else {
                setReportForm({
                  organic_traffic: '',
                  organic_traffic_prev: '',
                  keywords_tracked: '',
                  keywords_top3: '',
                  keywords_top10: '',
                  keywords_top20: '',
                  backlinks_built: '',
                  domain_authority: '',
                  audit_issues_found: '',
                  audit_issues_resolved: '',
                  pages_optimized: '',
                  gsc_clicks: '',
                  gsc_impressions: '',
                  gsc_ctr: '',
                  gsc_avg_position: '',
                  ga4_sessions: '',
                  ga4_new_users: '',
                  ga4_conversions: '',
                  gbp_views: '',
                  gbp_calls: '',
                  gbp_directions: '',
                  gbp_website_clicks: '',
                  notes: '',
                });
              }
              setLogReportOpen(true);
            }}
            size="sm"
            className="bg-[#1B4FD8]/20 text-[#4D90FE] border border-[#1E3352] hover:bg-[#1B4FD8] hover:text-white text-xs h-8 gap-1.5 cursor-pointer font-semibold"
          >
            <span>Log SEO Report</span>
          </Button>

          <Button
            onClick={() => setAddKeywordOpen(true)}
            size="sm"
            className="bg-[#1B4FD8] hover:bg-[#2563EB] text-white text-xs h-8 gap-1.5 cursor-pointer font-semibold"
          >
            <Plus size={13} />
            <span>Add Keyword</span>
          </Button>

          <Button
            onClick={fetchSeoData}
            disabled={isLoading}
            size="sm"
            className="bg-[#132035] hover:bg-[#1A2D47] border border-[#1E3352] text-[#8BA3C7] hover:text-[#F0F4FF] text-xs h-8 gap-1.5 cursor-pointer"
          >
            <RefreshCw size={13} className={`stroke-[1.5] ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* 6 KPI Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <StatCard
          title="Traffic"
          value={seoCampaign?.organic_traffic?.toLocaleString() || '-'}
          icon={BarChart2}
          loading={isLoading}
        />
        <StatCard
          title="Top 10 Keywords"
          value={seoCampaign?.keywords_top10 || '-'}
          icon={Compass}
          loading={isLoading}
        />
        <StatCard
          title="Backlinks"
          value={seoCampaign?.backlinks_built || '-'}
          icon={TrendingUp}
          loading={isLoading}
        />
        <StatCard
          title="GBP Calls"
          value={seoCampaign?.gbp_calls || '-'}
          icon={Award}
          loading={isLoading}
        />
        <StatCard
          title="GSC Clicks"
          value={seoCampaign?.gsc_clicks?.toLocaleString() || '-'}
          icon={TrendingUp}
          loading={isLoading}
        />
        <StatCard
          title="Avg Position"
          value={seoCampaign?.gsc_avg_position !== undefined && seoCampaign?.gsc_avg_position !== null ? `#${seoCampaign.gsc_avg_position}` : '-'}
          valueClassName="text-[#EF4444]"
          icon={Award}
          loading={isLoading}
        />
      </div>

      {/* Keywords Table Header */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#4A6480]">
          SEO Keyword Rankings Tracker
        </h3>
        <DataTable
          columns={columns}
          data={keywords as unknown as Record<string, unknown>[]}
          loading={isLoading}
          emptyState={{
            icon: Compass,
            title: 'No Keywords Tracked',
            description: `No keywords are currently tracked in ${monthYearString}. Click Add Keyword to populate rankings list.`,
            actionLabel: 'Add Keyword',
            onAction: () => setAddKeywordOpen(true),
          }}
        />
      </div>

      {/* ━━━ COLLAPSIBLE INTEGRATIONS PANEL ━━━ */}
      <div className="border border-[#1E3352] rounded-[10px] bg-[#0D1829]/30">
        <button
          onClick={() => setIntegrationsOpen(!integrationsOpen)}
          className="w-full flex items-center justify-between p-4 text-xs font-semibold text-[#F0F4FF] select-none hover:bg-[#0D1829]/50 transition-all rounded-[10px]"
        >
          <div className="flex items-center gap-2">
            <Link2 size={14} className="text-[#4D90FE]" />
            <span>Google API Integrations (GSC & GA4)</span>
          </div>
          {integrationsOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {integrationsOpen && (
          <div className="p-4 border-t border-[#1E3352]/40 grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* GSC Card */}
            <div className={`p-4 rounded-lg border ${integrationStatus.gsc?.connected ? 'bg-[#0D1829] border-[#22C55E]/30' : 'bg-[#0A1220] border-[#1E3352]'} flex flex-col justify-between h-40`}>
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#F0F4FF]">Google Search Console</span>
                  {integrationStatus.gsc?.connected ? (
                    <span className="text-[9px] font-bold text-[#22C55E] bg-[#22C55E]/10 px-2 py-0.5 rounded-full border border-[#22C55E]/20">CONNECTED</span>
                  ) : (
                    <span className="text-[9px] font-bold text-[#4A6480] bg-[#132035] px-2 py-0.5 rounded-full border border-[#1E3352]">NOT CONNECTED</span>
                  )}
                </div>
                <p className="text-[10px] text-[#8BA3C7] mt-2 leading-relaxed">
                  {integrationStatus.gsc?.connected
                    ? `Property: ${integrationStatus.gsc.propertyUrl || 'Linked'}`
                    : 'Connect search console accounts to pull keywords list.'}
                </p>
                {integrationStatus.gsc?.connected && integrationStatus.gsc.lastSync && (
                  <p className="text-[9px] text-[#4A6480] mt-1">Last Synced: {formatDate(integrationStatus.gsc.lastSync)}</p>
                )}
              </div>
              <div className="flex gap-2">
                {!integrationStatus.gsc?.connected ? (
                  <Button size="sm" onClick={() => handleConnectGoogle('gsc')} className="bg-[#1B4FD8] hover:bg-[#2563EB] text-white text-[10px] h-7 px-3 cursor-pointer">
                    <Link2 size={11} className="mr-1" />
                    Connect GSC
                  </Button>
                ) : (
                  <>
                    <Button size="sm" onClick={() => handleSync('gsc')} disabled={syncingService === 'gsc'} className="bg-[#132035] hover:bg-[#1A2D47] border border-[#1E3352] text-[#8BA3C7] text-[10px] h-7 px-3 cursor-pointer">
                      {syncingService === 'gsc' ? <Loader2 size={10} className="animate-spin mr-1" /> : <RefreshCw size={10} className="mr-1" />}
                      Sync
                    </Button>
                    <Button size="sm" onClick={() => handleDisconnect('gsc')} disabled={disconnectingService === 'gsc'} className="bg-transparent border border-[#EF4444]/30 text-[#EF4444]/70 hover:bg-[#EF4444]/10 text-[10px] h-7 px-3 cursor-pointer">
                      <Link2Off size={10} className="mr-1" />
                      Disconnect
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* GA4 Card */}
            <div className={`p-4 rounded-lg border ${integrationStatus.ga4?.connected ? 'bg-[#0D1829] border-[#22C55E]/30' : 'bg-[#0A1220] border-[#1E3352]'} flex flex-col justify-between h-40`}>
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#F0F4FF]">Google Analytics 4</span>
                  {integrationStatus.ga4?.connected ? (
                    <span className="text-[9px] font-bold text-[#22C55E] bg-[#22C55E]/10 px-2 py-0.5 rounded-full border border-[#22C55E]/20">CONNECTED</span>
                  ) : (
                    <span className="text-[9px] font-bold text-[#4A6480] bg-[#132035] px-2 py-0.5 rounded-full border border-[#1E3352]">NOT CONNECTED</span>
                  )}
                </div>
                <p className="text-[10px] text-[#8BA3C7] mt-2 leading-relaxed">
                  {integrationStatus.ga4?.connected
                    ? `Property ID: ${integrationStatus.ga4.propertyId || 'Linked'}`
                    : 'Connect analytics property to sync organic session statistics.'}
                </p>
                {integrationStatus.ga4?.connected && integrationStatus.ga4.lastSync && (
                  <p className="text-[9px] text-[#4A6480] mt-1">Last Synced: {formatDate(integrationStatus.ga4.lastSync)}</p>
                )}
              </div>
              <div className="flex gap-2">
                {!integrationStatus.ga4?.connected ? (
                  <Button size="sm" onClick={() => handleConnectGoogle('ga4')} className="bg-[#1B4FD8] hover:bg-[#2563EB] text-white text-[10px] h-7 px-3 cursor-pointer">
                    <Link2 size={11} className="mr-1" />
                    Connect GA4
                  </Button>
                ) : (
                  <>
                    <Button size="sm" onClick={() => handleSync('ga4')} disabled={syncingService === 'ga4'} className="bg-[#132035] hover:bg-[#1A2D47] border border-[#1E3352] text-[#8BA3C7] text-[10px] h-7 px-3 cursor-pointer">
                      {syncingService === 'ga4' ? <Loader2 size={10} className="animate-spin mr-1" /> : <RefreshCw size={10} className="mr-1" />}
                      Sync
                    </Button>
                    <Button size="sm" onClick={() => handleDisconnect('ga4')} disabled={disconnectingService === 'ga4'} className="bg-transparent border border-[#EF4444]/30 text-[#EF4444]/70 hover:bg-[#EF4444]/10 text-[10px] h-7 px-3 cursor-pointer">
                      <Link2Off size={10} className="mr-1" />
                      Disconnect
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ━━━ MODAL: LOG SEO MONTHLY REPORT ━━━ */}
      <Dialog open={logReportOpen} onOpenChange={setLogReportOpen}>
        <DialogContent className="bg-[#0D1829] border border-[#1E3352] text-[#F0F4FF] max-w-lg select-none max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-[#F0F4FF]">Log SEO Analytics Report</DialogTitle>
            <DialogDescription className="text-xs text-[#8BA3C7]">
              Enter monthly analytics audit data for {monthYearString}.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4 my-2 text-xs">
            <div className="space-y-1">
              <label className="label">Organic Traffic (GA4)</label>
              <input
                type="number"
                placeholder="e.g. 1250"
                value={reportForm.organic_traffic}
                onChange={(e) => setReportForm((p) => ({ ...p, organic_traffic: e.target.value }))}
                className="input h-9"
              />
            </div>

            <div className="space-y-1">
              <label className="label">Organic Traffic (Previous Month)</label>
              <input
                type="number"
                placeholder="e.g. 1100"
                value={reportForm.organic_traffic_prev}
                onChange={(e) => setReportForm((p) => ({ ...p, organic_traffic_prev: e.target.value }))}
                className="input h-9"
              />
            </div>

            <div className="space-y-1">
              <label className="label">Keywords Tracked</label>
              <input
                type="number"
                placeholder="e.g. 50"
                value={reportForm.keywords_tracked}
                onChange={(e) => setReportForm((p) => ({ ...p, keywords_tracked: e.target.value }))}
                className="input h-9"
              />
            </div>

            <div className="space-y-1">
              <label className="label">Keywords in Top 3</label>
              <input
                type="number"
                placeholder="e.g. 5"
                value={reportForm.keywords_top3}
                onChange={(e) => setReportForm((p) => ({ ...p, keywords_top3: e.target.value }))}
                className="input h-9"
              />
            </div>

            <div className="space-y-1">
              <label className="label">Keywords in Top 10</label>
              <input
                type="number"
                placeholder="e.g. 15"
                value={reportForm.keywords_top10}
                onChange={(e) => setReportForm((p) => ({ ...p, keywords_top10: e.target.value }))}
                className="input h-9"
              />
            </div>

            <div className="space-y-1">
              <label className="label">Keywords in Top 20</label>
              <input
                type="number"
                placeholder="e.g. 30"
                value={reportForm.keywords_top20}
                onChange={(e) => setReportForm((p) => ({ ...p, keywords_top20: e.target.value }))}
                className="input h-9"
              />
            </div>

            <div className="space-y-1">
              <label className="label">Backlinks Built</label>
              <input
                type="number"
                placeholder="e.g. 8"
                value={reportForm.backlinks_built}
                onChange={(e) => setReportForm((p) => ({ ...p, backlinks_built: e.target.value }))}
                className="input h-9"
              />
            </div>

            <div className="space-y-1">
              <label className="label">Domain Authority (DA)</label>
              <input
                type="number"
                placeholder="e.g. 24"
                value={reportForm.domain_authority}
                onChange={(e) => setReportForm((p) => ({ ...p, domain_authority: e.target.value }))}
                className="input h-9"
              />
            </div>

            <div className="space-y-1">
              <label className="label">GSC Clicks</label>
              <input
                type="number"
                placeholder="e.g. 350"
                value={reportForm.gsc_clicks}
                onChange={(e) => setReportForm((p) => ({ ...p, gsc_clicks: e.target.value }))}
                className="input h-9"
              />
            </div>

            <div className="space-y-1">
              <label className="label">GSC Impressions</label>
              <input
                type="number"
                placeholder="e.g. 15000"
                value={reportForm.gsc_impressions}
                onChange={(e) => setReportForm((p) => ({ ...p, gsc_impressions: e.target.value }))}
                className="input h-9"
              />
            </div>

            <div className="space-y-1">
              <label className="label">GSC CTR (%)</label>
              <input
                type="number"
                step="0.01"
                placeholder="e.g. 2.33"
                value={reportForm.gsc_ctr}
                onChange={(e) => setReportForm((p) => ({ ...p, gsc_ctr: e.target.value }))}
                className="input h-9"
              />
            </div>

            <div className="space-y-1">
              <label className="label">GSC Average Position</label>
              <input
                type="number"
                step="0.1"
                placeholder="e.g. 14.5"
                value={reportForm.gsc_avg_position}
                onChange={(e) => setReportForm((p) => ({ ...p, gsc_avg_position: e.target.value }))}
                className="input h-9"
              />
            </div>

            <div className="space-y-1">
              <label className="label">Audit Issues Found</label>
              <input
                type="number"
                placeholder="e.g. 12"
                value={reportForm.audit_issues_found}
                onChange={(e) => setReportForm((p) => ({ ...p, audit_issues_found: e.target.value }))}
                className="input h-9"
              />
            </div>

            <div className="space-y-1">
              <label className="label">Audit Issues Resolved</label>
              <input
                type="number"
                placeholder="e.g. 9"
                value={reportForm.audit_issues_resolved}
                onChange={(e) => setReportForm((p) => ({ ...p, audit_issues_resolved: e.target.value }))}
                className="input h-9"
              />
            </div>

            <div className="space-y-1">
              <label className="label">Pages Optimized</label>
              <input
                type="number"
                placeholder="e.g. 4"
                value={reportForm.pages_optimized}
                onChange={(e) => setReportForm((p) => ({ ...p, pages_optimized: e.target.value }))}
                className="input h-9"
              />
            </div>

            <div className="space-y-1">
              <label className="label">GA4 Sessions</label>
              <input
                type="number"
                placeholder="e.g. 1800"
                value={reportForm.ga4_sessions}
                onChange={(e) => setReportForm((p) => ({ ...p, ga4_sessions: e.target.value }))}
                className="input h-9"
              />
            </div>

            <div className="space-y-1">
              <label className="label">GA4 New Users</label>
              <input
                type="number"
                placeholder="e.g. 950"
                value={reportForm.ga4_new_users}
                onChange={(e) => setReportForm((p) => ({ ...p, ga4_new_users: e.target.value }))}
                className="input h-9"
              />
            </div>

            <div className="space-y-1">
              <label className="label">GA4 Conversions</label>
              <input
                type="number"
                placeholder="e.g. 45"
                value={reportForm.ga4_conversions}
                onChange={(e) => setReportForm((p) => ({ ...p, ga4_conversions: e.target.value }))}
                className="input h-9"
              />
            </div>

            <div className="space-y-1">
              <label className="label">GBP Views</label>
              <input
                type="number"
                placeholder="e.g. 4200"
                value={reportForm.gbp_views}
                onChange={(e) => setReportForm((p) => ({ ...p, gbp_views: e.target.value }))}
                className="input h-9"
              />
            </div>

            <div className="space-y-1">
              <label className="label">GBP Calls</label>
              <input
                type="number"
                placeholder="e.g. 140"
                value={reportForm.gbp_calls}
                onChange={(e) => setReportForm((p) => ({ ...p, gbp_calls: e.target.value }))}
                className="input h-9"
              />
            </div>

            <div className="space-y-1">
              <label className="label">GBP Directions</label>
              <input
                type="number"
                placeholder="e.g. 210"
                value={reportForm.gbp_directions}
                onChange={(e) => setReportForm((p) => ({ ...p, gbp_directions: e.target.value }))}
                className="input h-9"
              />
            </div>

            <div className="space-y-1">
              <label className="label">GBP Website Clicks</label>
              <input
                type="number"
                placeholder="e.g. 340"
                value={reportForm.gbp_website_clicks}
                onChange={(e) => setReportForm((p) => ({ ...p, gbp_website_clicks: e.target.value }))}
                className="input h-9"
              />
            </div>

            <div className="col-span-2 space-y-1">
              <label className="label">SEO Notes / Recommendations</label>
              <textarea
                placeholder="Notes..."
                value={reportForm.notes}
                onChange={(e) => setReportForm((p) => ({ ...p, notes: e.target.value }))}
                rows={2}
                className="input resize-none"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setLogReportOpen(false)}
              className="bg-transparent border-[#1E3352] text-[#8BA3C7] hover:bg-[#132035] hover:text-[#F0F4FF] cursor-pointer"
            >
              Cancel
            </Button>
            <Button onClick={handleLogReport} className="bg-[#1B4FD8] hover:bg-[#2563EB] text-white cursor-pointer">
              Save Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ━━━ MODAL: ADD KEYWORD ━━━ */}
      <Dialog open={addKeywordOpen} onOpenChange={setAddKeywordOpen}>
        <DialogContent className="bg-[#0D1829] border border-[#1E3352] text-[#F0F4FF] max-w-md select-none max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-[#F0F4FF]">Add Keyword for Tracking</DialogTitle>
            <DialogDescription className="text-xs text-[#8BA3C7]">
              Configure target keywords and search intents for {monthYearString}.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4 my-2 text-xs">
            <div className="col-span-2 space-y-1">
              <label className="label">Keyword string *</label>
              <input
                type="text"
                placeholder="e.g. digital marketing agency kanpur"
                value={keywordForm.keyword}
                onChange={(e) => setKeywordForm((p) => ({ ...p, keyword: e.target.value }))}
                className="input h-9"
              />
            </div>

            <div className="col-span-2 space-y-1">
              <label className="label">Target Landing URL</label>
              <input
                type="text"
                placeholder="e.g. https://veloxisglobal.com/seo-agency"
                value={keywordForm.target_url}
                onChange={(e) => setKeywordForm((p) => ({ ...p, target_url: e.target.value }))}
                className="input h-9"
              />
            </div>

            <div className="space-y-1">
              <label className="label">Current Position</label>
              <input
                type="number"
                placeholder="e.g. 14"
                value={keywordForm.current_position}
                onChange={(e) => setKeywordForm((p) => ({ ...p, current_position: e.target.value }))}
                className="input h-9"
              />
            </div>

            <div className="space-y-1">
              <label className="label">Previous Position</label>
              <input
                type="number"
                placeholder="e.g. 20"
                value={keywordForm.previous_position}
                onChange={(e) => setKeywordForm((p) => ({ ...p, previous_position: e.target.value }))}
                className="input h-9"
              />
            </div>

            <div className="space-y-1 col-span-2">
              <label className="label">Best Position</label>
              <input
                type="number"
                placeholder="e.g. 12"
                value={keywordForm.best_position}
                onChange={(e) => setKeywordForm((p) => ({ ...p, best_position: e.target.value }))}
                className="input h-9"
              />
            </div>

            <div className="space-y-1">
              <label className="label">Search Volume</label>
              <input
                type="number"
                placeholder="e.g. 1000"
                value={keywordForm.search_volume}
                onChange={(e) => setKeywordForm((p) => ({ ...p, search_volume: e.target.value }))}
                className="input h-9"
              />
            </div>

            <div className="space-y-1">
              <label className="label">Keyword Difficulty (%)</label>
              <input
                type="number"
                placeholder="e.g. 35"
                value={keywordForm.keyword_difficulty}
                onChange={(e) => setKeywordForm((p) => ({ ...p, keyword_difficulty: e.target.value }))}
                className="input h-9"
              />
            </div>

            <div className="col-span-2 space-y-1">
              <label className="label">Keyword Intent</label>
              <select
                value={keywordForm.intent}
                onChange={(e) => setKeywordForm((p) => ({ ...p, intent: e.target.value }))}
                className="input h-9"
              >
                <option value="informational">Informational</option>
                <option value="commercial">Commercial</option>
                <option value="transactional">Transactional</option>
                <option value="navigational">Navigational</option>
              </select>
            </div>

            <div className="col-span-2 space-y-1">
              <label className="label">Additional Notes</label>
              <textarea
                placeholder="Notes..."
                value={keywordForm.notes}
                onChange={(e) => setKeywordForm((p) => ({ ...p, notes: e.target.value }))}
                rows={2}
                className="input resize-none"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAddKeywordOpen(false)}
              className="bg-transparent border-[#1E3352] text-[#8BA3C7] hover:bg-[#132035] hover:text-[#F0F4FF] cursor-pointer"
            >
              Cancel
            </Button>
            <Button onClick={handleAddKeyword} className="bg-[#1B4FD8] hover:bg-[#2563EB] text-white cursor-pointer">
              Track Keyword
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* GA4 Property ID Dialog */}
      <Dialog open={ga4PropertyModalOpen} onOpenChange={setGa4PropertyModalOpen}>
        <DialogContent className="bg-[#0D1829] border border-[#1E3352] text-[#F0F4FF] max-w-sm select-none">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">Set GA4 Property ID</DialogTitle>
            <DialogDescription className="text-xs text-[#8BA3C7]">
              Google OAuth is connected. Enter GA4 property code to finish setup.
            </DialogDescription>
          </DialogHeader>
          <div className="my-2 space-y-1 text-xs">
            <label className="label">Property ID</label>
            <input
              type="text"
              placeholder="e.g. 123456789"
              value={ga4PropertyId}
              onChange={(e) => setGa4PropertyId(e.target.value)}
              className="input h-9"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGa4PropertyModalOpen(false)} className="bg-transparent border-[#1E3352] text-[#8BA3C7] hover:bg-[#132035] cursor-pointer">Skip</Button>
            <Button onClick={handleSaveGa4Property} disabled={connecting} className="bg-[#F59E0B] hover:bg-[#D97706] text-[#060D1A] cursor-pointer font-bold">
              {connecting ? 'Saving...' : 'Save & Sync'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function SeoTab({ client }: SeoTabProps) {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-40 text-[#4A6480] text-xs gap-2">
        <Loader2 className="animate-spin" size={14} />
        <span>Loading SEO tab content...</span>
      </div>
    }>
      <SeoTabContent client={client} />
    </Suspense>
  );
}

export default SeoTab;
