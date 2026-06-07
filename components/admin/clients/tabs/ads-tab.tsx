'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Client, MetaCampaign, GoogleAdsCampaign } from '@/types';
import { toast } from 'sonner';
import { formatCurrency, getMonthYear } from '@/lib/utils';
import {
  Plus,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Target,
  DollarSign,
  TrendingUp,
  Percent,
  ChevronDown,
  ChevronUp,
  Compass,
  Link2,
  Link2Off,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatCard } from '@/components/shared/stat-card';
import { StatusBadge } from '@/components/shared/status-badge';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';

interface AdsTabProps {
  client: Client;
}

interface ConnectionStatus {
  meta: { connected: boolean; adAccountId?: string; lastSync?: string } | null;
  google: { connected: boolean; customerId?: string; lastSync?: string } | null;
}

export function AdsTab({ client }: AdsTabProps) {
  const supabase = createClient();
  const [metaCampaigns, setMetaCampaigns] = useState<MetaCampaign[]>([]);
  const [googleCampaigns, setGoogleCampaigns] = useState<GoogleAdsCampaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Sub-tabs: 'meta' | 'google'
  const [platformTab, setPlatformTab] = useState<'meta' | 'google'>('meta');

  // Month-Year state (defaults to current month)
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const monthYearString = getMonthYear(currentDate);

  // Add Campaign Modal State
  const [addModalOpen, setAddModalOpen] = useState(false);

  // Integrations Panel State
  const [integrationsOpen, setIntegrationsOpen] = useState(false);
  const [integrationStatus, setIntegrationStatus] = useState<ConnectionStatus>({ meta: null, google: null });
  const [syncingPlatform, setSyncingPlatform] = useState<string | null>(null);
  const [disconnectingPlatform, setDisconnectingPlatform] = useState<string | null>(null);
  const [metaConnectOpen, setMetaConnectOpen] = useState(false);
  const [googleConnectOpen, setGoogleConnectOpen] = useState(false);
  const [adAccountIdInput, setAdAccountIdInput] = useState('');
  const [customerIdInput, setCustomerIdInput] = useState('');
  const [connecting, setConnecting] = useState(false);

  // Form State for manually logging a campaign
  const [form, setForm] = useState({
    platform: 'meta',
    campaign_name: '',
    objective: '',
    budget_allocated: '',
    budget_spent: '',
    impressions: '',
    clicks: '',
    leads: '',
    status: 'active',
    notes: '',
  });

  const fetchCampaigns = useCallback(async () => {
    setIsLoading(true);
    try {
      // Fetch Meta campaigns
      const { data: metaData, error: metaError } = await supabase
        .from('meta_campaigns')
        .select('*')
        .eq('client_id', client.id)
        .eq('month_year', monthYearString);

      if (metaError) throw metaError;
      setMetaCampaigns(metaData || []);

      // Fetch Google Ads campaigns
      const { data: googleData, error: googleError } = await supabase
        .from('google_ads_campaigns')
        .select('*')
        .eq('client_id', client.id)
        .eq('month_year', monthYearString);

      if (googleError) throw googleError;
      setGoogleCampaigns(googleData || []);
    } catch {
      toast.error('Failed to load ad campaigns.');
    } finally {
      setIsLoading(false);
    }
  }, [client.id, monthYearString, supabase]);

  const fetchIntegrationStatus = useCallback(async () => {
    try {
      const metaRes = await supabase
        .from('meta_connections')
        .select('*')
        .eq('client_id', client.id)
        .maybeSingle();

      let googleData = null;
      try {
        const googleRes = await supabase
          .from('google_ads_connections')
          .select('*')
          .eq('client_id', client.id)
          .maybeSingle();
        googleData = googleRes.data;
      } catch (err) {
        console.warn('google_ads_connections table not available yet, using null connection.', err);
      }

      setIntegrationStatus({
        meta: metaRes.data
          ? { connected: metaRes.data.is_active, adAccountId: metaRes.data.ad_account_id, lastSync: metaRes.data.last_sync }
          : { connected: false },
        google: googleData
          ? { connected: googleData.is_active, customerId: googleData.customer_id, lastSync: googleData.last_sync }
          : { connected: false },
      });
    } catch {
      console.error('Failed to load integrations status.');
    }
  }, [client.id, supabase]);

  const handleSync = async (platform: 'meta' | 'google') => {
    setSyncingPlatform(platform);
    const toastId = toast.loading(`Syncing ${platform === 'meta' ? 'Meta' : 'Google'} campaigns...`);
    try {
      const endpoint = platform === 'meta'
        ? `/api/integrations/meta/sync/${client.id}`
        : `/api/integrations/google-ads/sync/${client.id}`;
      
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ monthYear: monthYearString }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Sync failed');
      
      toast.success(`${platform === 'meta' ? 'Meta' : 'Google'} campaigns synced successfully!`, { id: toastId });
      fetchIntegrationStatus();
      fetchCampaigns();
    } catch (err) {
      toast.error(`Sync failed: ${err instanceof Error ? err.message : 'Unknown error'}`, { id: toastId });
    } finally {
      setSyncingPlatform(null);
    }
  };

  const handleConnectMeta = async () => {
    if (!adAccountIdInput.trim()) {
      toast.error('Ad Account ID is required');
      return;
    }
    setConnecting(true);
    const toastId = toast.loading('Connecting Meta Ad Account...');
    try {
      const res = await fetch('/api/integrations/meta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: client.id, adAccountId: adAccountIdInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Failed to connect');

      toast.success('Meta Ads connected!', { id: toastId });
      setMetaConnectOpen(false);
      setAdAccountIdInput('');
      fetchIntegrationStatus();
      handleSync('meta');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to connect', { id: toastId });
    } finally {
      setConnecting(false);
    }
  };

  const handleConnectGoogle = async () => {
    if (!customerIdInput.trim()) {
      toast.error('Customer ID is required');
      return;
    }
    setConnecting(true);
    const toastId = toast.loading('Connecting Google Ads account...');
    try {
      const res = await fetch('/api/integrations/google-ads/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: client.id, customerId: customerIdInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Failed to connect');

      toast.success('Google Ads connected!', { id: toastId });
      setGoogleConnectOpen(false);
      setCustomerIdInput('');
      fetchIntegrationStatus();
      handleSync('google');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to connect', { id: toastId });
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async (platform: 'meta' | 'google') => {
    const ok = window.confirm(`Are you sure you want to disconnect ${platform === 'meta' ? 'Meta' : 'Google'} Ads?`);
    if (!ok) return;

    setDisconnectingPlatform(platform);
    try {
      const table = platform === 'meta' ? 'meta_connections' : 'google_ads_connections';
      const { error } = await supabase
        .from(table)
        .update({ is_active: false })
        .eq('client_id', client.id);
      if (error) throw error;
      toast.success(`${platform === 'meta' ? 'Meta' : 'Google'} Ads disconnected.`);
      fetchIntegrationStatus();
    } catch {
      toast.error('Failed to disconnect connection.');
    } finally {
      setDisconnectingPlatform(null);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCampaigns();
      fetchIntegrationStatus();
    }, 0);
    return () => clearTimeout(timer);
  }, [client.id, monthYearString, fetchCampaigns, fetchIntegrationStatus]);

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

  // Calculations for Meta metrics
  const totalSpendMeta = metaCampaigns.reduce((sum, c) => sum + Number(c.budget_spent || 0), 0);
  const totalLeadsMeta = metaCampaigns.reduce((sum, c) => sum + Number(c.leads || 0), 0);
  const cplMeta = totalLeadsMeta > 0 ? Math.round(totalSpendMeta / totalLeadsMeta) : 0;
  const totalImpressionsMeta = metaCampaigns.reduce((sum, c) => sum + Number(c.impressions || 0), 0);
  const totalClicksMeta = metaCampaigns.reduce((sum, c) => sum + Number(c.clicks || 0), 0);
  const ctrMeta = totalImpressionsMeta > 0 ? (totalClicksMeta / totalImpressionsMeta) * 100 : 0;

  // Calculations for Google metrics
  const totalSpendGoogle = googleCampaigns.reduce((sum, c) => sum + Number(c.budget_spent || 0), 0);
  const totalLeadsGoogle = googleCampaigns.reduce((sum, c) => sum + Number(c.conversions || 0), 0);
  const cplGoogle = totalLeadsGoogle > 0 ? Math.round(totalSpendGoogle / totalLeadsGoogle) : 0;
  const totalImpressionsGoogle = googleCampaigns.reduce((sum, c) => sum + Number(c.impressions || 0), 0);
  const totalClicksGoogle = googleCampaigns.reduce((sum, c) => sum + Number(c.clicks || 0), 0);
  const ctrGoogle = totalImpressionsGoogle > 0 ? (totalClicksGoogle / totalImpressionsGoogle) * 100 : 0;

  // Submit Handler: Add Ad Campaign
  const handleAddCampaign = async () => {
    if (!form.campaign_name.trim()) {
      toast.error('Campaign name is required.');
      return;
    }

    try {
      const budgetSpentVal = Number(form.budget_spent || 0);
      const leadsVal = Number(form.leads || 0);
      const clicksVal = Number(form.clicks || 0);
      const impressionsVal = Number(form.impressions || 0);

      // Calculations
      const ctrVal = impressionsVal > 0 ? Number(((clicksVal / impressionsVal) * 100).toFixed(2)) : 0;
      const cplVal = leadsVal > 0 ? Number((budgetSpentVal / leadsVal).toFixed(2)) : 0;

      if (form.platform === 'meta') {
        const { error } = await supabase.from('meta_campaigns').insert({
          client_id: client.id,
          campaign_name: form.campaign_name,
          month_year: monthYearString,
          objective: form.objective || 'Lead Generation',
          budget_allocated: Number(form.budget_allocated || 0),
          budget_spent: budgetSpentVal,
          impressions: impressionsVal,
          clicks: clicksVal,
          leads: leadsVal,
          cpl: cplVal,
          ctr: ctrVal,
          status: form.status,
          notes: form.notes || null,
          data_synced_at: new Date().toISOString(),
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.from('google_ads_campaigns').insert({
          client_id: client.id,
          campaign_name: form.campaign_name,
          month_year: monthYearString,
          type: form.objective || 'Search',
          budget_allocated: Number(form.budget_allocated || 0),
          budget_spent: budgetSpentVal,
          impressions: impressionsVal,
          clicks: clicksVal,
          conversions: leadsVal,
          cost_per_conv: cplVal,
          ctr: ctrVal,
          status: form.status,
          notes: form.notes || null,
          data_synced_at: new Date().toISOString(),
        });
        if (error) throw error;
      }

      toast.success('Ad campaign report logged.');
      setAddModalOpen(false);
      fetchCampaigns();
    } catch {
      toast.error('Failed to log campaign.');
    }
  };

  const handleOpenLogModal = () => {
    setForm({
      platform: platformTab,
      campaign_name: '',
      objective: platformTab === 'meta' ? 'Lead Generation' : 'Search',
      budget_allocated: '',
      budget_spent: '',
      impressions: '',
      clicks: '',
      leads: '',
      status: 'active',
      notes: '',
    });
    setAddModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Platform & Month Selection Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 select-none">
        {/* Month Selector & Platform Toggle */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Month Selector */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={handlePrevMonth}
              className="p-1 rounded bg-bg-card-hover/20 border border-border/30 text-text-secondary hover:text-text-primary cursor-pointer"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="text-xs font-semibold text-text-primary min-w-[80px] text-center font-mono">
              {monthYearString}
            </span>
            <button
              onClick={handleNextMonth}
              className="p-1 rounded bg-bg-card-hover/20 border border-border/30 text-text-secondary hover:text-text-primary cursor-pointer"
            >
              <ChevronRight size={14} />
            </button>
          </div>

          {/* Sub-tabs switch */}
          <div className="flex items-center gap-1 bg-bg-card-hover/20 border border-border/30 p-0.5 rounded">
            <button
              onClick={() => setPlatformTab('meta')}
              className={`px-3 py-1 rounded text-[10px] font-semibold uppercase cursor-pointer transition-all ${
                platformTab === 'meta'
                  ? 'bg-primary text-text-primary'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Meta Ads
            </button>
            <button
              onClick={() => setPlatformTab('google')}
              className={`px-3 py-1 rounded text-[10px] font-semibold uppercase cursor-pointer transition-all ${
                platformTab === 'google'
                  ? 'bg-primary text-text-primary'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Google Ads
            </button>
          </div>
        </div>

        {/* Action Triggers */}
        <div className="flex items-center gap-2">
          <Button
            onClick={handleOpenLogModal}
            size="sm"
            className="bg-primary hover:bg-primary-light text-white text-xs h-8 gap-1.5 cursor-pointer font-semibold"
          >
            <Plus size={13} />
            <span>Log Campaign</span>
          </Button>

          <Button
            onClick={fetchCampaigns}
            disabled={isLoading}
            size="sm"
            className="bg-bg-card-hover/20 hover:bg-bg-card-hover/40 border border-border/30 text-text-secondary hover:text-text-primary text-xs h-8 gap-1.5 cursor-pointer"
          >
            <RefreshCw size={13} className={`stroke-[1.5] ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Collapsible Integrations Panel */}
      <div className="border border-border/30 bg-bg-card rounded-[10px] p-4 space-y-3">
        <button
          onClick={() => setIntegrationsOpen(!integrationsOpen)}
          className="flex items-center gap-2 text-xs font-semibold text-text-secondary hover:text-text-primary transition-all cursor-pointer w-full select-none"
        >
          <Compass size={14} className={integrationsOpen ? 'text-[#1B4FD8]' : ''} />
          <span>Department Integrations & API Sync</span>
          {integrationsOpen ? <ChevronUp size={14} className="ml-auto" /> : <ChevronDown size={14} className="ml-auto" />}
        </button>

        {integrationsOpen && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-border/30/40 select-none">
            {/* Meta Ads Connection */}
            <div className="flex items-center justify-between p-3 rounded bg-bg-dark border border-border/30/60">
              <div>
                <span className="text-xs font-bold text-text-primary block">Meta Ads Connection</span>
                {integrationStatus.meta?.connected ? (
                  <span className="text-[10px] font-mono text-text-secondary block">
                    ID: {integrationStatus.meta.adAccountId}
                  </span>
                ) : (
                  <span className="text-[10px] text-text-tertiary block">Not connected</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {integrationStatus.meta?.connected ? (
                  <>
                    <Button
                      size="sm"
                      onClick={() => handleSync('meta')}
                      disabled={syncingPlatform === 'meta'}
                      className="bg-bg-card-hover/20 hover:bg-bg-card-hover/40 border border-border/30 text-text-secondary hover:text-text-primary text-[10px] h-7 px-2.5 cursor-pointer"
                    >
                      {syncingPlatform === 'meta' ? (
                        <Loader2 size={10} className="animate-spin mr-1" />
                      ) : (
                        <RefreshCw size={10} className="mr-1" />
                      )}
                      Sync
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleDisconnect('meta')}
                      disabled={disconnectingPlatform === 'meta'}
                      className="bg-error/15 hover:bg-[#EF444425] border border-[#EF444430] text-error text-[10px] h-7 px-2.5 cursor-pointer"
                    >
                      <Link2Off size={10} className="mr-1" />
                      Disconnect
                    </Button>
                  </>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => setMetaConnectOpen(true)}
                    className="bg-primary hover:bg-primary-light text-white text-[10px] h-7 px-2.5 cursor-pointer font-semibold"
                  >
                    <Link2 size={10} className="mr-1" />
                    Connect ID
                  </Button>
                )}
              </div>
            </div>

            {/* Google Ads Connection */}
            <div className="flex items-center justify-between p-3 rounded bg-bg-dark border border-border/30/60">
              <div>
                <span className="text-xs font-bold text-text-primary block">Google Ads Connection</span>
                {integrationStatus.google?.connected ? (
                  <span className="text-[10px] font-mono text-text-secondary block">
                    ID: {integrationStatus.google.customerId}
                  </span>
                ) : (
                  <span className="text-[10px] text-text-tertiary block">Not connected</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {integrationStatus.google?.connected ? (
                  <>
                    <Button
                      size="sm"
                      onClick={() => handleSync('google')}
                      disabled={syncingPlatform === 'google'}
                      className="bg-bg-card-hover/20 hover:bg-bg-card-hover/40 border border-border/30 text-text-secondary hover:text-text-primary text-[10px] h-7 px-2.5 cursor-pointer"
                    >
                      {syncingPlatform === 'google' ? (
                        <Loader2 size={10} className="animate-spin mr-1" />
                      ) : (
                        <RefreshCw size={10} className="mr-1" />
                      )}
                      Sync
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleDisconnect('google')}
                      disabled={disconnectingPlatform === 'google'}
                      className="bg-error/15 hover:bg-[#EF444425] border border-[#EF444430] text-error text-[10px] h-7 px-2.5 cursor-pointer"
                    >
                      <Link2Off size={10} className="mr-1" />
                      Disconnect
                    </Button>
                  </>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => setGoogleConnectOpen(true)}
                    className="bg-primary hover:bg-primary-light text-white text-[10px] h-7 px-2.5 cursor-pointer font-semibold"
                  >
                    <Link2 size={10} className="mr-1" />
                    Connect ID
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* KPI Stats Strip based on active subtab */}
      {platformTab === 'meta' ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            title="CPL (Meta)"
            value={formatCurrency(cplMeta)}
            valueClassName="text-error font-mono"
            icon={TrendingUp}
            loading={isLoading}
          />
          <StatCard
            title="Meta Spend"
            value={formatCurrency(totalSpendMeta)}
            valueClassName="text-accent font-mono"
            icon={DollarSign}
            loading={isLoading}
          />
          <StatCard
            title="Meta Leads"
            value={totalLeadsMeta.toLocaleString()}
            icon={Target}
            loading={isLoading}
          />
          <StatCard
            title="Meta CTR"
            value={`${ctrMeta.toFixed(2)}%`}
            icon={Percent}
            loading={isLoading}
          />
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            title="CPL (Google)"
            value={formatCurrency(cplGoogle)}
            valueClassName="text-error font-mono"
            icon={TrendingUp}
            loading={isLoading}
          />
          <StatCard
            title="Google Spend"
            value={formatCurrency(totalSpendGoogle)}
            valueClassName="text-accent font-mono"
            icon={DollarSign}
            loading={isLoading}
          />
          <StatCard
            title="Google Conversions"
            value={totalLeadsGoogle.toLocaleString()}
            icon={Target}
            loading={isLoading}
          />
          <StatCard
            title="Google CTR"
            value={`${ctrGoogle.toFixed(2)}%`}
            icon={Percent}
            loading={isLoading}
          />
        </div>
      )}

      {/* Campaign Cards List with Budget Progress Bars */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-text-tertiary select-none">
          Campaign Performance Cards ({platformTab === 'meta' ? metaCampaigns.length : googleCampaigns.length})
        </h3>

        {(() => {
          const campaignsToShow = platformTab === 'meta'
            ? metaCampaigns.map((c) => ({
                id: c.id,
                campaign_name: c.campaign_name,
                allocated: Number(c.budget_allocated || 0),
                spent: Number(c.budget_spent || 0),
                leads: Number(c.leads || 0),
                costPerLead: Number(c.cpl || 0),
                objective: c.objective || 'N/A',
                status: c.status,
                ctr: Number(c.ctr || 0),
              }))
            : googleCampaigns.map((c) => ({
                id: c.id,
                campaign_name: c.campaign_name,
                allocated: Number(c.budget_allocated || 0),
                spent: Number(c.budget_spent || 0),
                leads: Number(c.conversions || 0),
                costPerLead: Number(c.cost_per_conv || 0),
                objective: c.type || 'Search',
                status: c.status,
                ctr: Number(c.ctr || 0),
              }));

          if (campaignsToShow.length === 0) {
            return (
              <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-border/30 rounded-[10px] bg-bg-dark select-none">
                <Target size={32} className="text-[#1E3352] mb-3" />
                <p className="text-sm font-medium text-text-tertiary">No Campaigns Logged</p>
                <p className="text-xs text-[#2A4060] mt-1">
                  No {platformTab === 'meta' ? 'Meta' : 'Google'} campaigns logged for this client in {monthYearString}.
                </p>
              </div>
            );
          }

          return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {campaignsToShow.map((c) => {
                const pct = c.allocated > 0 ? Math.min((c.spent / c.allocated) * 100, 100) : 0;

                return (
                  <div
                    key={c.id}
                    className="bg-bg-card border border-border/30 rounded-[10px] p-5 space-y-4 flex flex-col justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h4 className="font-bold text-xs text-text-primary line-clamp-1">{c.campaign_name}</h4>
                          <span className="text-[9px] text-text-tertiary uppercase tracking-wide">
                            Objective: {c.objective}
                          </span>
                        </div>
                        <StatusBadge status={c.status} />
                      </div>

                      <div className="grid grid-cols-4 gap-2 pt-2 text-xs">
                        <div>
                          <span className="text-[9px] text-text-tertiary uppercase tracking-wider block">Spend</span>
                          <span className="font-semibold text-xs text-accent font-mono">{formatCurrency(c.spent)}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-text-tertiary uppercase tracking-wider block">
                            {platformTab === 'meta' ? 'Leads' : 'Conversions'}
                          </span>
                          <span className="font-semibold text-xs text-text-primary font-mono">{c.leads}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-text-tertiary uppercase tracking-wider block">CPL</span>
                          <span className="font-semibold text-xs text-error font-mono">{formatCurrency(c.costPerLead)}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-text-tertiary uppercase tracking-wider block">CTR</span>
                          <span className="font-semibold text-xs text-text-secondary font-mono">{c.ctr.toFixed(2)}%</span>
                        </div>
                      </div>
                    </div>

                    {/* Budget Allocation Progress Bar */}
                    <div className="space-y-1.5 pt-3 border-t border-border/30/40 select-none">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-text-secondary">Budget Consumption</span>
                        <span className="font-semibold text-text-primary font-mono">
                          {formatCurrency(c.spent)} / {formatCurrency(c.allocated)} ({pct.toFixed(0)}%)
                        </span>
                      </div>
                      <Progress value={pct} className="h-1.5 bg-bg-dark" />
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>

      {/* ━━━ MODAL: CONNECT META AD ACCOUNT ━━━ */}
      <Dialog open={metaConnectOpen} onOpenChange={setMetaConnectOpen}>
        <DialogContent className="sm:max-w-[400px] select-none">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-text-primary">Connect Meta Ad Account</DialogTitle>
            <DialogDescription className="text-xs text-text-secondary">
              Provide client&apos;s Meta Ad Account ID (format: act_XXXXXXXXX).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 my-2 text-xs">
            <label className="label">Ad Account ID *</label>
            <input
              type="text"
              placeholder="e.g. act_123456789012345"
              value={adAccountIdInput}
              onChange={(e) => setAdAccountIdInput(e.target.value)}
              className="input h-9 font-mono"
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setMetaConnectOpen(false)}
              className="bg-transparent border-border/30 text-text-secondary hover:bg-bg-card-hover/20 hover:text-text-primary cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConnectMeta}
              disabled={connecting}
              className="bg-primary hover:bg-primary-light text-white cursor-pointer"
            >
              {connecting ? 'Connecting...' : 'Connect'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ━━━ MODAL: CONNECT GOOGLE ADS CUSTOMER ID ━━━ */}
      <Dialog open={googleConnectOpen} onOpenChange={setGoogleConnectOpen}>
        <DialogContent className="sm:max-w-[400px] select-none">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-text-primary">Connect Google Ads Account</DialogTitle>
            <DialogDescription className="text-xs text-text-secondary">
              Provide client&apos;s Google Ads Customer ID (format: XXXXXXXXXX).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 my-2 text-xs">
            <label className="label">Customer ID *</label>
            <input
              type="text"
              placeholder="e.g. 1234567890"
              value={customerIdInput}
              onChange={(e) => setCustomerIdInput(e.target.value)}
              className="input h-9 font-mono"
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setGoogleConnectOpen(false)}
              className="bg-transparent border-border/30 text-text-secondary hover:bg-bg-card-hover/20 hover:text-text-primary cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConnectGoogle}
              disabled={connecting}
              className="bg-primary hover:bg-primary-light text-white cursor-pointer"
            >
              {connecting ? 'Connecting...' : 'Connect'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ━━━ MODAL: LOG CAMPAIGN ━━━ */}
      <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
        <DialogContent className="sm:max-w-[600px] select-none max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-text-primary">Log Ad Campaign metrics</DialogTitle>
            <DialogDescription className="text-xs text-text-secondary">
              Log campaign performance metrics for {monthYearString}.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4 my-2 text-xs">
            <div className="space-y-1">
              <label className="label">Ad Platform</label>
              <select
                value={form.platform}
                onChange={(e) => setForm((p) => ({ ...p, platform: e.target.value }))}
                className="input h-9"
              >
                <option value="meta">Meta Ads</option>
                <option value="google">Google Ads</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="label">Campaign Name *</label>
              <input
                type="text"
                placeholder="e.g. Kanpur Leads Campaign"
                value={form.campaign_name}
                onChange={(e) => setForm((p) => ({ ...p, campaign_name: e.target.value }))}
                className="input h-9"
              />
            </div>

            <div className="space-y-1">
              <label className="label">Objective / Type</label>
              <input
                type="text"
                placeholder={form.platform === 'meta' ? 'e.g. Lead Generation' : 'e.g. Search / PMax'}
                value={form.objective}
                onChange={(e) => setForm((p) => ({ ...p, objective: e.target.value }))}
                className="input h-9"
              />
            </div>

            <div className="space-y-1">
              <label className="label">Project Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
                className="input h-9"
              >
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="label">Allocated Budget (₹)</label>
              <input
                type="number"
                placeholder="e.g. 25000"
                value={form.budget_allocated}
                onChange={(e) => setForm((p) => ({ ...p, budget_allocated: e.target.value }))}
                className="input h-9"
              />
            </div>

            <div className="space-y-1">
              <label className="label">Spent Budget (₹)</label>
              <input
                type="number"
                placeholder="e.g. 18400"
                value={form.budget_spent}
                onChange={(e) => setForm((p) => ({ ...p, budget_spent: e.target.value }))}
                className="input h-9"
              />
            </div>

            <div className="space-y-1">
              <label className="label">Impressions</label>
              <input
                type="number"
                placeholder="e.g. 45000"
                value={form.impressions}
                onChange={(e) => setForm((p) => ({ ...p, impressions: e.target.value }))}
                className="input h-9"
              />
            </div>

            <div className="space-y-1">
              <label className="label">Clicks</label>
              <input
                type="number"
                placeholder="e.g. 1200"
                value={form.clicks}
                onChange={(e) => setForm((p) => ({ ...p, clicks: e.target.value }))}
                className="input h-9"
              />
            </div>

            <div className="col-span-2 space-y-1">
              <label className="label">{form.platform === 'meta' ? 'Leads' : 'Conversions'} Generated</label>
              <input
                type="number"
                placeholder="e.g. 43"
                value={form.leads}
                onChange={(e) => setForm((p) => ({ ...p, leads: e.target.value }))}
                className="input h-9"
              />
            </div>

            <div className="col-span-2 space-y-1">
              <label className="label">Campaign Strategy Notes</label>
              <textarea
                placeholder="Campaign specifics, audience notes..."
                value={form.notes}
                onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                rows={2}
                className="input resize-none"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAddModalOpen(false)}
              className="bg-transparent border-border/30 text-text-secondary hover:bg-bg-card-hover/20 hover:text-text-primary cursor-pointer"
            >
              Cancel
            </Button>
            <Button onClick={handleAddCampaign} className="bg-primary hover:bg-primary-light text-white cursor-pointer">
              Log Campaign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default AdsTab;
