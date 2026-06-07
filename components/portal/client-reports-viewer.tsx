'use client';

import React, { useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Globe,
  Megaphone,
  FileText,
  Download,
} from 'lucide-react';

interface SeoCampaign {
  id: string;
  month_year: string;
  organic_traffic: number;
  organic_traffic_prev: number;
  keywords_tracked: number;
  keywords_top3: number;
  keywords_top10: number;
  keywords_top20: number;
  backlinks_built: number;
  domain_authority: number | null;
  gsc_clicks: number;
  gsc_impressions: number;
  gsc_ctr: number | null;
  gsc_avg_position: number | null;
  ga4_sessions: number;
  ga4_new_users: number;
  ga4_conversions: number;
  notes: string | null;
}

interface SeoKeyword {
  id: string;
  keyword: string;
  target_url: string | null;
  current_position: number | null;
  previous_position: number | null;
  search_volume: number | null;
  keyword_difficulty: number | null;
  intent: string | null;
}

interface MetaCampaign {
  id: string;
  campaign_name: string;
  month_year: string;
  budget_allocated: number;
  budget_spent: number;
  impressions: number;
  reach: number;
  clicks: number;
  leads: number;
  cpl: number | null;
  ctr: number | null;
  roas: number | null;
  status: string;
  notes: string | null;
}

interface GoogleAdsCampaign {
  id: string;
  campaign_name: string;
  month_year: string;
  type: string | null;
  budget_allocated: number | null;
  budget_spent: number | null;
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: number | null;
  avg_cpc: number | null;
  cost_per_conv: number | null;
  status: string;
}

interface GeneratedReport {
  id: string;
  month_year: string;
  created_at: string;
  files: {
    name: string;
    public_url: string | null;
    size_bytes: number | null;
  } | null;
}

interface ClientReportsViewerProps {
  seoCampaigns: SeoCampaign[];
  keywords: SeoKeyword[];
  metaCampaigns: MetaCampaign[];
  googleCampaigns: GoogleAdsCampaign[];
  reports: GeneratedReport[];
}

