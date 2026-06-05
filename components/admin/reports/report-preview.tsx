// components/admin/reports/report-preview.tsx
'use client';

import React from 'react';
import { Client, SeoCampaign, SeoKeyword, MetaCampaign, GoogleAdsCampaign, SocialMediaMetrics } from '@/types';
import { 
  Globe, 
  Search, 
  Facebook, 
  Instagram, 
  TrendingUp, 
  Award, 
  ChevronRight, 
  CheckCircle,
  BarChart,
  Target
} from 'lucide-react';

interface ReportPreviewProps {
  client: Client;
  monthYear: string;
  seoData: SeoCampaign | null;
  keywordsData: SeoKeyword[];
  metaData: MetaCampaign[];
  googleAdsData: GoogleAdsCampaign[];
  socialData: SocialMediaMetrics[];
}

export function ReportPreview({
  client,
  monthYear,
  seoData,
  keywordsData,
  metaData,
  googleAdsData,
  socialData
}: ReportPreviewProps) {
  // Aggregate Meta Ads stats
  const metaSpend = metaData.reduce((acc, c) => acc + Number(c.budget_spent || 0), 0);
  const metaLeads = metaData.reduce((acc, c) => acc + Number(c.leads || 0), 0);
  const metaClicks = metaData.reduce((acc, c) => acc + Number(c.clicks || 0), 0);
  const metaImpressions = metaData.reduce((acc, c) => acc + Number(c.impressions || 0), 0);
  const metaAvgCpl = metaLeads > 0 ? (metaSpend / metaLeads) : 0;
  const metaAvgCtr = metaImpressions > 0 ? ((metaClicks / metaImpressions) * 100) : 0;

  // Aggregate Google Ads stats
  const gadsSpend = googleAdsData.reduce((acc, c) => acc + Number(c.budget_spent || 0), 0);
  const gadsConvs = googleAdsData.reduce((acc, c) => acc + Number(c.conversions || 0), 0);
  const gadsClicks = googleAdsData.reduce((acc, c) => acc + Number(c.clicks || 0), 0);
  const gadsImpressions = googleAdsData.reduce((acc, c) => acc + Number(c.impressions || 0), 0);
  const gadsCostPerConv = gadsConvs > 0 ? (gadsSpend / gadsConvs) : 0;
  const gadsAvgCtr = gadsImpressions > 0 ? ((gadsClicks / gadsImpressions) * 100) : 0;

  const totalAdSpend = metaSpend + gadsSpend;
  const totalLeadsConversions = metaLeads + gadsConvs;

  return (
    <div className="bg-white text-[#0A1628] rounded-2xl shadow-xl border border-slate-200 p-6 md:p-10 max-w-5xl mx-auto font-sans leading-normal">
      {/* Report Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-200 pb-8 mb-8 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-blue-700 to-indigo-800 bg-clip-text text-transparent">
              VELOXIS GLOBAL
            </span>
            <span className="text-[10px] bg-blue-100 text-blue-800 font-semibold px-2 py-0.5 rounded">
              Performance Report
            </span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">{client.name}</h1>
          <p className="text-sm text-slate-500 mt-1">{client.company || 'Digital Presence Snapshot'}</p>
        </div>
        <div className="text-left md:text-right bg-slate-50 p-4 rounded-xl border border-slate-100 min-w-[200px]">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Reporting Period</span>
          <span className="text-lg font-bold text-slate-900">{monthYear}</span>
          <span className="text-xs text-slate-500 block mt-0.5">Published via Portal</span>
        </div>
      </div>

      {/* Executive Summary Section */}
      <div className="mb-10">
        <h2 className="text-lg font-bold text-slate-900 border-b border-slate-200 pb-2 mb-4 flex items-center gap-2">
          <Award className="w-5 h-5 text-indigo-600" />
          Executive Summary
        </h2>
        <div className="bg-slate-50 rounded-xl p-5 border border-slate-100 text-sm text-slate-600 leading-relaxed">
          During <span className="font-semibold text-slate-900">{monthYear}</span>, marketing channels registered solid performance. Our active digital marketing scope covered 
          {client.services && client.services.length > 0 ? (
            <span className="font-semibold text-slate-900"> {client.services.join(', ')}</span>
          ) : (
            <span> complete search and ads optimizations</span>
          )}. 
          Below is a detailed breakdown of Search Engine Optimization (SEO) organic traffic growth, PPC Campaigns performance across Google & Meta, and Social Media engagement.
        </div>
      </div>

      {/* Section: Search Engine Optimization */}
      {seoData && (
        <div className="mb-10">
          <h2 className="text-lg font-bold text-slate-900 border-b border-slate-200 pb-2 mb-4 flex items-center gap-2">
            <Globe className="w-5 h-5 text-blue-600" />
            Organic Search & SEO
          </h2>

          {/* Grid Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Organic Traffic</span>
              <span className="text-2xl font-extrabold text-slate-900 block mt-1">
                {(seoData.organic_traffic ?? 0).toLocaleString()}
              </span>
              {seoData.organic_traffic_prev > 0 && (
                <span className="text-[10px] font-medium text-emerald-600 mt-1 block">
                  +{(((seoData.organic_traffic - seoData.organic_traffic_prev) / seoData.organic_traffic_prev) * 100).toFixed(1)}% growth
                </span>
              )}
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">GSC Clicks</span>
              <span className="text-2xl font-extrabold text-slate-900 block mt-1">
                {(seoData.gsc_clicks ?? 0).toLocaleString()}
              </span>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">GSC Impressions</span>
              <span className="text-2xl font-extrabold text-slate-900 block mt-1">
                {(seoData.gsc_impressions ?? 0).toLocaleString()}
              </span>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Average Position</span>
              <span className="text-2xl font-extrabold text-slate-900 block mt-1">
                {seoData.gsc_avg_position ?? 'N/A'}
              </span>
              <span className="text-[10px] text-slate-400 block mt-1">Across all keywords</span>
            </div>
          </div>

          {/* Keywords Table */}
          {keywordsData.length > 0 && (
            <div className="border border-slate-200 rounded-xl overflow-hidden mb-4">
              <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 text-xs font-bold text-slate-700">
                Top Performing Organic Keywords
              </div>
              <table className="w-full text-xs text-slate-600 text-left">
                <thead className="bg-slate-100 text-slate-800 uppercase text-[10px] border-b border-slate-200 font-bold">
                  <tr>
                    <th className="px-4 py-2.5">Target Keyword</th>
                    <th className="px-4 py-2.5 text-center">Rank</th>
                    <th className="px-4 py-2.5 text-center">Search Volume</th>
                    <th className="px-4 py-2.5 text-right">Intent</th>
                  </tr>
                </thead>
                <tbody>
                  {keywordsData.map((kw, i) => (
                    <tr key={i} className="border-b border-slate-100 hover:bg-slate-50/50">
                      <td className="px-4 py-2.5 text-slate-900 font-semibold">{kw.keyword}</td>
                      <td className="px-4 py-2.5 text-center font-bold text-indigo-600">{kw.current_position ?? 'N/A'}</td>
                      <td className="px-4 py-2.5 text-center">{kw.search_volume?.toLocaleString() ?? 'N/A'}</td>
                      <td className="px-4 py-2.5 text-right capitalize">
                        <span className="px-2 py-0.5 rounded-full text-[9px] bg-slate-100 text-slate-600 font-medium">
                          {kw.intent || 'General'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Section: Paid Advertising */}
      {(metaData.length > 0 || googleAdsData.length > 0) && (
        <div className="mb-10">
          <h2 className="text-lg font-bold text-slate-900 border-b border-slate-200 pb-2 mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-rose-600" />
            Paid Advertising (PPC)
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Ad Budget Spent</span>
              <span className="text-2xl font-extrabold text-slate-900 block mt-1">
                ₹{totalAdSpend.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </span>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Leads & Conversions</span>
              <span className="text-2xl font-extrabold text-emerald-600 block mt-1">
                {totalLeadsConversions}
              </span>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Average Acquisition Cost</span>
              <span className="text-2xl font-extrabold text-indigo-600 block mt-1">
                ₹{totalLeadsConversions > 0 ? (totalAdSpend / totalLeadsConversions).toFixed(0) : '0'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Meta Ads Breakdown */}
            {metaData.length > 0 && (
              <div className="border border-slate-200 rounded-xl p-5 space-y-4">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5 border-b border-slate-100 pb-2">
                  <Facebook className="w-4 h-4 text-blue-600" />
                  Meta Ads Campaigns
                </h3>
                <div className="space-y-2 text-sm text-slate-600">
                  <div className="flex justify-between">
                    <span>Ad Spend:</span>
                    <span className="font-semibold text-slate-900">₹{metaSpend.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Impressions:</span>
                    <span>{metaImpressions.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Clicks:</span>
                    <span>{metaClicks.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Conversions/Leads:</span>
                    <span className="font-bold text-emerald-600">{metaLeads}</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-100 pt-2 font-semibold">
                    <span>Cost Per Lead (CPL):</span>
                    <span className="text-indigo-600">₹{metaAvgCpl.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Google Ads Breakdown */}
            {googleAdsData.length > 0 && (
              <div className="border border-slate-200 rounded-xl p-5 space-y-4">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5 border-b border-slate-100 pb-2">
                  <Globe className="w-4 h-4 text-yellow-600" />
                  Google Ads Campaigns
                </h3>
                <div className="space-y-2 text-sm text-slate-600">
                  <div className="flex justify-between">
                    <span>Ad Spend:</span>
                    <span className="font-semibold text-slate-900">₹{gadsSpend.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Impressions:</span>
                    <span>{gadsImpressions.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Clicks:</span>
                    <span>{gadsClicks.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Conversions:</span>
                    <span className="font-bold text-emerald-600">{gadsConvs}</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-100 pt-2 font-semibold">
                    <span>Cost Per Conv (CPC):</span>
                    <span className="text-indigo-600">₹{gadsCostPerConv.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Section: Social Media Organic */}
      {socialData.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-bold text-slate-900 border-b border-slate-200 pb-2 mb-4 flex items-center gap-2">
            <Instagram className="w-5 h-5 text-pink-600" />
            Social Media & Content
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {socialData.map((s, i) => (
              <div key={i} className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-indigo-700 capitalize tracking-wide">{s.platform}</span>
                  {s.platform === 'instagram' ? (
                    <Instagram className="w-4 h-4 text-pink-500" />
                  ) : s.platform === 'facebook' ? (
                    <Facebook className="w-4 h-4 text-blue-600" />
                  ) : (
                    <Globe className="w-4 h-4 text-slate-400" />
                  )}
                </div>
                <div className="space-y-1.5 text-xs text-slate-600">
                  <div className="flex justify-between">
                    <span>Followers:</span>
                    <span className="font-bold text-slate-900">{s.followers?.toLocaleString() || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>New Followers:</span>
                    <span className="text-emerald-600 font-semibold">+{s.new_followers?.toLocaleString() || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Reach:</span>
                    <span>{s.reach?.toLocaleString() || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Impressions:</span>
                    <span>{s.impressions?.toLocaleString() || 0}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Report Footer */}
      <div className="border-t border-slate-200 pt-8 mt-12 flex flex-col md:flex-row justify-between items-center text-xs text-slate-400 gap-4">
        <div>
          This performance audit was generated automatically from integrated channel APIs.
        </div>
        <div className="font-semibold text-slate-600 flex items-center gap-1">
          <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
          Veloxis Global Operations Department
        </div>
      </div>
    </div>
  );
}
