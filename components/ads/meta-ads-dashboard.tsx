// components/ads/meta-ads-dashboard.tsx
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
  AlertCircle
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { StatCard } from '@/components/shared/stat-card';
import { StatusBadge } from '@/components/shared/status-badge';
import { Progress } from '@/components/ui/progress';
import { formatCurrency } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Client, MetaCampaign, MetaConnection } from '@/types';

interface MetaAdsDashboardProps {
  initialClients: Client[];
  initialCampaigns: MetaCampaign[];
  initialConnections: MetaConnection[];
  selectedMonth: string;
}

export function MetaAdsDashboard({
  initialClients,
  initialCampaigns,
  initialConnections,
  selectedMonth,
}: MetaAdsDashboardProps) {
  const router = useRouter();
  const supabase = createClient();
  const [isPending, startTransition] = useTransition();

  // Modals state
  const [logReportOpen, setLogReportOpen] = useState(false);
  const [connectModalOpen, setConnectModalOpen] = useState(false);

  // Syncing loader state
  const [syncingAll, setSyncingAll] = useState(false);
  const [syncingClientId, setSyncingClientId] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  // Connect form state
  const [connectForm, setConnectForm] = useState({
    clientId: '',
    adAccountId: '',
  });

  // Log campaign form state
  const [logForm, setLogForm] = useState({
    client_id: '',
    campaign_name: '',
    objective: 'Lead Generation',
    budget_allocated: '',
    budget_spent: '',
    impressions: '',
    clicks: '',
    leads: '',
    status: 'active',
    notes: '',
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
      router.push(`/dashboard/meta-ads?month=${encodeURIComponent(newMonthStr)}`);
    });
  };

  // Sync All active meta integrations
  const handleSyncAll = async () => {
    setSyncingAll(true);
    const toastId = toast.loading('Syncing all active Meta Ad accounts...');
    try {
      const res = await fetch('/api/integrations/sync-all', {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to sync Meta accounts');
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

  // Sync single client Meta Ad account
  const handleSyncClient = async (clientId: string) => {
    setSyncingClientId(clientId);
    const toastId = toast.loading('Syncing client campaigns from Meta API...');
    try {
      const res = await fetch(`/api/integrations/meta/sync/${clientId}`, {
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

  // Connect Ad Account Form Submit
  const handleConnectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!connectForm.clientId || !connectForm.adAccountId.trim()) {
      toast.error('All fields are required.');
      return;
    }

    setConnecting(true);
    const toastId = toast.loading('Verifying Ad Account with Meta API...');
    try {
      const res = await fetch('/api/integrations/meta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: connectForm.clientId,
          adAccountId: connectForm.adAccountId.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Connection failed');
      }

      toast.success(`Connected to account: ${data.accountName}`, { id: toastId });
      setConnectModalOpen(false);
      setConnectForm({ clientId: '', adAccountId: '' });
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
      const leadsVal = Number(logForm.leads || 0);
      const clicksVal = Number(logForm.clicks || 0);
      const impressionsVal = Number(logForm.impressions || 0);

      // Calculations
      const ctrVal = impressionsVal > 0 ? Number(((clicksVal / impressionsVal) * 100).toFixed(2)) : 0;
      const cplVal = leadsVal > 0 ? Number((budgetSpentVal / leadsVal).toFixed(2)) : 0;

      const { error } = await supabase.from('meta_campaigns').insert({
        client_id: logForm.client_id,
        campaign_name: logForm.campaign_name,
        month_year: selectedMonth,
        objective: logForm.objective || 'Lead Generation',
        budget_allocated: Number(logForm.budget_allocated || 0),
        budget_spent: budgetSpentVal,
        impressions: impressionsVal,
        clicks: clicksVal,
        leads: leadsVal,
        cpl: cplVal,
        ctr: ctrVal,
        status: logForm.status,
        notes: logForm.notes || null,
        data_synced_at: new Date().toISOString(),
      });

      if (error) throw error;

      toast.success('Campaign report logged.');
      setLogReportOpen(false);
      // Reset form
      setLogForm({
        client_id: '',
        campaign_name: '',
        objective: 'Lead Generation',
        budget_allocated: '',
        budget_spent: '',
        impressions: '',
        clicks: '',
        leads: '',
        status: 'active',
        notes: '',
      });
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to log campaign';
      toast.error(msg);
    }
  };

  // Calculations for global KPIs
  const totalSpend = initialCampaigns.reduce((sum, c) => sum + Number(c.budget_spent || 0), 0);
  const totalLeads = initialCampaigns.reduce((sum, c) => sum + Number(c.leads || 0), 0);
  const cplGlobal = totalLeads > 0 ? Math.round(totalSpend / totalLeads) : 0;
  const totalImpressions = initialCampaigns.reduce((sum, c) => sum + Number(c.impressions || 0), 0);
  const totalClicks = initialCampaigns.reduce((sum, c) => sum + Number(c.clicks || 0), 0);
  const ctrGlobal = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;

  // Sorting clients: is_agency_self always pins at the top
  const sortedClients = [...initialClients].sort((a, b) => {
    if (a.is_agency_self && !b.is_agency_self) return -1;
    if (!a.is_agency_self && b.is_agency_self) return 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="space-y-6 page-enter">
      {/* Dashboard Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 select-none">
        {/* Month Navigator */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => handleMonthChange(-1)}
            disabled={isPending}
            className="p-1 rounded bg-bg-card-hover/20 border border-border/30 text-text-secondary hover:text-text-primary disabled:opacity-50 cursor-pointer"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-semibold text-text-primary min-w-[100px] text-center font-mono">
            {selectedMonth}
          </span>
          <button
            onClick={() => handleMonthChange(1)}
            disabled={isPending}
            className="p-1 rounded bg-bg-card-hover/20 border border-border/30 text-text-secondary hover:text-text-primary disabled:opacity-50 cursor-pointer"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Action Triggers */}
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setConnectModalOpen(true)}
            variant="outline"
            className="border-border/30 text-text-secondary hover:text-text-primary hover:bg-bg-card-hover/20 text-xs h-9 cursor-pointer"
          >
            <Link2 size={14} className="mr-1.5" />
            <span>Connect Account</span>
          </Button>

          <Button
            onClick={() => setLogReportOpen(true)}
            className="bg-primary hover:bg-primary-light text-white text-xs h-9 gap-1.5 cursor-pointer font-semibold"
          >
            <Plus size={14} />
            <span>Log Campaign</span>
          </Button>

          <Button
            onClick={handleSyncAll}
            disabled={syncingAll}
            className="bg-bg-card-hover/20 hover:bg-bg-card-hover/40 border border-border/30 text-text-secondary hover:text-text-primary text-xs h-9 gap-1.5 cursor-pointer"
          >
            <RefreshCw size={14} className={syncingAll ? 'animate-spin' : ''} />
            <span>Sync All</span>
          </Button>
        </div>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="CPL (Meta)"
          value={formatCurrency(cplGlobal)}
          valueClassName="text-error font-mono"
          icon={TrendingUp}
          loading={isPending}
        />
        <StatCard
          title="Total Meta Spend"
          value={formatCurrency(totalSpend)}
          valueClassName="text-accent font-mono"
          icon={DollarSign}
          loading={isPending}
        />
        <StatCard
          title="Meta Leads"
          value={totalLeads.toLocaleString()}
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
        <h2 className="text-sm font-bold uppercase tracking-wider text-text-tertiary select-none">
          Client Ad Accounts ({sortedClients.length})
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {sortedClients.map((client) => {
            // Find Campaigns for client
            const clientCampaigns = initialCampaigns.filter((c) => c.client_id === client.id);
            const connection = initialConnections.find((conn) => conn.client_id === client.id);

            const clientSpend = clientCampaigns.reduce((sum, c) => sum + Number(c.budget_spent || 0), 0);
            const clientAllocated = clientCampaigns.reduce((sum, c) => sum + Number(c.budget_allocated || 0), 0);
            const clientLeads = clientCampaigns.reduce((sum, c) => sum + Number(c.leads || 0), 0);
            const clientCpl = clientLeads > 0 ? Math.round(clientSpend / clientLeads) : 0;
            const clientImpressions = clientCampaigns.reduce((sum, c) => sum + Number(c.impressions || 0), 0);
            const clientClicks = clientCampaigns.reduce((sum, c) => sum + Number(c.clicks || 0), 0);
            const clientCtr = clientImpressions > 0 ? (clientClicks / clientImpressions) * 100 : 0;

            const progressPct = clientAllocated > 0 ? Math.min((clientSpend / clientAllocated) * 100, 100) : 0;

            return (
              <div
                key={client.id}
                className="bg-bg-card border border-border/30 rounded-[10px] p-5 space-y-4 hover:border-border/50 transition-all flex flex-col justify-between"
              >
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-text-primary">{client.name}</span>
                      {client.is_agency_self && (
                        <span className="badge badge-orange py-0.5 px-2 text-[9px] rounded-full uppercase font-bold">
                          My Agency
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-text-secondary">{client.company || 'No Company'}</span>
                  </div>

                  {connection ? (
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-online bg-online/15 px-2 py-0.5 rounded-full font-medium">
                        API Connected
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleSyncClient(client.id)}
                        disabled={syncingClientId === client.id}
                        className="h-7 w-7 p-0 hover:bg-bg-card-hover/20 cursor-pointer"
                      >
                        <RefreshCw
                          size={12}
                          className={`${syncingClientId === client.id ? 'animate-spin' : ''}`}
                        />
                      </Button>
                    </div>
                  ) : (
                    <span className="text-[10px] text-text-tertiary bg-bg-card-hover/20 px-2 py-0.5 rounded-full font-medium">
                      Not Connected
                    </span>
                  )}
                </div>

                {/* Sub KPI Stats Grid */}
                <div className="grid grid-cols-4 gap-2 pt-2 border-t border-border/30/40">
                  <div>
                    <span className="text-[9px] text-text-tertiary uppercase tracking-wider block">Spend</span>
                    <span className="font-semibold text-xs text-accent font-mono">{formatCurrency(clientSpend)}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-text-tertiary uppercase tracking-wider block">Leads</span>
                    <span className="font-semibold text-xs text-text-primary font-mono">{clientLeads}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-text-tertiary uppercase tracking-wider block">CPL</span>
                    <span className="font-semibold text-xs text-error font-mono">{formatCurrency(clientCpl)}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-text-tertiary uppercase tracking-wider block">CTR</span>
                    <span className="font-semibold text-xs text-text-secondary font-mono">{clientCtr.toFixed(2)}%</span>
                  </div>
                </div>

                {/* Campaign Progress details */}
                <div className="space-y-1.5 select-none pt-2 border-t border-border/30/40">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-text-secondary">Monthly Budget consumption</span>
                    <span className="font-semibold text-text-primary font-mono">
                      {formatCurrency(clientSpend)} / {formatCurrency(clientAllocated)} ({progressPct.toFixed(0)}%)
                    </span>
                  </div>
                  <Progress value={progressPct} className="h-1.5 bg-bg-dark" />
                </div>

                {/* Campaigns List or Empty details */}
                <div className="pt-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary mb-2 block">
                    Campaigns Logged ({clientCampaigns.length})
                  </span>
                  {clientCampaigns.length > 0 ? (
                    <div className="space-y-1.5 max-h-[120px] overflow-y-auto pr-1">
                      {clientCampaigns.map((c) => (
                        <div
                          key={c.id}
                          className="flex items-center justify-between text-xs p-2 rounded bg-bg-dark border border-border/30/60"
                        >
                          <span className="text-text-primary font-medium truncate max-w-[150px]">{c.campaign_name}</span>
                          <div className="flex items-center gap-2 font-mono">
                            <span className="text-accent">{formatCurrency(c.budget_spent)}</span>
                            <span className="text-text-secondary text-[10px]">({c.leads} L)</span>
                            <StatusBadge status={c.status} />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 border border-dashed border-border/30/60 rounded text-text-tertiary text-xs">
                      No campaigns logged for {selectedMonth}.
                    </div>
                  )}
                </div>

                {/* Account Details footer */}
                {connection && (
                  <div className="flex items-center gap-1.5 text-[9px] text-text-secondary pt-2 border-t border-border/30/40 font-mono">
                    <AlertCircle size={10} className="text-text-tertiary" />
                    <span>Ad Account ID: {connection.ad_account_id}</span>
                    {connection.last_sync && (
                      <span className="text-text-tertiary ml-auto">
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

      {/* ── MODAL: CONNECT META AD ACCOUNT ── */}
      <Dialog open={connectModalOpen} onOpenChange={setConnectModalOpen}>
        <DialogContent className="sm:max-w-[400px] select-none">
          <form onSubmit={handleConnectSubmit}>
            <DialogHeader>
              <DialogTitle className="text-base font-semibold text-text-primary">Connect Meta Ad Account</DialogTitle>
              <DialogDescription className="text-xs text-text-secondary">
                Provide client&apos;s Meta Ad Account ID (format: act_XXXXXXXXX).
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
                <label className="label">Ad Account ID *</label>
                <input
                  type="text"
                  placeholder="e.g. act_123456789012345"
                  value={connectForm.adAccountId}
                  onChange={(e) => setConnectForm((p) => ({ ...p, adAccountId: e.target.value }))}
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
                className="bg-transparent border-border/30 text-text-secondary hover:bg-bg-card-hover/20 hover:text-text-primary cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={connecting}
                className="bg-primary hover:bg-primary-light text-white cursor-pointer"
              >
                {connecting ? 'Verifying...' : 'Connect Account'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── MODAL: LOG CAMPAIGN MANUALLY ── */}
      <Dialog open={logReportOpen} onOpenChange={setLogReportOpen}>
        <DialogContent className="sm:max-w-[600px] select-none max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleLogSubmit}>
            <DialogHeader>
              <DialogTitle className="text-base font-semibold text-text-primary">Log Meta Campaign</DialogTitle>
              <DialogDescription className="text-xs text-text-secondary">
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
                  placeholder="e.g. Leads Broadcast Campaign"
                  value={logForm.campaign_name}
                  onChange={(e) => setLogForm((p) => ({ ...p, campaign_name: e.target.value }))}
                  className="input h-9"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="label">Campaign Objective</label>
                <select
                  value={logForm.objective}
                  onChange={(e) => setLogForm((p) => ({ ...p, objective: e.target.value }))}
                  className="input h-9"
                >
                  <option value="Lead Generation">Lead Generation</option>
                  <option value="Conversions">Conversions</option>
                  <option value="Traffic">Traffic</option>
                  <option value="Brand Awareness">Brand Awareness</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="label">Allocated Budget (₹)</label>
                <input
                  type="number"
                  placeholder="e.g. 50000"
                  value={logForm.budget_allocated}
                  onChange={(e) => setLogForm((p) => ({ ...p, budget_allocated: e.target.value }))}
                  className="input h-9"
                />
              </div>

              <div className="space-y-1">
                <label className="label">Spent Budget (₹)</label>
                <input
                  type="number"
                  placeholder="e.g. 42000"
                  value={logForm.budget_spent}
                  onChange={(e) => setLogForm((p) => ({ ...p, budget_spent: e.target.value }))}
                  className="input h-9"
                />
              </div>

              <div className="space-y-1">
                <label className="label">Impressions</label>
                <input
                  type="number"
                  placeholder="e.g. 100000"
                  value={logForm.impressions}
                  onChange={(e) => setLogForm((p) => ({ ...p, impressions: e.target.value }))}
                  className="input h-9"
                />
              </div>

              <div className="space-y-1">
                <label className="label">Clicks</label>
                <input
                  type="number"
                  placeholder="e.g. 4500"
                  value={logForm.clicks}
                  onChange={(e) => setLogForm((p) => ({ ...p, clicks: e.target.value }))}
                  className="input h-9"
                />
              </div>

              <div className="space-y-1">
                <label className="label">Leads Generated</label>
                <input
                  type="number"
                  placeholder="e.g. 350"
                  value={logForm.leads}
                  onChange={(e) => setLogForm((p) => ({ ...p, leads: e.target.value }))}
                  className="input h-9"
                />
              </div>

              <div className="space-y-1">
                <label className="label">Status</label>
                <select
                  value={logForm.status}
                  onChange={(e) => setFormStatus(e.target.value)}
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
                  placeholder="Log details, audiences, target locations..."
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
                className="bg-transparent border-border/30 text-text-secondary hover:bg-bg-card-hover/20 hover:text-text-primary cursor-pointer"
              >
                Cancel
              </Button>
              <Button type="submit" className="bg-primary hover:bg-primary-light text-white cursor-pointer">
                Log Campaign
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );

  function setFormStatus(val: string) {
    setLogForm((p) => ({ ...p, status: val }));
  }
}
