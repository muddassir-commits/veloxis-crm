// components/seo/log-report-modal.tsx

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Client } from '@/types';
import { Loader2 } from 'lucide-react';

interface LogReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  clients: Client[];
  monthYear: string;
  onSuccess: () => void;
}

export function LogReportModal({
  isOpen,
  onClose,
  clients,
  monthYear,
  onSuccess,
}: LogReportModalProps) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState(() => clients[0]?.id || '');

  const [form, setForm] = useState({
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

  // Load existing metrics for this client + month if they exist
  useEffect(() => {
    if (!isOpen || !selectedClientId) return;

    async function loadExistingReport() {
      const { data, error } = await supabase
        .from('seo_campaigns')
        .select('*')
        .eq('client_id', selectedClientId)
        .eq('month_year', monthYear)
        .maybeSingle();

      if (!error && data) {
        setForm({
          organic_traffic: String(data.organic_traffic ?? ''),
          organic_traffic_prev: String(data.organic_traffic_prev ?? ''),
          keywords_tracked: String(data.keywords_tracked ?? ''),
          keywords_top3: String(data.keywords_top3 ?? ''),
          keywords_top10: String(data.keywords_top10 ?? ''),
          keywords_top20: String(data.keywords_top20 ?? ''),
          backlinks_built: String(data.backlinks_built ?? ''),
          domain_authority: String(data.domain_authority ?? ''),
          audit_issues_found: String(data.audit_issues_found ?? ''),
          audit_issues_resolved: String(data.audit_issues_resolved ?? ''),
          pages_optimized: String(data.pages_optimized ?? ''),
          gsc_clicks: String(data.gsc_clicks ?? ''),
          gsc_impressions: String(data.gsc_impressions ?? ''),
          gsc_ctr: String(data.gsc_ctr ?? ''),
          gsc_avg_position: String(data.gsc_avg_position ?? ''),
          ga4_sessions: String(data.ga4_sessions ?? ''),
          ga4_new_users: String(data.ga4_new_users ?? ''),
          ga4_conversions: String(data.ga4_conversions ?? ''),
          gbp_views: String(data.gbp_views ?? ''),
          gbp_calls: String(data.gbp_calls ?? ''),
          gbp_directions: String(data.gbp_directions ?? ''),
          gbp_website_clicks: String(data.gbp_website_clicks ?? ''),
          notes: data.notes ?? '',
        });
      } else {
        // Reset form
        setForm({
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
    }

    loadExistingReport();
  }, [isOpen, selectedClientId, monthYear, supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientId) {
      toast.error('Please select a client.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        client_id: selectedClientId,
        month_year: monthYear,
        organic_traffic: form.organic_traffic ? Number(form.organic_traffic) : 0,
        organic_traffic_prev: form.organic_traffic_prev ? Number(form.organic_traffic_prev) : 0,
        keywords_tracked: form.keywords_tracked ? Number(form.keywords_tracked) : 0,
        keywords_top3: form.keywords_top3 ? Number(form.keywords_top3) : 0,
        keywords_top10: form.keywords_top10 ? Number(form.keywords_top10) : 0,
        keywords_top20: form.keywords_top20 ? Number(form.keywords_top20) : 0,
        backlinks_built: form.backlinks_built ? Number(form.backlinks_built) : 0,
        domain_authority: form.domain_authority ? Number(form.domain_authority) : null,
        audit_issues_found: form.audit_issues_found ? Number(form.audit_issues_found) : 0,
        audit_issues_resolved: form.audit_issues_resolved ? Number(form.audit_issues_resolved) : 0,
        pages_optimized: form.pages_optimized ? Number(form.pages_optimized) : 0,
        gsc_clicks: form.gsc_clicks ? Number(form.gsc_clicks) : 0,
        gsc_impressions: form.gsc_impressions ? Number(form.gsc_impressions) : 0,
        gsc_ctr: form.gsc_ctr ? Number(form.gsc_ctr) : null,
        gsc_avg_position: form.gsc_avg_position ? Number(form.gsc_avg_position) : null,
        ga4_sessions: form.ga4_sessions ? Number(form.ga4_sessions) : 0,
        ga4_new_users: form.ga4_new_users ? Number(form.ga4_new_users) : 0,
        ga4_conversions: form.ga4_conversions ? Number(form.ga4_conversions) : 0,
        gbp_views: form.gbp_views ? Number(form.gbp_views) : 0,
        gbp_calls: form.gbp_calls ? Number(form.gbp_calls) : 0,
        gbp_directions: form.gbp_directions ? Number(form.gbp_directions) : 0,
        gbp_website_clicks: form.gbp_website_clicks ? Number(form.gbp_website_clicks) : 0,
        notes: form.notes || null,
        data_synced_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('seo_campaigns')
        .upsert(payload, { onConflict: 'client_id,month_year' });

      if (error) throw error;

      toast.success('SEO campaign report saved.');
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save report';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-[#0D1829] border border-[#1E3352] text-[#F0F4FF] max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">Log SEO Monthly Report</DialogTitle>
          <DialogDescription className="text-xs text-[#8BA3C7]">
            Manually enter or edit SEO campaigns data for {monthYear}.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 my-2 text-xs">
          {/* Client Select */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-[#8BA3C7]">Client</label>
            <select
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              className="w-full h-9 bg-[#132035] border border-[#1E3352] rounded px-3 text-[#F0F4FF] focus:outline-none focus:border-[#1B4FD8]"
              required
            >
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.is_agency_self ? '(My Agency)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* SEO & Traffic Section */}
            <div className="space-y-3 p-3 bg-[#132035]/30 rounded border border-[#1E3352]/50">
              <h4 className="font-bold text-[#4D90FE] border-b border-[#1E3352] pb-1 mb-2">Core SEO Metrics</h4>
              <div className="space-y-2">
                <div className="space-y-1">
                  <label className="text-[10px] text-[#8BA3C7]">Organic Traffic</label>
                  <input
                    type="number"
                    value={form.organic_traffic}
                    onChange={(e) => handleInputChange('organic_traffic', e.target.value)}
                    placeholder="e.g. 5200"
                    className="w-full h-8 bg-[#132035] border border-[#1E3352] rounded px-2.5 text-[#F0F4FF] focus:outline-none focus:border-[#1B4FD8]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-[#8BA3C7]">Organic Traffic Prev</label>
                  <input
                    type="number"
                    value={form.organic_traffic_prev}
                    onChange={(e) => handleInputChange('organic_traffic_prev', e.target.value)}
                    placeholder="e.g. 4800"
                    className="w-full h-8 bg-[#132035] border border-[#1E3352] rounded px-2.5 text-[#F0F4FF] focus:outline-none focus:border-[#1B4FD8]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-[#8BA3C7]">Backlinks Built</label>
                  <input
                    type="number"
                    value={form.backlinks_built}
                    onChange={(e) => handleInputChange('backlinks_built', e.target.value)}
                    placeholder="e.g. 15"
                    className="w-full h-8 bg-[#132035] border border-[#1E3352] rounded px-2.5 text-[#F0F4FF] focus:outline-none focus:border-[#1B4FD8]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-[#8BA3C7]">Domain Authority</label>
                  <input
                    type="number"
                    value={form.domain_authority}
                    onChange={(e) => handleInputChange('domain_authority', e.target.value)}
                    placeholder="e.g. 32"
                    className="w-full h-8 bg-[#132035] border border-[#1E3352] rounded px-2.5 text-[#F0F4FF] focus:outline-none focus:border-[#1B4FD8]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-[#8BA3C7]">Pages Optimized</label>
                  <input
                    type="number"
                    value={form.pages_optimized}
                    onChange={(e) => handleInputChange('pages_optimized', e.target.value)}
                    placeholder="e.g. 8"
                    className="w-full h-8 bg-[#132035] border border-[#1E3352] rounded px-2.5 text-[#F0F4FF] focus:outline-none focus:border-[#1B4FD8]"
                  />
                </div>
              </div>
            </div>

            {/* Keyword Positions & Audits */}
            <div className="space-y-3 p-3 bg-[#132035]/30 rounded border border-[#1E3352]/50">
              <h4 className="font-bold text-[#4D90FE] border-b border-[#1E3352] pb-1 mb-2">Keywords & Audits</h4>
              <div className="space-y-2">
                <div className="space-y-1">
                  <label className="text-[10px] text-[#8BA3C7]">Keywords Tracked</label>
                  <input
                    type="number"
                    value={form.keywords_tracked}
                    onChange={(e) => handleInputChange('keywords_tracked', e.target.value)}
                    placeholder="e.g. 150"
                    className="w-full h-8 bg-[#132035] border border-[#1E3352] rounded px-2.5 text-[#F0F4FF] focus:outline-none focus:border-[#1B4FD8]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-[#8BA3C7]">Keywords Top 3</label>
                  <input
                    type="number"
                    value={form.keywords_top3}
                    onChange={(e) => handleInputChange('keywords_top3', e.target.value)}
                    placeholder="e.g. 12"
                    className="w-full h-8 bg-[#132035] border border-[#1E3352] rounded px-2.5 text-[#F0F4FF] focus:outline-none focus:border-[#1B4FD8]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-[#8BA3C7]">Keywords Top 10</label>
                  <input
                    type="number"
                    value={form.keywords_top10}
                    onChange={(e) => handleInputChange('keywords_top10', e.target.value)}
                    placeholder="e.g. 45"
                    className="w-full h-8 bg-[#132035] border border-[#1E3352] rounded px-2.5 text-[#F0F4FF] focus:outline-none focus:border-[#1B4FD8]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-[#8BA3C7]">Keywords Top 20</label>
                  <input
                    type="number"
                    value={form.keywords_top20}
                    onChange={(e) => handleInputChange('keywords_top20', e.target.value)}
                    placeholder="e.g. 80"
                    className="w-full h-8 bg-[#132035] border border-[#1E3352] rounded px-2.5 text-[#F0F4FF] focus:outline-none focus:border-[#1B4FD8]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[10px] text-[#8BA3C7]">Audit Issues</label>
                    <input
                      type="number"
                      value={form.audit_issues_found}
                      onChange={(e) => handleInputChange('audit_issues_found', e.target.value)}
                      placeholder="8"
                      className="w-full h-8 bg-[#132035] border border-[#1E3352] rounded px-2.5 text-[#F0F4FF] focus:outline-none focus:border-[#1B4FD8]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-[#8BA3C7]">Resolved</label>
                    <input
                      type="number"
                      value={form.audit_issues_resolved}
                      onChange={(e) => handleInputChange('audit_issues_resolved', e.target.value)}
                      placeholder="6"
                      className="w-full h-8 bg-[#132035] border border-[#1E3352] rounded px-2.5 text-[#F0F4FF] focus:outline-none focus:border-[#1B4FD8]"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Google Search Console & GA4 / GBP */}
            <div className="space-y-3 p-3 bg-[#132035]/30 rounded border border-[#1E3352]/50">
              <h4 className="font-bold text-[#4D90FE] border-b border-[#1E3352] pb-1 mb-2">Google Sync Stats</h4>
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[10px] text-[#8BA3C7]">GSC Clicks</label>
                    <input
                      type="number"
                      value={form.gsc_clicks}
                      onChange={(e) => handleInputChange('gsc_clicks', e.target.value)}
                      placeholder="clicks"
                      className="w-full h-8 bg-[#132035] border border-[#1E3352] rounded px-2.5 text-[#F0F4FF] focus:outline-none focus:border-[#1B4FD8]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-[#8BA3C7]">Avg Pos</label>
                    <input
                      type="number"
                      step="0.1"
                      value={form.gsc_avg_position}
                      onChange={(e) => handleInputChange('gsc_avg_position', e.target.value)}
                      placeholder="position"
                      className="w-full h-8 bg-[#132035] border border-[#1E3352] rounded px-2.5 text-[#F0F4FF] focus:outline-none focus:border-[#1B4FD8]"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[10px] text-[#8BA3C7]">Impressions</label>
                    <input
                      type="number"
                      value={form.gsc_impressions}
                      onChange={(e) => handleInputChange('gsc_impressions', e.target.value)}
                      placeholder="impressions"
                      className="w-full h-8 bg-[#132035] border border-[#1E3352] rounded px-2.5 text-[#F0F4FF] focus:outline-none focus:border-[#1B4FD8]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-[#8BA3C7]">CTR %</label>
                    <input
                      type="number"
                      step="0.01"
                      value={form.gsc_ctr}
                      onChange={(e) => handleInputChange('gsc_ctr', e.target.value)}
                      placeholder="ctr"
                      className="w-full h-8 bg-[#132035] border border-[#1E3352] rounded px-2.5 text-[#F0F4FF] focus:outline-none focus:border-[#1B4FD8]"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[10px] text-[#8BA3C7]">GA4 Sessions</label>
                    <input
                      type="number"
                      value={form.ga4_sessions}
                      onChange={(e) => handleInputChange('ga4_sessions', e.target.value)}
                      placeholder="sessions"
                      className="w-full h-8 bg-[#132035] border border-[#1E3352] rounded px-2.5 text-[#F0F4FF] focus:outline-none focus:border-[#1B4FD8]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-[#8BA3C7]">GA4 Convs</label>
                    <input
                      type="number"
                      value={form.ga4_conversions}
                      onChange={(e) => handleInputChange('ga4_conversions', e.target.value)}
                      placeholder="conversions"
                      className="w-full h-8 bg-[#132035] border border-[#1E3352] rounded px-2.5 text-[#F0F4FF] focus:outline-none focus:border-[#1B4FD8]"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-[#8BA3C7]">GBP Calls</label>
                  <input
                    type="number"
                    value={form.gbp_calls}
                    onChange={(e) => handleInputChange('gbp_calls', e.target.value)}
                    placeholder="calls count"
                    className="w-full h-8 bg-[#132035] border border-[#1E3352] rounded px-2.5 text-[#F0F4FF] focus:outline-none focus:border-[#1B4FD8]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <label className="text-[10px] text-[#8BA3C7]">Report Notes / Observations</label>
            <textarea
              value={form.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              placeholder="Enter notes about optimization updates, ranking shifts, etc."
              rows={2}
              className="w-full bg-[#132035] border border-[#1E3352] rounded p-2 text-[#F0F4FF] focus:outline-none focus:border-[#1B4FD8] resize-none"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="h-8 text-xs border border-[#1E3352] hover:bg-[#132035] cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="h-8 text-xs bg-[#1B4FD8] hover:bg-[#2563EB] text-white font-semibold cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin mr-1.5 h-3.5 w-3.5" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save Report</span>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