export function ClientReportsViewer({
  seoCampaigns,
  keywords,
  metaCampaigns,
  googleCampaigns,
  reports,
}: ClientReportsViewerProps) {
  const [activeTab, setActiveTab] = useState<'seo' | 'ads' | 'archives'>('seo');
  
  // Resolve unique available months
  const availableMonths = seoCampaigns.map((c) => c.month_year);
  const [selectedMonth, setSelectedMonth] = useState(availableMonths[0] || '');

  const activeSeoCampaign = seoCampaigns.find((c) => c.month_year === selectedMonth);

  return (
    <div className="space-y-5 select-none">
      {/* Top Selector & Tabs Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        {/* Toggle Tabs */}
        <div className="flex bg-bg-light border border-border p-1 rounded-[8px]">
          <button
            onClick={() => setActiveTab('seo')}
            className={`px-4 py-1.5 rounded-[6px] text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'seo'
                ? 'bg-bg-light text-text-primary shadow-xs'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            SEO Rankings
          </button>
          <button
            onClick={() => setActiveTab('ads')}
            className={`px-4 py-1.5 rounded-[6px] text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'ads'
                ? 'bg-bg-light text-text-primary shadow-xs'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Paid Ads
          </button>
          <button
            onClick={() => setActiveTab('archives')}
            className={`px-4 py-1.5 rounded-[6px] text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'archives'
                ? 'bg-bg-light text-text-primary shadow-xs'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Report PDFs
          </button>
        </div>

        {/* Month Selector for SEO tab */}
        {activeTab === 'seo' && availableMonths.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-text-secondary font-bold uppercase">Report Period:</span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-bg-light border border-border text-text-primary text-xs font-semibold rounded-[7px] px-3 py-1.5 focus:outline-none focus:border-primary"
            >
              {availableMonths.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* ─── TAB 1: SEO REPORTS ─── */}
      {activeTab === 'seo' && (
        <div className="space-y-6">
          {!activeSeoCampaign ? (
            <div className="bg-bg-light border border-border rounded-[10px] p-10 text-center text-text-secondary space-y-2">
              <Globe size={32} className="mx-auto text-text-muted" />
              <p className="font-bold text-sm text-text-primary">No SEO Report Data Yet</p>
              <p className="text-xs max-w-xs mx-auto">
                Your monthly SEO campaign rankings and Search Console synchronizations will appear here shortly.
              </p>
            </div>
          ) : (
            <>
              {/* SEO Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-bg-light border border-border rounded-[10px] p-4 shadow-xs">
                  <span className="text-[10px] text-text-secondary font-bold uppercase tracking-wider block">Organic Traffic</span>
                  <div className="text-xl font-bold font-mono text-text-primary mt-1">
                    {(activeSeoCampaign.organic_traffic || 0).toLocaleString('en-US')}
                  </div>
                  <span className="text-[9px] text-text-muted block mt-0.5">GA4 Sessions</span>
                </div>
                <div className="bg-bg-light border border-border rounded-[10px] p-4 shadow-xs">
                  <span className="text-[10px] text-text-secondary font-bold uppercase tracking-wider block">Search Clicks</span>
                  <div className="text-xl font-bold font-mono text-text-primary mt-1">
                    {(activeSeoCampaign.gsc_clicks || 0).toLocaleString('en-US')}
                  </div>
                  <span className="text-[9px] text-text-muted block mt-0.5">Google Web Search</span>
                </div>
                <div className="bg-bg-light border border-border rounded-[10px] p-4 shadow-xs">
                  <span className="text-[10px] text-text-secondary font-bold uppercase tracking-wider block">Avg position</span>
                  <div className="text-xl font-bold font-mono text-text-primary mt-1">
                    {activeSeoCampaign.gsc_avg_position ? Number(activeSeoCampaign.gsc_avg_position).toFixed(1) : '-'}
                  </div>
                  <span className="text-[9px] text-text-muted block mt-0.5">Search Console</span>
                </div>
                <div className="bg-bg-light border border-border rounded-[10px] p-4 shadow-xs">
                  <span className="text-[10px] text-text-secondary font-bold uppercase tracking-wider block">CTR %</span>
                  <div className="text-xl font-bold font-mono text-text-primary mt-1">
                    {activeSeoCampaign.gsc_ctr ? `${Number(activeSeoCampaign.gsc_ctr).toFixed(1)}%` : '-'}
                  </div>
                  <span className="text-[9px] text-text-muted block mt-0.5">Clicks / Impressions</span>
                </div>
              </div>

              {/* Keywords Table */}
              <div className="bg-bg-light border border-border rounded-[10px] p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <h3 className="text-sm font-bold text-text-primary">Tracked SEO Keyword Positions</h3>
                  <span className="text-[9px] bg-bg-light text-text-secondary px-2 py-0.5 rounded-full font-bold">
                    {keywords.length} keywords
                  </span>
                </div>

                {keywords.length === 0 ? (
                  <div className="py-8 text-center text-xs text-text-muted">
                    No keywords are currently tracked for this campaign.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-border bg-bg-light text-[9px] font-bold text-text-secondary uppercase tracking-wider">
                          <th className="p-3 pl-4">Rank</th>
                          <th className="p-3">Keyword</th>
                          <th className="p-3">Search Volume</th>
                          <th className="p-3">Difficulty</th>
                          <th className="p-3">Intent</th>
                          <th className="p-3 text-right pr-4">Change</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/50 text-xs">
                        {keywords.map((kw) => {
                          const currentPos = kw.current_position || 100;
                          const prevPos = kw.previous_position || 100;
                          const diff = prevPos - currentPos; // Positive is good (rank went up/smaller number)

                          return (
                            <tr key={kw.id} className="hover:bg-bg-light text-text-secondary transition-colors">
                              <td className="p-3 pl-4 font-mono font-bold text-text-primary">
                                #{kw.current_position || '-'}
                              </td>
                              <td className="p-3">
                                <div>
                                  <span className="font-semibold text-text-primary">{kw.keyword}</span>
                                  {kw.target_url && (
                                    <a
                                      href={kw.target_url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-[9px] text-text-link hover:underline block mt-0.5 truncate max-w-[200px]"
                                    >
                                      {kw.target_url}
                                    </a>
                                  )}
                                </div>
                              </td>
                              <td className="p-3 font-mono">
                                {kw.search_volume ? kw.search_volume.toLocaleString('en-US') : '-'}
                              </td>
                              <td className="p-3">
                                {kw.keyword_difficulty !== null ? (
                                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                    kw.keyword_difficulty > 60 
                                      ? 'bg-rose-50 text-rose-600' 
                                      : kw.keyword_difficulty > 30 
                                      ? 'bg-amber-50 text-amber-600' 
                                      : 'bg-green-50 text-green-600'
                                  }`}>
                                    {kw.keyword_difficulty}%
                                  </span>
                                ) : '-'}
                              </td>
                              <td className="p-3">
                                {kw.intent && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-brand-blue-muted text-brand-blue uppercase">
                                    {kw.intent}
                                  </span>
                                )}
                              </td>
                              <td className="p-3 text-right pr-4 font-bold">
                                {diff > 0 ? (
                                  <span className="text-status-active flex items-center justify-end gap-0.5">
                                    <TrendingUp size={10} /> +{diff}
                                  </span>
                                ) : diff < 0 ? (
                                  <span className="text-rose-500 flex items-center justify-end gap-0.5">
                                    <TrendingDown size={10} /> {diff}
                                  </span>
                                ) : (
                                  <span className="text-text-muted">—</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* ─── TAB 2: PAID ADS REPORTS ─── */}
      {activeTab === 'ads' && (
        <div className="space-y-6">
          {/* Meta Campaigns */}
          <div className="bg-bg-light border border-border rounded-[10px] p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-sm font-bold text-text-primary flex items-center gap-1.5">
                <Megaphone size={14} className="text-brand-blue" />
                Meta Ads Campaigns
              </h3>
              <span className="text-[9px] bg-brand-blue-muted text-brand-blue px-2 py-0.5 rounded-full font-bold">
                Meta Marketing API
              </span>
            </div>

            {!metaCampaigns || metaCampaigns.length === 0 ? (
              <div className="py-8 text-center text-xs text-text-muted">
                No Meta Campaigns synced for this account.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-bg-light text-[9px] font-bold text-text-secondary uppercase tracking-wider">
                      <th className="p-3 pl-4">Campaign Name</th>
                      <th className="p-3">Period</th>
                      <th className="p-3">Budget Spent</th>
                      <th className="p-3">Clicks</th>
                      <th className="p-3">Leads</th>
                      <th className="p-3">CPL</th>
                      <th className="p-3 text-right pr-4">ROAS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50 text-xs">
                    {metaCampaigns.map((camp) => (
                      <tr key={camp.id} className="hover:bg-bg-light text-text-secondary">
                        <td className="p-3 pl-4">
                          <div>
                            <span className="font-semibold text-text-primary">{camp.campaign_name}</span>
                            {camp.notes && <p className="text-[9px] text-text-muted mt-0.5">{camp.notes}</p>}
                          </div>
                        </td>
                        <td className="p-3 font-mono">{camp.month_year}</td>
                        <td className="p-3 font-bold font-mono text-text-primary">₹{(camp.budget_spent || 0).toLocaleString('en-IN')}</td>
                        <td className="p-3 font-mono">{(camp.clicks || 0).toLocaleString('en-US')}</td>
                        <td className="p-3 font-bold font-mono text-status-active">{(camp.leads || 0).toLocaleString('en-US')}</td>
                        <td className="p-3 font-bold font-mono text-brand-orange">₹{camp.cpl ? Number(camp.cpl).toFixed(1) : '—'}</td>
                        <td className="p-3 text-right pr-4 font-mono font-bold text-text-primary">{camp.roas ? `${camp.roas}x` : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Google Ads Campaigns */}
          <div className="bg-bg-light border border-border rounded-[10px] p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-sm font-bold text-text-primary flex items-center gap-1.5">
                <Globe size={14} className="text-brand-orange" />
                Google Ads Campaigns
              </h3>
              <span className="text-[9px] bg-brand-orange-muted text-brand-orange px-2 py-0.5 rounded-full font-bold">
                Google Ads API
              </span>
            </div>

            {!googleCampaigns || googleCampaigns.length === 0 ? (
              <div className="py-8 text-center text-xs text-text-muted">
                No Google Campaigns synced for this account.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-bg-light text-[9px] font-bold text-text-secondary uppercase tracking-wider">
                      <th className="p-3 pl-4">Campaign Name</th>
                      <th className="p-3">Period</th>
                      <th className="p-3">Spent</th>
                      <th className="p-3">Clicks</th>
                      <th className="p-3">Conversions</th>
                      <th className="p-3 text-right pr-4">Cost/Conv</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50 text-xs">
                    {googleCampaigns.map((camp) => (
                      <tr key={camp.id} className="hover:bg-bg-light text-text-secondary">
                        <td className="p-3 pl-4">
                          <span className="font-semibold text-text-primary">{camp.campaign_name}</span>
                        </td>
                        <td className="p-3 font-mono">{camp.month_year}</td>
                        <td className="p-3 font-bold font-mono text-text-primary">₹{(camp.budget_spent || 0).toLocaleString('en-IN')}</td>
                        <td className="p-3 font-mono">{(camp.clicks || 0).toLocaleString('en-US')}</td>
                        <td className="p-3 font-bold font-mono text-status-active">{(camp.conversions || 0).toLocaleString('en-US')}</td>
                        <td className="p-3 text-right pr-4 font-bold font-mono text-brand-orange">₹{camp.cost_per_conv ? Number(camp.cost_per_conv).toFixed(1) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── TAB 3: REPORT ARCHIVES (PDFs) ─── */}
      {activeTab === 'archives' && (
        <div className="bg-bg-light border border-border rounded-[10px] p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h3 className="text-sm font-bold text-text-primary flex items-center gap-1.5">
              <FileText size={14} className="text-brand-blue" />
              Monthly Performance Reports
            </h3>
            <span className="text-[10px] text-text-secondary font-medium">Download PDF Snapshots</span>
          </div>

          {!reports || reports.length === 0 ? (
            <div className="py-12 text-center text-xs text-text-muted space-y-2">
              <FileText size={32} className="mx-auto text-text-muted/60" />
              <p className="font-semibold text-text-primary">No PDF Reports Released Yet</p>
              <p className="text-[10px] text-text-muted/70">Reports are compiled and published here on the 1st of every month.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border bg-bg-light text-[9px] font-bold text-text-secondary uppercase tracking-wider">
                    <th className="p-3 pl-4">Month</th>
                    <th className="p-3 text-center">Date Released</th>
                    <th className="p-3 text-center">File Size</th>
                    <th className="p-3 text-right pr-4">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50 text-xs">
                  {reports.map((report) => (
                    <tr key={report.id} className="hover:bg-bg-light text-text-secondary">
                      <td className="p-3 pl-4 font-bold text-text-primary">{report.month_year}</td>
                      <td className="p-3 text-center font-mono">{new Date(report.created_at).toLocaleDateString()}</td>
                      <td className="p-3 text-center font-mono">
                        {report.files?.size_bytes ? `${(report.files.size_bytes / 1024).toFixed(1)} KB` : '—'}
                      </td>
                      <td className="p-3 text-right pr-4">
                        {report.files?.public_url ? (
                          <a
                            href={report.files.public_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-brand-blue-muted text-brand-blue hover:bg-brand-blue/20 font-semibold text-[10px] transition-colors cursor-pointer"
                          >
                            <Download size={12} /> Download PDF
                          </a>
                        ) : (
                          <span className="text-text-muted text-[10px]">Processing</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
