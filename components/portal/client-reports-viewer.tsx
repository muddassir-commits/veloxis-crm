'use client';

import React, { useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Globe,
  Megaphone,
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

interface ClientReportsViewerProps {
  seoCampaigns: SeoCampaign[];
  keywords: SeoKeyword[];
  metaCampaigns: MetaCampaign[];
  googleCampaigns: GoogleAdsCampaign[];
}

export function ClientReportsViewer({
  seoCampaigns,
  keywords,
  metaCampaigns,
  googleCampaigns,
}: ClientReportsViewerProps) {
  const [activeTab, setActiveTab] = useState<'seo' | 'ads'>('seo');
  
  // Resolve unique available months
  const availableMonths = seoCampaigns.map((c) => c.month_year);
  const [selectedMonth, setSelectedMonth] = useState(availableMonths[0] || '');

  const activeSeoCampaign = seoCampaigns.find((c) => c.month_year === selectedMonth);

  return (
    <div className="space-y-5 select-none">
      {/* Top Selector & Tabs Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        {/* Toggle Tabs */}
        <div className="flex bg-[#F1F5F9] border border-[#E2E8F4] p-1 rounded-[8px]">
          <button
            onClick={() => setActiveTab('seo')}
            className={`px-4 py-1.5 rounded-[6px] text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'seo'
                ? 'bg-white text-[#0A1628] shadow-xs'
                : 'text-[#475569] hover:text-[#0A1628]'
            }`}
          >
            SEO Rankings
          </button>
          <button
            onClick={() => setActiveTab('ads')}
            className={`px-4 py-1.5 rounded-[6px] text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'ads'
                ? 'bg-white text-[#0A1628] shadow-xs'
                : 'text-[#475569] hover:text-[#0A1628]'
            }`}
          >
            Paid Ads
          </button>
        </div>

        {/* Month Selector for SEO tab */}
        {activeTab === 'seo' && availableMonths.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-[#475569] font-bold uppercase">Report Period:</span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-white border border-[#E2E8F4] text-[#0A1628] text-xs font-semibold rounded-[7px] px-3 py-1.5 focus:outline-none focus:border-[#1B4FD8]"
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
            <div className="bg-white border border-[#E2E8F4] rounded-[10px] p-10 text-center text-[#475569] space-y-2">
              <Globe size={32} className="mx-auto text-[#94A3B8]" />
              <p className="font-bold text-sm text-[#0A1628]">No SEO Report Data Yet</p>
              <p className="text-xs max-w-xs mx-auto">
                Your monthly SEO campaign rankings and Search Console synchronizations will appear here shortly.
              </p>
            </div>
          ) : (
            <>
              {/* SEO Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white border border-[#E2E8F4] rounded-[10px] p-4 shadow-xs">
                  <span className="text-[10px] text-[#475569] font-bold uppercase tracking-wider block">Organic Traffic</span>
                  <div className="text-xl font-bold font-mono text-[#0A1628] mt-1">
                    {(activeSeoCampaign.organic_traffic || 0).toLocaleString('en-US')}
                  </div>
                  <span className="text-[9px] text-[#94A3B8] block mt-0.5">GA4 Sessions</span>
                </div>
                <div className="bg-white border border-[#E2E8F4] rounded-[10px] p-4 shadow-xs">
                  <span className="text-[10px] text-[#475569] font-bold uppercase tracking-wider block">Search Clicks</span>
                  <div className="text-xl font-bold font-mono text-[#0A1628] mt-1">
                    {(activeSeoCampaign.gsc_clicks || 0).toLocaleString('en-US')}
                  </div>
                  <span className="text-[9px] text-[#94A3B8] block mt-0.5">Google Web Search</span>
                </div>
                <div className="bg-white border border-[#E2E8F4] rounded-[10px] p-4 shadow-xs">
                  <span className="text-[10px] text-[#475569] font-bold uppercase tracking-wider block">Avg position</span>
                  <div className="text-xl font-bold font-mono text-[#0A1628] mt-1">
                    {activeSeoCampaign.gsc_avg_position ? Number(activeSeoCampaign.gsc_avg_position).toFixed(1) : '-'}
                  </div>
                  <span className="text-[9px] text-[#94A3B8] block mt-0.5">Search Console</span>
                </div>
                <div className="bg-white border border-[#E2E8F4] rounded-[10px] p-4 shadow-xs">
                  <span className="text-[10px] text-[#475569] font-bold uppercase tracking-wider block">CTR %</span>
                  <div className="text-xl font-bold font-mono text-[#0A1628] mt-1">
                    {activeSeoCampaign.gsc_ctr ? `${Number(activeSeoCampaign.gsc_ctr).toFixed(1)}%` : '-'}
                  </div>
                  <span className="text-[9px] text-[#94A3B8] block mt-0.5">Clicks / Impressions</span>
                </div>
              </div>

              {/* Keywords Table */}
              <div className="bg-white border border-[#E2E8F4] rounded-[10px] p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3">
                  <h3 className="text-sm font-bold text-[#0A1628]">Tracked SEO Keyword Positions</h3>
                  <span className="text-[9px] bg-slate-100 text-[#475569] px-2 py-0.5 rounded-full font-bold">
                    {keywords.length} keywords
                  </span>
                </div>

                {keywords.length === 0 ? (
                  <div className="py-8 text-center text-xs text-[#94A3B8]">
                    No keywords are currently tracked for this campaign.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-[#E2E8F4] bg-[#F8FAFF] text-[9px] font-bold text-[#475569] uppercase tracking-wider">
                          <th className="p-3 pl-4">Rank</th>
                          <th className="p-3">Keyword</th>
                          <th className="p-3">Search Volume</th>
                          <th className="p-3">Difficulty</th>
                          <th className="p-3">Intent</th>
                          <th className="p-3 text-right pr-4">Change</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E2E8F4]/50 text-xs">
                        {keywords.map((kw) => {
                          const currentPos = kw.current_position || 100;
                          const prevPos = kw.previous_position || 100;
                          const diff = prevPos - currentPos; // Positive is good (rank went up/smaller number)

                          return (
                            <tr key={kw.id} className="hover:bg-[#F8FAFF] text-[#475569] transition-colors">
                              <td className="p-3 pl-4 font-mono font-bold text-[#0A1628]">
                                #{kw.current_position || '-'}
                              </td>
                              <td className="p-3">
                                <div>
                                  <span className="font-semibold text-[#0A1628]">{kw.keyword}</span>
                                  {kw.target_url && (
                                    <a
                                      href={kw.target_url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-[9px] text-[#1B4FD8] hover:underline block mt-0.5 truncate max-w-[200px]"
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
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-[#1B4FD8] uppercase">
                                    {kw.intent}
                                  </span>
                                )}
                              </td>
                              <td className="p-3 text-right pr-4 font-bold">
                                {diff > 0 ? (
                                  <span className="text-[#22C55E] flex items-center justify-end gap-0.5">
                                    <TrendingUp size={10} /> +{diff}
                                  </span>
                                ) : diff < 0 ? (
                                  <span className="text-rose-500 flex items-center justify-end gap-0.5">
                                    <TrendingDown size={10} /> {diff}
                                  </span>
                                ) : (
                                  <span className="text-[#94A3B8]">—</span>
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
          <div className="bg-white border border-[#E2E8F4] rounded-[10px] p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3">
              <h3 className="text-sm font-bold text-[#0A1628] flex items-center gap-1.5">
                <Megaphone size={14} className="text-[#1B4FD8]" />
                Meta Ads Campaigns
              </h3>
              <span className="text-[9px] bg-blue-50 text-[#1B4FD8] px-2 py-0.5 rounded-full font-bold">
                Meta Marketing API
              </span>
            </div>

            {!metaCampaigns || metaCampaigns.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#94A3B8]">
                No Meta Campaigns synced for this account.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#E2E8F4] bg-[#F8FAFF] text-[9px] font-bold text-[#475569] uppercase tracking-wider">
                      <th className="p-3 pl-4">Campaign Name</th>
                      <th className="p-3">Period</th>
                      <th className="p-3">Budget Spent</th>
                      <th className="p-3">Clicks</th>
                      <th className="p-3">Leads</th>
                      <th className="p-3">CPL</th>
                      <th className="p-3 text-right pr-4">ROAS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F4]/50 text-xs">
                    {metaCampaigns.map((camp) => (
                      <tr key={camp.id} className="hover:bg-[#F8FAFF] text-[#475569]">
                        <td className="p-3 pl-4">
                          <div>
                            <span className="font-semibold text-[#0A1628]">{camp.campaign_name}</span>
                            {camp.notes && <p className="text-[9px] text-[#94A3B8] mt-0.5">{camp.notes}</p>}
                          </div>
                        </td>
                        <td className="p-3 font-mono">{camp.month_year}</td>
                        <td className="p-3 font-bold font-mono text-[#0A1628]">₹{(camp.budget_spent || 0).toLocaleString('en-IN')}</td>
                        <td className="p-3 font-mono">{(camp.clicks || 0).toLocaleString('en-US')}</td>
                        <td className="p-3 font-bold font-mono text-[#22C55E]">{(camp.leads || 0).toLocaleString('en-US')}</td>
                        <td className="p-3 font-bold font-mono text-[#F97316]">₹{camp.cpl ? Number(camp.cpl).toFixed(1) : '—'}</td>
                        <td className="p-3 text-right pr-4 font-mono font-bold text-[#0A1628]">{camp.roas ? `${camp.roas}x` : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Google Ads Campaigns */}
          <div className="bg-white border border-[#E2E8F4] rounded-[10px] p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3">
              <h3 className="text-sm font-bold text-[#0A1628] flex items-center gap-1.5">
                <Globe size={14} className="text-[#F97316]" />
                Google Ads Campaigns
              </h3>
              <span className="text-[9px] bg-orange-50 text-[#F97316] px-2 py-0.5 rounded-full font-bold">
                Google Ads API
              </span>
            </div>

            {!googleCampaigns || googleCampaigns.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#94A3B8]">
                No Google Campaigns synced for this account.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#E2E8F4] bg-[#F8FAFF] text-[9px] font-bold text-[#475569] uppercase tracking-wider">
                      <th className="p-3 pl-4">Campaign Name</th>
                      <th className="p-3">Period</th>
                      <th className="p-3">Spent</th>
                      <th className="p-3">Clicks</th>
                      <th className="p-3">Conversions</th>
                      <th className="p-3 text-right pr-4">Cost/Conv</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F4]/50 text-xs">
                    {googleCampaigns.map((camp) => (
                      <tr key={camp.id} className="hover:bg-[#F8FAFF] text-[#475569]">
                        <td className="p-3 pl-4">
                          <span className="font-semibold text-[#0A1628]">{camp.campaign_name}</span>
                        </td>
                        <td className="p-3 font-mono">{camp.month_year}</td>
                        <td className="p-3 font-bold font-mono text-[#0A1628]">₹{(camp.budget_spent || 0).toLocaleString('en-IN')}</td>
                        <td className="p-3 font-mono">{(camp.clicks || 0).toLocaleString('en-US')}</td>
                        <td className="p-3 font-bold font-mono text-[#22C55E]">{(camp.conversions || 0).toLocaleString('en-US')}</td>
                        <td className="p-3 text-right pr-4 font-bold font-mono text-[#F97316]">₹{camp.cost_per_conv ? Number(camp.cost_per_conv).toFixed(1) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
