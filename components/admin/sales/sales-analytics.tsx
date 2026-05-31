'use client';

import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LineChart,
  Line,
  Legend,
} from 'recharts';
import {
  Users,
  Target,
  DollarSign,
  TrendingUp,
  Award,
  BarChart2,
  Calendar,
} from 'lucide-react';
import { StatCard } from '@/components/shared/stat-card';
import { formatCurrency } from '@/lib/utils';
import { Lead } from '@/types';

interface SalesAnalyticsProps {
  leads: Lead[];
}

const CHART_COLORS = {
  primary: '#1B4FD8',   // Blue (SEO, Organic)
  secondary: '#F97316', // Orange (Finance, Ads)
  success: '#22C55E',   // Green (Growth, Wins)
  purple: '#8B5CF6',    // Purple (Social)
  cyan: '#06B6D4',      // Cyan (Email/WhatsApp)
  muted: '#4A6480',     // Gray (Baseline)
};

export function SalesAnalytics({ leads }: SalesAnalyticsProps) {
  // 1. Calculations for KPIs
  const totalLeads = leads.length;

  const wonLeads = leads.filter((l) => l.status === 'won');
  
  // Formula: (won / total * 100)%
  const conversionRate =
    totalLeads > 0 ? Math.round((wonLeads.length / totalLeads) * 100) : 0;

  const totalWonValue = wonLeads.reduce((sum, l) => sum + Number(l.estimated_value || 0), 0);
  const avgDealSize = wonLeads.length > 0 ? Math.round(totalWonValue / wonLeads.length) : 0;

  const now = new Date();
  const leadsThisMonth = leads.filter((l) => {
    const createdDate = new Date(l.created_at);
    return (
      createdDate.getMonth() === now.getMonth() && createdDate.getFullYear() === now.getFullYear()
    );
  }).length;

  // 2. Lead Source BarChart (Row 2 Left)
  // Sorted by count, horizontal bars
  const sourcesMap: Record<string, number> = {};
  leads.forEach((l) => {
    const src = l.source || 'other';
    sourcesMap[src] = (sourcesMap[src] || 0) + 1;
  });

  const sourceData = Object.entries(sourcesMap)
    .map(([source, count]) => {
      const formattedName = source.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase());
      return {
        name: formattedName,
        count,
      };
    })
    .sort((a, b) => b.count - a.count);

  // 3. Pipeline Funnel Custom Visualization (Row 2 Right)
  // Stages: New -> Contacted -> Discovery -> Proposal -> Negotiation -> Won
  const funnelStages = [
    { key: 'new', label: 'New', color: '#8B5CF6' },
    { key: 'contacted', label: 'Contacted', color: '#7C3AED' },
    { key: 'discovery', label: 'Discovery', color: '#4F46E5' },
    { key: 'proposal', label: 'Proposal', color: '#2563EB' },
    { key: 'negotiation', label: 'Negotiation', color: '#0EA5E9' },
    { key: 'won', label: 'Won', color: '#22C55E' },
  ];

  const funnelData = funnelStages.map((stage) => ({
    name: stage.label,
    count: leads.filter((l) => l.status === stage.key).length,
    color: stage.color,
  }));

  const maxFunnelCount = Math.max(...funnelData.map((d) => d.count), 1);

  // 4. Leads Over Time LineChart (Row 3 - Last 6 Months)
  // New Leads vs Won Leads
  const last6MonthsData = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = d.toLocaleString('en-US', { month: 'short' }) + ' ' + d.getFullYear();
    
    const monthLeads = leads.filter((l) => {
      const createdDate = new Date(l.created_at);
      return createdDate.getMonth() === d.getMonth() && createdDate.getFullYear() === d.getFullYear();
    });

    const newCount = monthLeads.length;
    const wonCount = monthLeads.filter((l) => l.status === 'won').length;

    last6MonthsData.push({
      name: label,
      'New Leads': newCount,
      'Won Leads': wonCount,
    });
  }

  return (
    <div className="space-y-6">
      {/* ━━━ ROW 1: STAT CARDS ━━━ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Leads"
          value={totalLeads.toLocaleString()}
          icon={Users}
        />
        <StatCard
          title="Conversion Rate"
          value={`${conversionRate}%`}
          change={conversionRate > 0 ? 5 : undefined}
          changeType="up"
          icon={TrendingUp}
        />
        <StatCard
          title="Avg Deal Size (Won)"
          value={formatCurrency(avgDealSize)}
          valueClassName="text-[#F97316]"
          icon={DollarSign}
        />
        <StatCard
          title="Leads This Month"
          value={leadsThisMonth.toLocaleString()}
          icon={Target}
        />
      </div>

      {/* ━━━ ROW 2: LEAD SOURCES & FUNNEL ━━━ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Lead Sources BarChart */}
        <div className="bg-[#0D1829] border border-[#1E3352] rounded-[10px] p-5 h-[320px] flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-[#F0F4FF] flex items-center gap-2 select-none">
              <BarChart2 size={15} className="text-[#1B4FD8]" />
              <span>Lead Sources</span>
            </h3>
            <p className="text-[10px] text-[#4A6480] uppercase tracking-wider mt-0.5 select-none">
              Acquisition channels sorted by volume
            </p>
          </div>
          
          <div className="h-[200px] mt-4 select-none">
            {sourceData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={sourceData}
                  layout="vertical"
                  margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
                >
                  <CartesianGrid stroke="#1E3352" strokeDasharray="3 3" horizontal={false} opacity={0.3} />
                  <XAxis type="number" stroke="#4A6480" fontSize={11} axisLine={false} tickLine={false} />
                  <YAxis
                    dataKey="name"
                    type="category"
                    stroke="#4A6480"
                    fontSize={11}
                    axisLine={false}
                    tickLine={false}
                    width={90}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0D1829',
                      borderColor: '#1E3352',
                      borderRadius: '8px',
                      color: '#F0F4FF',
                      fontSize: '12px',
                    }}
                  />
                  <Bar
                    dataKey="count"
                    fill="rgba(27, 79, 216, 0.15)"
                    stroke="#1B4FD8"
                    strokeWidth={1.5}
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-xs text-[#4A6480] italic">
                No lead source data available
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Custom Funnel Visualization */}
        <div className="bg-[#0D1829] border border-[#1E3352] rounded-[10px] p-5 h-[320px] flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-[#F0F4FF] flex items-center gap-2 select-none">
              <Award size={15} className="text-[#8B5CF6]" />
              <span>Pipeline Funnel</span>
            </h3>
            <p className="text-[10px] text-[#4A6480] uppercase tracking-wider mt-0.5 select-none">
              Proportional stage conversion tracking
            </p>
          </div>

          <div className="space-y-3.5 mt-4 flex-1 flex flex-col justify-center">
            {funnelData.map((stage) => {
              const widthPct = Math.round((stage.count / maxFunnelCount) * 100);

              return (
                <div key={stage.name} className="flex items-center gap-4 text-xs">
                  <div className="w-20 font-semibold text-[#8BA3C7] select-none text-left">
                    {stage.name}
                  </div>
                  <div className="flex-1 bg-[#132035] h-3 rounded-full border border-[#1E3352]/30 relative overflow-hidden flex items-center">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${widthPct || 4}%`, // Minimum width to show bar
                        background: `linear-gradient(90deg, #8B5CF6, ${stage.color})`,
                        boxShadow: `0 0 6px ${stage.color}25`,
                      }}
                    />
                  </div>
                  <div className="w-12 text-right font-mono font-bold text-[#F0F4FF] select-all">
                    {stage.count}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ━━━ ROW 3: LEADS OVER TIME LINE CHART ━━━ */}
      <div className="bg-[#0D1829] border border-[#1E3352] rounded-[10px] p-5">
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-[#F0F4FF] flex items-center gap-2 select-none">
            <Calendar size={15} className="text-[#22C55E]" />
            <span>Leads Over Time (Last 6 Months)</span>
          </h3>
          <p className="text-[10px] text-[#4A6480] uppercase tracking-wider mt-0.5 select-none">
            Comparison of prospect acquisition vs conversion rates
          </p>
        </div>

        <div className="h-[250px] select-none">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={last6MonthsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid stroke="#1E3352" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" stroke="#4A6480" fontSize={11} axisLine={false} tickLine={false} />
              <YAxis stroke="#4A6480" fontSize={11} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0D1829',
                  borderColor: '#1E3352',
                  borderRadius: '8px',
                  color: '#F0F4FF',
                  fontSize: '12px',
                }}
              />
              <Legend verticalAlign="top" height={36} iconSize={10} style={{ fontSize: '11px' }} />
              <Line
                type="monotone"
                dataKey="New Leads"
                stroke={CHART_COLORS.primary}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="Won Leads"
                stroke={CHART_COLORS.success}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
export default SalesAnalytics;
