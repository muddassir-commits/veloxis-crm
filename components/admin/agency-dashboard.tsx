'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  AreaChart,
  Area,
  BarChart,
  Bar,
  ComposedChart,
  ReferenceLine,
} from 'recharts';
import {
  TrendingUp,
  Search,
  Plus,
  Globe,
  Share2,
  Target,
  Mail,
  MessageSquare,
  AlertCircle,
  Award,
  DollarSign,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatCard } from '@/components/shared/stat-card';
import { StatusBadge } from '@/components/shared/status-badge';
import { DataTable } from '@/components/shared/data-table';
import { formatCurrency } from '@/lib/utils';
import {
  SeoCampaign,
  SeoKeyword,
  SocialMediaMetrics,
  AgencyWhatsappCampaign,
  AgencyEmailCampaign,
  AgencyOwnAdCampaign,
} from '@/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

// Color system configuration from DESIGN_SYSTEM.md
const CHART_COLORS = {
  primary: '#1B4FD8',   // Blue (SEO, Organic)
  secondary: '#F97316', // Orange (Finance, Ads)
  success: '#22C55E',   // Green (Growth, Wins)
  purple: '#8B5CF6',    // Purple (Social)
  cyan: '#06B6D4',      // Cyan (Email/WhatsApp)
  muted: '#4A6480',     // Gray (Baseline)
};

const PIE_COLORS = [
  CHART_COLORS.primary,   // Organic
  CHART_COLORS.secondary, // Direct
  CHART_COLORS.purple,    // Social
  CHART_COLORS.success,   // Paid
  CHART_COLORS.cyan,      // Referral
  '#F59E0B',              // Email
];

interface AgencyDashboardProps {
  clientId: string;
  seoCampaigns: SeoCampaign[] | null;
  seoKeywords: SeoKeyword[] | null;
  socialMetrics: SocialMediaMetrics[] | null;
  whatsappCampaigns: AgencyWhatsappCampaign[] | null;
  emailCampaigns: AgencyEmailCampaign[] | null;
  adCampaigns: AgencyOwnAdCampaign[] | null;
}

export function AgencyDashboard({
  clientId,
  seoCampaigns,
  seoKeywords,
  socialMetrics,
  whatsappCampaigns,
  emailCampaigns,
  adCampaigns,
}: AgencyDashboardProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('overview');
  const [socialPlatform, setSocialPlatform] = useState('all');
  const [adsPlatform, setAdsPlatform] = useState('all');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal open states
  const [modalOpen, setModalOpen] = useState<{
    social: boolean;
    ad: boolean;
    email: boolean;
    whatsapp: boolean;
  }>({
    social: false,
    ad: false,
    email: false,
    whatsapp: false,
  });

  // Modal form states
  const [socialForm, setSocialForm] = useState({
    platform: 'instagram',
    month_year: 'Jun 2026',
    followers: '',
    new_followers: '',
    reach: '',
    impressions: '',
    engagements: '',
    posts_published: '',
    profile_visits: '',
    website_clicks: '',
  });

  const [adForm, setAdForm] = useState({
    platform: 'meta',
    campaign_name: '',
    campaign_id: '',
    month_year: 'Jun 2026',
    objective: 'lead_gen',
    budget_allocated: '',
    budget_spent: '',
    impressions: '',
    clicks: '',
    leads: '',
    notes: '',
    status: 'active',
  });

  const [emailForm, setEmailForm] = useState({
    name: '',
    subject: '',
    month_year: 'Jun 2026',
    campaign_type: 'newsletter',
    provider: 'resend',
    emails_sent: '',
    delivered: '',
    opened: '',
    clicked: '',
    unsubscribed: '',
    bounced: '',
    notes: '',
  });

  const [whatsappForm, setWhatsappForm] = useState({
    name: '',
    month_year: 'Jun 2026',
    campaign_type: 'broadcast',
    template_name: '',
    messages_sent: '',
    delivered: '',
    read_count: '',
    replied: '',
    notes: '',
  });

  // Generate date ranges for Sparklines
  const now = new Date();
  const last6Months: Array<{ name: string; monthYear: string }> = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const my = `${months[d.getMonth()]} ${d.getFullYear()}`;
    const label = d.toLocaleDateString('en-US', { month: 'short' });
    last6Months.push({ name: label, monthYear: my });
  }

  // 1. Calculations: SEO Metrics (Traffic, Keywords)
  const latestSeo = seoCampaigns && seoCampaigns.length > 0 ? seoCampaigns[0] : null;
  const trafficVal = latestSeo?.organic_traffic || 0;
  const keywordsVal = latestSeo?.keywords_top10 || 0;

  const trafficSparkline = last6Months.map((m) => {
    const match = seoCampaigns?.find((s) => s.month_year === m.monthYear);
    return { value: match ? Number(match.organic_traffic || 0) : 0 };
  });

  const keywordsSparkline = last6Months.map((m) => {
    const match = seoCampaigns?.find((s) => s.month_year === m.monthYear);
    return { value: match ? Number(match.keywords_top10 || 0) : 0 };
  });

  // 2. Calculations: Social Metrics
  const instagramMetrics = socialMetrics?.filter((s) => s.platform === 'instagram') || [];
  const latestInsta = instagramMetrics.length > 0 ? instagramMetrics[0] : null;
  const followersVal = latestInsta?.followers || 0;

  const socialSparkline = last6Months.map((m) => {
    const match = socialMetrics?.find((s) => s.month_year === m.monthYear && s.platform === 'instagram');
    return { value: match ? Number(match.followers || 0) : 0 };
  });

  // 3. Calculations: Paid Ads Metrics
  const adLeadsSparkline = last6Months.map((m) => {
    const matches = adCampaigns?.filter((c) => c.month_year === m.monthYear) || [];
    const sumLeads = matches.reduce((sum, c) => sum + Number(c.leads || 0), 0);
    return { value: sumLeads };
  });

  const currentMonthAds = adCampaigns?.filter((c) => c.month_year === 'Jun 2026') || [];
  const totalLeads = currentMonthAds.reduce((sum, c) => sum + Number(c.leads || 0), 0);
  const totalAdSpent = currentMonthAds.reduce((sum, c) => sum + Number(c.budget_spent || 0), 0);
  const avgCplVal = totalLeads > 0 ? Math.round(totalAdSpent / totalLeads) : 0;

  // 4. Calculations: Email Metrics
  const emailOpenSparkline = last6Months.map((m) => {
    const matches = emailCampaigns?.filter((c) => c.month_year === m.monthYear) || [];
    const avgOpen = matches.length > 0 ? (matches.reduce((sum, c) => sum + Number(c.open_rate || 0), 0) / matches.length) : 0;
    return { value: Number(avgOpen.toFixed(1)) };
  });

  const currentMonthEmails = emailCampaigns?.filter((c) => c.month_year === 'Jun 2026') || [];
  const emailOpenRateVal = currentMonthEmails.length > 0
    ? Number((currentMonthEmails.reduce((sum, c) => sum + Number(c.open_rate || 0), 0) / currentMonthEmails.length).toFixed(1))
    : 0;

  // 5. Calculations: WhatsApp Metrics
  const whatsappSentSparkline = last6Months.map((m) => {
    const matches = whatsappCampaigns?.filter((c) => c.month_year === m.monthYear) || [];
    const sumSent = matches.reduce((sum, c) => sum + Number(c.messages_sent || 0), 0);
    return { value: sumSent };
  });

  const currentMonthWa = whatsappCampaigns?.filter((c) => c.month_year === 'Jun 2026') || [];
  const waSentVal = currentMonthWa.reduce((sum, c) => sum + Number(c.messages_sent || 0), 0);

  // Render Inline Sparkline Utility
  const renderSparkline = (data: Array<{ value: number }>, color: string) => {
    return (
      <div className="w-[60px] h-[30px] select-none">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <Line
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  };

  // Submit Handler for logging campaigns
  const handleLogSubmit = async (type: 'social' | 'ad' | 'email' | 'whatsapp') => {
    setIsSubmitting(true);
    let payload = {};

    if (type === 'social') {
      payload = { ...socialForm, client_id: clientId };
    } else if (type === 'ad') {
      payload = adForm;
    } else if (type === 'email') {
      payload = emailForm;
    } else if (type === 'whatsapp') {
      payload = whatsappForm;
    }

    try {
      const res = await fetch('/api/admin/agency/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, payload }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit log entry.');

      toast.success(`${type.toUpperCase()} campaign data logged successfully.`);
      
      // Close modal
      setModalOpen((prev) => ({ ...prev, [type]: false }));
      
      // Refresh page
      router.refresh();
    } catch (err: unknown) {
      console.error(err);
      const message = err instanceof Error ? err.message : 'Server error occurred.';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Setup overview channel score aggregates
  // SEO target: 500 visitors, Social target: 2000 followers, CPL target: 400 INR, Email open target: 40%, WhatsApp read target: 70%
  const seoScore = trafficVal > 0 ? Math.min(100, Math.round((trafficVal / 500) * 100)) : 0;
  const socialScore = followersVal > 0 ? Math.min(100, Math.round((followersVal / 2000) * 100)) : 0;
  const adsScore = avgCplVal > 0 ? (avgCplVal <= 400 ? 100 : Math.max(0, Math.round((400 / avgCplVal) * 100))) : 0;
  const emailScore = emailOpenRateVal > 0 ? Math.min(100, Math.round((emailOpenRateVal / 40) * 100)) : 0;
  const waReadRate = currentMonthWa.length > 0 ? (currentMonthWa.reduce((sum, c) => sum + Number(c.read_rate || 0), 0) / currentMonthWa.length) : 0;
  const whatsappScore = waReadRate > 0 ? Math.min(100, Math.round((waReadRate / 70) * 100)) : 0;

  const radarData = [
    { subject: 'SEO', score: seoScore || 20, fullMark: 100 },
    { subject: 'Social', score: socialScore || 40, fullMark: 100 },
    { subject: 'Meta Ads', score: adsScore || 30, fullMark: 100 },
    { subject: 'Google Ads', score: 85, fullMark: 100 },
    { subject: 'Email', score: emailScore || 50, fullMark: 100 },
    { subject: 'WhatsApp', score: whatsappScore || 60, fullMark: 100 },
  ];

  // Dummy sources for traffic sources pie chart
  const trafficSourcesData = [
    { name: 'Organic', value: trafficVal || 350 },
    { name: 'Direct', value: 120 },
    { name: 'Social', value: 80 },
    { name: 'Paid Ads', value: 90 },
    { name: 'Referral', value: 30 },
    { name: 'Email', value: 20 },
  ];

  return (
    <div className="space-y-6">
      {/* ━━━ SECTION 1: TOP KPI STRIP ━━━ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
        {/* KPI 1 — Organic Traffic */}
        <div className="bg-[#0D1829] border border-[#1E3352] rounded-[10px] p-4 flex flex-col justify-between h-[100px] hover:border-[#1A2D47] transition-all">
          <div>
            <div className="text-[10px] uppercase font-bold text-[#4A6480] tracking-wider select-none">
              Organic Traffic
            </div>
            <div className="text-xl font-bold font-mono text-[#F0F4FF] mt-1 select-all">
              {trafficVal.toLocaleString()}
            </div>
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-[10px] text-[#22C55E] font-semibold select-none">
              {latestSeo && latestSeo.organic_traffic_prev
                ? `${latestSeo.organic_traffic >= latestSeo.organic_traffic_prev ? '↑' : '↓'} ${Math.round(
                    ((latestSeo.organic_traffic - latestSeo.organic_traffic_prev) /
                      latestSeo.organic_traffic_prev) *
                      100
                  )}%`
                : 'Steady'}
            </span>
            {renderSparkline(trafficSparkline, CHART_COLORS.primary)}
          </div>
        </div>

        {/* KPI 2 — Keywords Top 10 */}
        <div className="bg-[#0D1829] border border-[#1E3352] rounded-[10px] p-4 flex flex-col justify-between h-[100px] hover:border-[#1A2D47] transition-all">
          <div>
            <div className="text-[10px] uppercase font-bold text-[#4A6480] tracking-wider select-none">
              Keywords Top 10
            </div>
            <div className="text-xl font-bold font-mono text-[#F0F4FF] mt-1 select-all">
              {keywordsVal}
            </div>
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-[10px] text-[#8BA3C7]/60 select-none">Tracked Search Term</span>
            {renderSparkline(keywordsSparkline, CHART_COLORS.success)}
          </div>
        </div>

        {/* KPI 3 — Instagram Followers */}
        <div className="bg-[#0D1829] border border-[#1E3352] rounded-[10px] p-4 flex flex-col justify-between h-[100px] hover:border-[#1A2D47] transition-all">
          <div>
            <div className="text-[10px] uppercase font-bold text-[#4A6480] tracking-wider select-none">
              Insta Followers
            </div>
            <div className="text-xl font-bold font-mono text-[#F0F4FF] mt-1 select-all">
              {followersVal.toLocaleString()}
            </div>
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-[10px] text-[#8B5CF6] font-semibold select-none">Instagram Brand</span>
            {renderSparkline(socialSparkline, CHART_COLORS.purple)}
          </div>
        </div>

        {/* KPI 4 — Total Ad Leads */}
        <div className="bg-[#0D1829] border border-[#1E3352] rounded-[10px] p-4 flex flex-col justify-between h-[100px] hover:border-[#1A2D47] transition-all">
          <div>
            <div className="text-[10px] uppercase font-bold text-[#4A6480] tracking-wider select-none">
              Ad Leads (Mo)
            </div>
            <div className="text-xl font-bold font-mono text-[#F0F4FF] mt-1 select-all">
              {totalLeads}
            </div>
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-[10px] text-[#F97316] font-mono font-semibold select-none">
              {avgCplVal > 0 ? `₹${avgCplVal} CPL` : 'No spend'}
            </span>
            {renderSparkline(adLeadsSparkline, CHART_COLORS.secondary)}
          </div>
        </div>

        {/* KPI 5 — Email Open Rate */}
        <div className="bg-[#0D1829] border border-[#1E3352] rounded-[10px] p-4 flex flex-col justify-between h-[100px] hover:border-[#1A2D47] transition-all">
          <div>
            <div className="text-[10px] uppercase font-bold text-[#4A6480] tracking-wider select-none">
              Email Open Rate
            </div>
            <div className="text-xl font-bold font-mono text-[#F0F4FF] mt-1 select-all">
              {emailOpenRateVal}%
            </div>
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-[10px] text-[#8BA3C7]/60 select-none">Resend Campaigns</span>
            {renderSparkline(emailOpenSparkline, CHART_COLORS.cyan)}
          </div>
        </div>

        {/* KPI 6 — WA Messages Sent */}
        <div className="bg-[#0D1829] border border-[#1E3352] rounded-[10px] p-4 flex flex-col justify-between h-[100px] hover:border-[#1A2D47] transition-all">
          <div>
            <div className="text-[10px] uppercase font-bold text-[#4A6480] tracking-wider select-none">
              WA Messages Sent
            </div>
            <div className="text-xl font-bold font-mono text-[#F0F4FF] mt-1 select-all">
              {waSentVal.toLocaleString()}
            </div>
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-[10px] text-[#22C55E] font-semibold select-none">WhatsApp Bot</span>
            {renderSparkline(whatsappSentSparkline, CHART_COLORS.success)}
          </div>
        </div>
      </div>

      {/* ━━━ SECTION 2: TABBED DEPARTMENT VIEW ━━━ */}
      <div className="space-y-4">
        {/* Navigation Tabs Header */}
        <div className="border-b border-[#1E3352] flex items-center gap-2 select-none overflow-x-auto">
          {['overview', 'seo', 'social', 'ads', 'email', 'whatsapp'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider border-b-2 cursor-pointer transition-all ${
                activeTab === tab
                  ? 'border-[#1B4FD8] text-[#F0F4FF]'
                  : 'border-transparent text-[#8BA3C7] hover:text-[#F0F4FF]'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab contents */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
            {/* Left 65% Column — Radar Chart */}
            <div className="lg:col-span-6 bg-[#0D1829] border border-[#1E3352] rounded-[10px] p-5 flex flex-col justify-between h-[380px]">
              <div>
                <h3 className="text-sm font-semibold text-[#F0F4FF] select-none flex items-center gap-2">
                  <Award size={15} className="text-[#1B4FD8]" />
                  <span>All Channels Performance (Scores)</span>
                </h3>
                <p className="text-[10px] text-[#4A6480] mt-0.5 select-none uppercase tracking-wide">
                  Target vs Actual Performance Scores
                </p>
              </div>
              <div className="flex-1 flex justify-center items-center">
                <ResponsiveContainer width="100%" height={260}>
                  <RadarChart cx="50%" cy="50%" outerRadius={85} data={radarData}>
                    <PolarGrid stroke="#1E3352" />
                    <PolarAngleAxis dataKey="subject" stroke="#4A6480" fontSize={10} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#4A6480" fontSize={9} />
                    <Radar
                      name="Veloxis Score"
                      dataKey="score"
                      stroke={CHART_COLORS.primary}
                      fill={CHART_COLORS.primary}
                      fillOpacity={0.15}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Right 35% Column — KPIs and Traffic Pie */}
            <div className="lg:col-span-4 space-y-6">
              {/* Target KPIs */}
              <div className="bg-[#0D1829] border border-[#1E3352] rounded-[10px] p-5 space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#4A6480] select-none">
                  Monthly Growth Target KPIs
                </h3>
                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between border-b border-[#1E3352]/20 pb-2">
                    <span className="text-[#8BA3C7]">New Leads</span>
                    <span className="text-[#F0F4FF] font-semibold select-all">8 / 20 leads (🟡)</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-[#1E3352]/20 pb-2">
                    <span className="text-[#8BA3C7]">Website Traffic</span>
                    <span className="text-[#F0F4FF] font-semibold select-all">{trafficVal} / 500 visits (🟡)</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-[#1E3352]/20 pb-2">
                    <span className="text-[#8BA3C7]">Insta Followers</span>
                    <span className="text-[#F0F4FF] font-semibold select-all">+{socialMetrics?.length ? socialMetrics[0].new_followers : 0} / +100 (🟡)</span>
                  </div>
                  <div className="flex items-center justify-between pb-1">
                    <span className="text-[#8BA3C7]">Clients Won</span>
                    <span className="text-[#EF4444] font-semibold select-all">0 / 2 clients (🔴)</span>
                  </div>
                </div>
              </div>

              {/* Traffic Sources Pie */}
              <div className="bg-[#0D1829] border border-[#1E3352] rounded-[10px] p-5 flex flex-col justify-between h-[210px]">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#4A6480] select-none">
                  Organic vs Referral Traffic Sources
                </h3>
                <div className="flex-1 flex items-center justify-between select-none">
                  <div className="w-[120px] h-[120px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={trafficSourcesData}
                          cx="50%"
                          cy="50%"
                          innerRadius={30}
                          outerRadius={50}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {trafficSourcesData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-col gap-1 text-[10px]">
                    {trafficSourcesData.map((entry, index) => (
                      <div key={entry.name} className="flex items-center gap-1.5 text-[#8BA3C7]">
                        <span
                          className="h-2 w-2 rounded-full shrink-0"
                          style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}
                        />
                        <span className="truncate">{entry.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: SEO CAMPAIGN */}
        {activeTab === 'seo' && (
          <div className="space-y-6">
            {/* Stat Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard title="GSC Clicks" value={latestSeo?.gsc_clicks?.toLocaleString() || '0'} icon={Search} />
              <StatCard title="GSC Impressions" value={latestSeo?.gsc_impressions?.toLocaleString() || '0'} icon={Globe} />
              <StatCard title="GSC CTR %" value={latestSeo?.gsc_ctr ? `${latestSeo.gsc_ctr}%` : '0%'} icon={TrendingUp} />
              <StatCard title="Avg Position" value={latestSeo?.gsc_avg_position || '-'} icon={TrendingUp} />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Traffic Area Chart */}
              <div className="bg-[#0D1829] border border-[#1E3352] rounded-[10px] p-5 h-[280px]">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#4A6480] select-none mb-4">
                  Organic Traffic (Last 6 Months)
                </h4>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={seoCampaigns || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="trafficGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.15} />
                          <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="#1E3352" strokeDasharray="3 3" vertical={false} opacity={0.3} />
                      <XAxis dataKey="month_year" stroke="#4A6480" fontSize={10} axisLine={false} tickLine={false} />
                      <YAxis stroke="#4A6480" fontSize={10} axisLine={false} tickLine={false} />
                      <Tooltip />
                      <Area
                        type="monotone"
                        dataKey="organic_traffic"
                        stroke={CHART_COLORS.primary}
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#trafficGrad)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Keyword Position Distribution */}
              <div className="bg-[#0D1829] border border-[#1E3352] rounded-[10px] p-5 h-[280px]">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#4A6480] select-none mb-4">
                  Keyword Position Distribution
                </h4>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={[
                        {
                          name: 'Top 3',
                          count: seoKeywords?.filter((k) => k.current_position !== null && k.current_position <= 3).length || 0,
                          fill: '#22C55E',
                        },
                        {
                          name: '4-10',
                          count:
                            seoKeywords?.filter(
                              (k) => k.current_position !== null && k.current_position > 3 && k.current_position <= 10
                            ).length || 0,
                          fill: '#1B4FD8',
                        },
                        {
                          name: '11-20',
                          count:
                            seoKeywords?.filter(
                              (k) => k.current_position !== null && k.current_position > 10 && k.current_position <= 20
                            ).length || 0,
                          fill: '#F59E0B',
                        },
                        {
                          name: '20+',
                          count: seoKeywords?.filter((k) => k.current_position !== null && k.current_position > 20).length || 0,
                          fill: '#EF4444',
                        },
                      ]}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <CartesianGrid stroke="#1E3352" strokeDasharray="3 3" vertical={false} opacity={0.3} />
                      <XAxis dataKey="name" stroke="#4A6480" fontSize={10} axisLine={false} tickLine={false} />
                      <YAxis stroke="#4A6480" fontSize={10} axisLine={false} tickLine={false} />
                      <Tooltip />
                      <Bar dataKey="count">
                        {[0, 1, 2, 3].map((entry, index) => {
                          const fills = ['#22C55E', '#1B4FD8', '#F59E0B', '#EF4444'];
                          return <Cell key={`cell-${index}`} fill={fills[index]} />;
                        })}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Keyword Rankings Table */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#4A6480] select-none">
                SEO Targeted Keywords Rankings
              </h4>
              <DataTable
                columns={[
                  { key: 'keyword', header: 'Keyword', width: '30%' },
                  { key: 'current_position', header: 'Current Position', width: '20%' },
                  {
                    key: 'change',
                    header: 'Change',
                    width: '20%',
                    render: (val, row) => {
                      const curr = Number(row.current_position || 0);
                      const prev = Number(row.previous_position || 0);
                      if (!prev) return <span className="text-[#8BA3C7]">-</span>;
                      const diff = prev - curr; // position decrease is positive (e.g. 5 to 3 is improvement of 2)
                      if (diff > 0) return <span className="text-[#22C55E] font-semibold">↑ {diff}</span>;
                      if (diff < 0) return <span className="text-[#EF4444] font-semibold">↓ {Math.abs(diff)}</span>;
                      return <span className="text-[#8BA3C7]">No change</span>;
                    },
                  },
                  { key: 'search_volume', header: 'Search Volume', width: '15%' },
                  {
                    key: 'intent',
                    header: 'Status',
                    width: '15%',
                    render: (val, row) => {
                      const pos = Number(row.current_position || 0);
                      if (pos <= 10) return <StatusBadge status="paid" />; // Active/Approved style
                      return <StatusBadge status="pending" />;
                    },
                  },
                ]}
                data={(seoKeywords as unknown as Record<string, unknown>[]) || []}
                emptyState={{
                  icon: Search,
                  title: 'No SEO Keywords Logged',
                  description: 'Start adding targeted SEO search phrases to display client ranking positions.',
                }}
              />
            </div>
          </div>
        )}

        {/* TAB 3: SOCIAL MEDIA */}
        {activeTab === 'social' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between select-none">
              <div className="flex items-center gap-1 bg-[#132035] border border-[#1E3352] p-0.5 rounded">
                {['all', 'instagram', 'facebook', 'linkedin'].map((plat) => (
                  <button
                    key={plat}
                    onClick={() => setSocialPlatform(plat)}
                    className={`px-3 py-1 rounded text-[10px] font-semibold uppercase cursor-pointer transition-all ${
                      socialPlatform === plat
                        ? 'bg-[#1B4FD8] text-[#F0F4FF]'
                        : 'text-[#8BA3C7] hover:text-[#F0F4FF]'
                    }`}
                  >
                    {plat}
                  </button>
                ))}
              </div>

              <Button
                onClick={() => setModalOpen((prev) => ({ ...prev, social: true }))}
                size="sm"
                className="bg-[#1B4FD8] hover:bg-[#2563EB] text-white text-xs h-8 gap-1 cursor-pointer font-semibold"
              >
                <Plus size={13} />
                <span>Log Social Data</span>
              </Button>
            </div>

            {/* Followers Trend Chart */}
            <div className="bg-[#0D1829] border border-[#1E3352] rounded-[10px] p-5 h-[280px]">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#4A6480] select-none mb-4">
                Follower Growth Metrics ({socialPlatform.toUpperCase()})
              </h4>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={
                      socialPlatform === 'all'
                        ? socialMetrics || []
                        : socialMetrics?.filter((s) => s.platform === socialPlatform) || []
                    }
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid stroke="#1E3352" strokeDasharray="3 3" vertical={false} opacity={0.3} />
                    <XAxis dataKey="month_year" stroke="#4A6480" fontSize={10} axisLine={false} tickLine={false} />
                    <YAxis stroke="#4A6480" fontSize={10} axisLine={false} tickLine={false} />
                    <Tooltip />
                    <Legend verticalAlign="bottom" height={36} iconSize={10} fontSize={10} />
                    {socialPlatform === 'all' ? (
                      <>
                        <Line
                          type="monotone"
                          dataKey="followers"
                          name="Total Followers"
                          stroke={CHART_COLORS.purple}
                          strokeWidth={2}
                          dot={false}
                        />
                        <Line
                          type="monotone"
                          dataKey="reach"
                          name="Impressions Reach"
                          stroke={CHART_COLORS.primary}
                          strokeWidth={2}
                          dot={false}
                        />
                      </>
                    ) : (
                      <Line
                        type="monotone"
                        dataKey="followers"
                        name={`${socialPlatform} followers`}
                        stroke={CHART_COLORS.purple}
                        strokeWidth={2}
                        dot={false}
                      />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Metrics List */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#4A6480] select-none">
                Logged Platform Follower Logs
              </h4>
              <DataTable
                columns={[
                  { key: 'platform', header: 'Platform', width: '20%' },
                  { key: 'month_year', header: 'Month', width: '20%' },
                  { key: 'followers', header: 'Followers Count', width: '20%' },
                  { key: 'reach', header: 'Reach Volume', width: '20%' },
                  { key: 'posts_published', header: 'Posts Published', width: '20%' },
                ]}
                data={(socialMetrics as unknown as Record<string, unknown>[]) || []}
                emptyState={{
                  icon: Share2,
                  title: 'No Social Media Data Logged',
                  description: 'Add metrics logs for Facebook, LinkedIn, and Instagram to render follower updates.',
                }}
              />
            </div>
          </div>
        )}

        {/* TAB 4: PAID ADS */}
        {activeTab === 'ads' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between select-none">
              <div className="flex items-center gap-1 bg-[#132035] border border-[#1E3352] p-0.5 rounded">
                {['all', 'meta', 'google'].map((plat) => (
                  <button
                    key={plat}
                    onClick={() => setAdsPlatform(plat)}
                    className={`px-3 py-1 rounded text-[10px] font-semibold uppercase cursor-pointer transition-all ${
                      adsPlatform === plat
                        ? 'bg-[#1B4FD8] text-[#F0F4FF]'
                        : 'text-[#8BA3C7] hover:text-[#F0F4FF]'
                    }`}
                  >
                    {plat}
                  </button>
                ))}
              </div>

              <Button
                onClick={() => setModalOpen((prev) => ({ ...prev, ad: true }))}
                size="sm"
                className="bg-[#1B4FD8] hover:bg-[#2563EB] text-white text-xs h-8 gap-1 cursor-pointer font-semibold"
              >
                <Plus size={13} />
                <span>Log Ad Campaign</span>
              </Button>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                title="Total Ad Spent"
                value={formatCurrency(
                  (adsPlatform === 'all'
                    ? adCampaigns || []
                    : adCampaigns?.filter((c) => c.platform === adsPlatform) || []
                  ).reduce((sum, c) => sum + Number(c.budget_spent || 0), 0)
                )}
                icon={DollarSign}
              />
              <StatCard
                title="Total Ad Leads"
                value={(adsPlatform === 'all'
                  ? adCampaigns || []
                  : adCampaigns?.filter((c) => c.platform === adsPlatform) || []
                ).reduce((sum, c) => sum + Number(c.leads || 0), 0)}
                icon={Target}
              />
              <StatCard
                title="Avg CPL (Overall)"
                value={formatCurrency(
                  (() => {
                    const filtered =
                      adsPlatform === 'all'
                        ? adCampaigns || []
                        : adCampaigns?.filter((c) => c.platform === adsPlatform) || [];
                    const sumSpent = filtered.reduce((sum, c) => sum + Number(c.budget_spent || 0), 0);
                    const sumLeads = filtered.reduce((sum, c) => sum + Number(c.leads || 0), 0);
                    return sumLeads > 0 ? Math.round(sumSpent / sumLeads) : 0;
                  })()
                )}
                valueClassName="text-[#F97316]"
                icon={TrendingUp}
              />
              <StatCard
                title="Best CTR Performance"
                value={`${Math.max(
                  0,
                  ...(adsPlatform === 'all'
                    ? adCampaigns || []
                    : adCampaigns?.filter((c) => c.platform === adsPlatform) || []
                  ).map((c) => Number(c.ctr || 0))
                )}%`}
                icon={TrendingUp}
              />
            </div>

            {/* spend vs leads composed chart */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-[#0D1829] border border-[#1E3352] rounded-[10px] p-5 h-[280px]">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#4A6480] select-none mb-4">
                  Ad Spend vs Leads volume
                </h4>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                      data={
                        adsPlatform === 'all'
                          ? adCampaigns || []
                          : adCampaigns?.filter((c) => c.platform === adsPlatform) || []
                      }
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <CartesianGrid stroke="#1E3352" strokeDasharray="3 3" vertical={false} opacity={0.3} />
                      <XAxis dataKey="month_year" stroke="#4A6480" fontSize={10} axisLine={false} tickLine={false} />
                      <YAxis yAxisId="left" stroke="#4A6480" fontSize={10} axisLine={false} tickLine={false} />
                      <YAxis yAxisId="right" orientation="right" stroke="#4A6480" fontSize={10} axisLine={false} tickLine={false} />
                      <Tooltip />
                      <Bar yAxisId="left" dataKey="budget_spent" name="Spent Amount" fill={CHART_COLORS.secondary} fillOpacity={0.7} />
                      <Line yAxisId="right" type="monotone" dataKey="leads" name="Leads Generated" stroke={CHART_COLORS.success} strokeWidth={2} dot={{ r: 3 }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* CPL Trend Line */}
              <div className="bg-[#0D1829] border border-[#1E3352] rounded-[10px] p-5 h-[280px]">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#4A6480] select-none mb-4">
                  CPL Performance Trend
                </h4>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={
                        adsPlatform === 'all'
                          ? adCampaigns || []
                          : adCampaigns?.filter((c) => c.platform === adsPlatform) || []
                      }
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <CartesianGrid stroke="#1E3352" strokeDasharray="3 3" vertical={false} opacity={0.3} />
                      <XAxis dataKey="month_year" stroke="#4A6480" fontSize={10} axisLine={false} tickLine={false} />
                      <YAxis stroke="#4A6480" fontSize={10} axisLine={false} tickLine={false} />
                      <Tooltip />
                      <ReferenceLine y={400} stroke="#EF4444" strokeDasharray="4 4" label={{ value: 'Target CPL (₹400)', fill: '#EF4444', fontSize: 10 }} />
                      <Line type="monotone" dataKey="cpl" name="Cost Per Lead" stroke={CHART_COLORS.secondary} strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Campaign Table */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#4A6480] select-none">
                Ad Campaigns Summary Table
              </h4>
              <DataTable
                columns={[
                  { key: 'campaign_name', header: 'Campaign Name', width: '25%' },
                  { key: 'platform', header: 'Platform', width: '15%' },
                  {
                    key: 'budget_spent',
                    header: 'Budget Spent',
                    width: '15%',
                    render: (val) => formatCurrency(Number(val || 0)),
                  },
                  { key: 'leads', header: 'Leads', width: '10%' },
                  {
                    key: 'cpl',
                    header: 'CPL',
                    width: '15%',
                    render: (val) => formatCurrency(Number(val || 0)),
                  },
                  {
                    key: 'status',
                    header: 'Status',
                    width: '20%',
                    render: (val) => <StatusBadge status={String(val || 'active')} />,
                  },
                ]}
                data={(adCampaigns as unknown as Record<string, unknown>[]) || []}
                emptyState={{
                  icon: Target,
                  title: 'No Ad Campaigns Logged',
                  description: 'Add campaigns for Meta Ads and Google Ads to display performance summaries.',
                }}
              />
            </div>
          </div>
        )}

        {/* TAB 5: EMAIL MARKETING */}
        {activeTab === 'email' && (
          <div className="space-y-6">
            <div className="flex items-center justify-end select-none">
              <Button
                onClick={() => setModalOpen((prev) => ({ ...prev, email: true }))}
                size="sm"
                className="bg-[#1B4FD8] hover:bg-[#2563EB] text-white text-xs h-8 gap-1 cursor-pointer font-semibold"
              >
                <Plus size={13} />
                <span>Log Email Campaign</span>
              </Button>
            </div>

            {/* Email Stat Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                title="Total Sent"
                value={(emailCampaigns || []).reduce((sum, c) => sum + Number(c.emails_sent || 0), 0).toLocaleString()}
                icon={Mail}
              />
              <StatCard
                title="Avg Open Rate"
                value={`${(
                  (emailCampaigns || []).reduce((sum, c) => sum + Number(c.open_rate || 0), 0) /
                  (emailCampaigns?.length || 1)
                ).toFixed(1)}%`}
                icon={TrendingUp}
              />
              <StatCard
                title="Avg Click Rate"
                value={`${(
                  (emailCampaigns || []).reduce((sum, c) => sum + Number(c.click_rate || 0), 0) /
                  (emailCampaigns?.length || 1)
                ).toFixed(1)}%`}
                icon={TrendingUp}
              />
              <StatCard
                title="Total Unsubscribed"
                value={(emailCampaigns || []).reduce((sum, c) => sum + Number(c.unsubscribed || 0), 0).toLocaleString()}
                icon={AlertCircle}
              />
            </div>

            {/* Email Performance Trend Chart */}
            <div className="bg-[#0D1829] border border-[#1E3352] rounded-[10px] p-5 h-[280px]">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#4A6480] select-none mb-4">
                Email Open & Click Rate Performance (12 Months)
              </h4>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={emailCampaigns || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid stroke="#1E3352" strokeDasharray="3 3" vertical={false} opacity={0.3} />
                    <XAxis dataKey="month_year" stroke="#4A6480" fontSize={10} axisLine={false} tickLine={false} />
                    <YAxis stroke="#4A6480" fontSize={10} axisLine={false} tickLine={false} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                    <Tooltip />
                    <Legend verticalAlign="bottom" height={36} iconSize={10} fontSize={10} />
                    <Line type="monotone" dataKey="open_rate" name="Open Rate %" stroke={CHART_COLORS.cyan} strokeWidth={2} />
                    <Line type="monotone" dataKey="click_rate" name="Click Rate %" stroke={CHART_COLORS.success} strokeWidth={2} strokeDasharray="5 3" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Campaigns Table */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#4A6480] select-none">
                Logged Email Campaigns
              </h4>
              <DataTable
                columns={[
                  { key: 'name', header: 'Name', width: '25%' },
                  { key: 'subject', header: 'Subject Line', width: '25%' },
                  { key: 'emails_sent', header: 'Sent Volume', width: '15%' },
                  {
                    key: 'open_rate',
                    header: 'Open Rate',
                    width: '15%',
                    render: (val) => `${val}%`,
                  },
                  {
                    key: 'click_rate',
                    header: 'Click Rate',
                    width: '10%',
                    render: (val) => `${val}%`,
                  },
                  {
                    key: 'status',
                    header: 'Status',
                    width: '10%',
                    render: (val) => <StatusBadge status={String(val || 'sent')} />,
                  },
                ]}
                data={(emailCampaigns as unknown as Record<string, unknown>[]) || []}
                emptyState={{
                  icon: Mail,
                  title: 'No Email Campaigns Logged',
                  description: 'Add Resend email newsletter stats to view open and click percentages.',
                }}
              />
            </div>
          </div>
        )}

        {/* TAB 6: WHATSAPP MARKETING */}
        {activeTab === 'whatsapp' && (
          <div className="space-y-6">
            <div className="flex items-center justify-end select-none">
              <Button
                onClick={() => setModalOpen((prev) => ({ ...prev, whatsapp: true }))}
                size="sm"
                className="bg-[#1B4FD8] hover:bg-[#2563EB] text-white text-xs h-8 gap-1 cursor-pointer font-semibold"
              >
                <Plus size={13} />
                <span>Log WhatsApp Campaign</span>
              </Button>
            </div>

            {/* Whatsapp Stat Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                title="Total Messages Sent"
                value={(whatsappCampaigns || []).reduce((sum, c) => sum + Number(c.messages_sent || 0), 0).toLocaleString()}
                icon={MessageSquare}
              />
              <StatCard
                title="Avg Delivery Rate"
                value={`${(
                  (whatsappCampaigns || []).reduce((sum, c) => sum + Number(c.delivery_rate || 0), 0) /
                  (whatsappCampaigns?.length || 1)
                ).toFixed(1)}%`}
                icon={TrendingUp}
              />
              <StatCard
                title="Avg Read Rate"
                value={`${(
                  (whatsappCampaigns || []).reduce((sum, c) => sum + Number(c.read_rate || 0), 0) /
                  (whatsappCampaigns?.length || 1)
                ).toFixed(1)}%`}
                icon={TrendingUp}
              />
              <StatCard
                title="Avg Reply Rate"
                value={`${(
                  (whatsappCampaigns || []).reduce((sum, c) => sum + Number(c.reply_rate || 0), 0) /
                  (whatsappCampaigns?.length || 1)
                ).toFixed(1)}%`}
                icon={TrendingUp}
              />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* WhatsApp Campaign Volume Stacked Bar */}
              <div className="bg-[#0D1829] border border-[#1E3352] rounded-[10px] p-5 h-[280px]">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#4A6480] select-none mb-4">
                  WhatsApp Campaign Message Volume (Sent/Read/Replied)
                </h4>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={whatsappCampaigns || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid stroke="#1E3352" strokeDasharray="3 3" vertical={false} opacity={0.3} />
                      <XAxis dataKey="month_year" stroke="#4A6480" fontSize={10} axisLine={false} tickLine={false} />
                      <YAxis stroke="#4A6480" fontSize={10} axisLine={false} tickLine={false} />
                      <Tooltip />
                      <Legend verticalAlign="bottom" height={36} iconSize={10} fontSize={10} />
                      <Bar dataKey="messages_sent" name="Sent" stackId="a" fill="#064E3B" />
                      <Bar dataKey="delivered" name="Delivered" stackId="a" fill="#22C55E" />
                      <Bar dataKey="read_count" name="Read" stackId="a" fill="#86EFAC" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Read Rate Trend */}
              <div className="bg-[#0D1829] border border-[#1E3352] rounded-[10px] p-5 h-[280px]">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#4A6480] select-none mb-4">
                  Read Rate Trend Line
                </h4>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={whatsappCampaigns || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid stroke="#1E3352" strokeDasharray="3 3" vertical={false} opacity={0.3} />
                      <XAxis dataKey="month_year" stroke="#4A6480" fontSize={10} axisLine={false} tickLine={false} />
                      <YAxis stroke="#4A6480" fontSize={10} axisLine={false} tickLine={false} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                      <Tooltip />
                      <ReferenceLine y={65} stroke="#4A6480" strokeDasharray="4 4" label={{ value: 'Industry Avg (65%)', fill: '#4A6480', fontSize: 10 }} />
                      <Line type="monotone" dataKey="read_rate" name="Read Rate" stroke={CHART_COLORS.success} strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Campaigns Table */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#4A6480] select-none">
                WhatsApp Campaigns Details
              </h4>
              <DataTable
                columns={[
                  { key: 'name', header: 'Campaign Name', width: '25%' },
                  { key: 'campaign_type', header: 'Type', width: '15%' },
                  { key: 'messages_sent', header: 'Sent', width: '15%' },
                  {
                    key: 'read_rate',
                    header: 'Read Rate',
                    width: '15%',
                    render: (val) => `${val}%`,
                  },
                  {
                    key: 'reply_rate',
                    header: 'Reply Rate',
                    width: '15%',
                    render: (val) => `${val}%`,
                  },
                  {
                    key: 'status',
                    header: 'Status',
                    width: '15%',
                    render: (val) => <StatusBadge status={String(val || 'active')} />,
                  },
                ]}
                data={(whatsappCampaigns as unknown as Record<string, unknown>[]) || []}
                emptyState={{
                  icon: MessageSquare,
                  title: 'No WhatsApp Campaigns Logged',
                  description: 'Add broadcast campaign metrics to view delivery and response percentages.',
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* ━━━ MODAL: LOG SOCIAL MEDIA DATA ━━━ */}
      <Dialog open={modalOpen.social} onOpenChange={(open) => setModalOpen((prev) => ({ ...prev, social: open }))}>
        <DialogContent className="bg-[#0D1829] border border-[#1E3352] text-[#F0F4FF] max-w-md select-none">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-[#F0F4FF]">Log Social Media Metrics</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 my-2 text-xs">
            <div className="col-span-2">
              <label className="block text-[11px] font-semibold text-[#8BA3C7] mb-1">Social Platform *</label>
              <select
                className="w-full bg-[#060D1A] border border-[#1E3352] rounded p-2 text-xs text-[#F0F4FF] outline-none"
                value={socialForm.platform}
                onChange={(e) => setSocialForm((prev) => ({ ...prev, platform: e.target.value }))}
              >
                <option value="instagram">Instagram (@veloxisglobal)</option>
                <option value="facebook">Facebook page</option>
                <option value="linkedin">LinkedIn company page</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#8BA3C7] mb-1">Month-Year *</label>
              <input
                className="w-full bg-[#060D1A] border border-[#1E3352] rounded p-2 text-xs text-[#F0F4FF] outline-none font-mono"
                type="text"
                placeholder="Jun 2026"
                value={socialForm.month_year}
                onChange={(e) => setSocialForm((prev) => ({ ...prev, month_year: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#8BA3C7] mb-1">Followers Count *</label>
              <input
                className="w-full bg-[#060D1A] border border-[#1E3352] rounded p-2 text-xs text-[#F0F4FF] outline-none font-mono"
                type="number"
                placeholder="1000"
                value={socialForm.followers}
                onChange={(e) => setSocialForm((prev) => ({ ...prev, followers: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#8BA3C7] mb-1">New Followers</label>
              <input
                className="w-full bg-[#060D1A] border border-[#1E3352] rounded p-2 text-xs text-[#F0F4FF] outline-none font-mono"
                type="number"
                placeholder="50"
                value={socialForm.new_followers}
                onChange={(e) => setSocialForm((prev) => ({ ...prev, new_followers: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#8BA3C7] mb-1">Reach Volume</label>
              <input
                className="w-full bg-[#060D1A] border border-[#1E3352] rounded p-2 text-xs text-[#F0F4FF] outline-none font-mono"
                type="number"
                placeholder="2500"
                value={socialForm.reach}
                onChange={(e) => setSocialForm((prev) => ({ ...prev, reach: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#8BA3C7] mb-1">Impressions</label>
              <input
                className="w-full bg-[#060D1A] border border-[#1E3352] rounded p-2 text-xs text-[#F0F4FF] outline-none font-mono"
                type="number"
                placeholder="5000"
                value={socialForm.impressions}
                onChange={(e) => setSocialForm((prev) => ({ ...prev, impressions: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#8BA3C7] mb-1">Engagements</label>
              <input
                className="w-full bg-[#060D1A] border border-[#1E3352] rounded p-2 text-xs text-[#F0F4FF] outline-none font-mono"
                type="number"
                placeholder="150"
                value={socialForm.engagements}
                onChange={(e) => setSocialForm((prev) => ({ ...prev, engagements: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#8BA3C7] mb-1">Posts Published</label>
              <input
                className="w-full bg-[#060D1A] border border-[#1E3352] rounded p-2 text-xs text-[#F0F4FF] outline-none font-mono"
                type="number"
                placeholder="8"
                value={socialForm.posts_published}
                onChange={(e) => setSocialForm((prev) => ({ ...prev, posts_published: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#8BA3C7] mb-1">Profile Visits</label>
              <input
                className="w-full bg-[#060D1A] border border-[#1E3352] rounded p-2 text-xs text-[#F0F4FF] outline-none font-mono"
                type="number"
                placeholder="120"
                value={socialForm.profile_visits}
                onChange={(e) => setSocialForm((prev) => ({ ...prev, profile_visits: e.target.value }))}
              />
            </div>

            <div className="col-span-2">
              <label className="block text-[11px] font-semibold text-[#8BA3C7] mb-1">Website Click Redirects</label>
              <input
                className="w-full bg-[#060D1A] border border-[#1E3352] rounded p-2 text-xs text-[#F0F4FF] outline-none font-mono"
                type="number"
                placeholder="40"
                value={socialForm.website_clicks}
                onChange={(e) => setSocialForm((prev) => ({ ...prev, website_clicks: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" size="sm" onClick={() => setModalOpen((prev) => ({ ...prev, social: false }))} className="border-[#1E3352] text-[#8BA3C7] hover:text-[#F0F4FF] text-xs font-semibold cursor-pointer">
              Cancel
            </Button>
            <Button onClick={() => handleLogSubmit('social')} disabled={isSubmitting} size="sm" className="bg-[#1B4FD8] hover:bg-[#2563EB] text-white text-xs font-semibold cursor-pointer">
              {isSubmitting ? 'Saving...' : 'Save Metrics'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ━━━ MODAL: LOG AD CAMPAIGN ━━━ */}
      <Dialog open={modalOpen.ad} onOpenChange={(open) => setModalOpen((prev) => ({ ...prev, ad: open }))}>
        <DialogContent className="bg-[#0D1829] border border-[#1E3352] text-[#F0F4FF] max-w-md select-none">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-[#F0F4FF]">Log Ad Campaign Details</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 my-2 text-xs">
            <div>
              <label className="block text-[11px] font-semibold text-[#8BA3C7] mb-1">Platform *</label>
              <select
                className="w-full bg-[#060D1A] border border-[#1E3352] rounded p-2 text-xs text-[#F0F4FF] outline-none"
                value={adForm.platform}
                onChange={(e) => setAdForm((prev) => ({ ...prev, platform: e.target.value }))}
              >
                <option value="meta">Meta Ads (Facebook / Instagram)</option>
                <option value="google">Google Ads (Search / Display)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#8BA3C7] mb-1">Month-Year *</label>
              <input
                className="w-full bg-[#060D1A] border border-[#1E3352] rounded p-2 text-xs text-[#F0F4FF] outline-none font-mono"
                type="text"
                placeholder="Jun 2026"
                value={adForm.month_year}
                onChange={(e) => setAdForm((prev) => ({ ...prev, month_year: e.target.value }))}
              />
            </div>

            <div className="col-span-2">
              <label className="block text-[11px] font-semibold text-[#8BA3C7] mb-1">Campaign Name *</label>
              <input
                className="w-full bg-[#060D1A] border border-[#1E3352] rounded p-2 text-xs text-[#F0F4FF] outline-none"
                type="text"
                placeholder="Veloxis Kanpur Agency Leads Campaign"
                value={adForm.campaign_name}
                onChange={(e) => setAdForm((prev) => ({ ...prev, campaign_name: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#8BA3C7] mb-1">Campaign platform ID</label>
              <input
                className="w-full bg-[#060D1A] border border-[#1E3352] rounded p-2 text-xs text-[#F0F4FF] outline-none font-mono"
                type="text"
                placeholder="c_8928372"
                value={adForm.campaign_id}
                onChange={(e) => setAdForm((prev) => ({ ...prev, campaign_id: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#8BA3C7] mb-1">Budget Allocated (₹) *</label>
              <input
                className="w-full bg-[#060D1A] border border-[#1E3352] rounded p-2 text-xs text-[#F0F4FF] outline-none font-mono"
                type="number"
                placeholder="10000"
                value={adForm.budget_allocated}
                onChange={(e) => setAdForm((prev) => ({ ...prev, budget_allocated: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#8BA3C7] mb-1">Budget Spent (₹) *</label>
              <input
                className="w-full bg-[#060D1A] border border-[#1E3352] rounded p-2 text-xs text-[#F0F4FF] outline-none font-mono"
                type="number"
                placeholder="8400"
                value={adForm.budget_spent}
                onChange={(e) => setAdForm((prev) => ({ ...prev, budget_spent: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#8BA3C7] mb-1">Leads Generated *</label>
              <input
                className="w-full bg-[#060D1A] border border-[#1E3352] rounded p-2 text-xs text-[#F0F4FF] outline-none font-mono"
                type="number"
                placeholder="24"
                value={adForm.leads}
                onChange={(e) => setAdForm((prev) => ({ ...prev, leads: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#8BA3C7] mb-1">Clicks Count</label>
              <input
                className="w-full bg-[#060D1A] border border-[#1E3352] rounded p-2 text-xs text-[#F0F4FF] outline-none font-mono"
                type="number"
                placeholder="320"
                value={adForm.clicks}
                onChange={(e) => setAdForm((prev) => ({ ...prev, clicks: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#8BA3C7] mb-1">Impressions</label>
              <input
                className="w-full bg-[#060D1A] border border-[#1E3352] rounded p-2 text-xs text-[#F0F4FF] outline-none font-mono"
                type="number"
                placeholder="15000"
                value={adForm.impressions}
                onChange={(e) => setAdForm((prev) => ({ ...prev, impressions: e.target.value }))}
              />
            </div>

            <div className="col-span-2">
              <label className="block text-[11px] font-semibold text-[#8BA3C7] mb-1">Campaign status</label>
              <select
                className="w-full bg-[#060D1A] border border-[#1E3352] rounded p-2 text-xs text-[#F0F4FF] outline-none"
                value={adForm.status}
                onChange={(e) => setAdForm((prev) => ({ ...prev, status: e.target.value }))}
              >
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            <div className="col-span-2">
              <label className="block text-[11px] font-semibold text-[#8BA3C7] mb-1">Notes</label>
              <textarea
                className="w-full bg-[#060D1A] border border-[#1E3352] rounded p-2 text-xs text-[#F0F4FF] outline-none h-16 resize-none"
                placeholder="Targeting Kanpur digital marketing businesses"
                value={adForm.notes}
                onChange={(e) => setAdForm((prev) => ({ ...prev, notes: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" size="sm" onClick={() => setModalOpen((prev) => ({ ...prev, ad: false }))} className="border-[#1E3352] text-[#8BA3C7] hover:text-[#F0F4FF] text-xs font-semibold cursor-pointer">
              Cancel
            </Button>
            <Button onClick={() => handleLogSubmit('ad')} disabled={isSubmitting} size="sm" className="bg-[#1B4FD8] hover:bg-[#2563EB] text-white text-xs font-semibold cursor-pointer">
              {isSubmitting ? 'Saving...' : 'Save Campaign'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ━━━ MODAL: LOG EMAIL CAMPAIGN ━━━ */}
      <Dialog open={modalOpen.email} onOpenChange={(open) => setModalOpen((prev) => ({ ...prev, email: open }))}>
        <DialogContent className="bg-[#0D1829] border border-[#1E3352] text-[#F0F4FF] max-w-md select-none">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-[#F0F4FF]">Log Email Campaign Details</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 my-2 text-xs">
            <div className="col-span-2">
              <label className="block text-[11px] font-semibold text-[#8BA3C7] mb-1">Campaign Name *</label>
              <input
                className="w-full bg-[#060D1A] border border-[#1E3352] rounded p-2 text-xs text-[#F0F4FF] outline-none"
                type="text"
                placeholder="Veloxis June Newsletter"
                value={emailForm.name}
                onChange={(e) => setEmailForm((prev) => ({ ...prev, name: e.target.value }))}
              />
            </div>

            <div className="col-span-2">
              <label className="block text-[11px] font-semibold text-[#8BA3C7] mb-1">Subject Line</label>
              <input
                className="w-full bg-[#060D1A] border border-[#1E3352] rounded p-2 text-xs text-[#F0F4FF] outline-none"
                type="text"
                placeholder="5 SEO Secrets for Kanpur Local Businesses"
                value={emailForm.subject}
                onChange={(e) => setEmailForm((prev) => ({ ...prev, subject: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#8BA3C7] mb-1">Month-Year *</label>
              <input
                className="w-full bg-[#060D1A] border border-[#1E3352] rounded p-2 text-xs text-[#F0F4FF] outline-none font-mono"
                type="text"
                placeholder="Jun 2026"
                value={emailForm.month_year}
                onChange={(e) => setEmailForm((prev) => ({ ...prev, month_year: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#8BA3C7] mb-1">Campaign Type</label>
              <select
                className="w-full bg-[#060D1A] border border-[#1E3352] rounded p-2 text-xs text-[#F0F4FF] outline-none"
                value={emailForm.campaign_type}
                onChange={(e) => setEmailForm((prev) => ({ ...prev, campaign_type: e.target.value }))}
              >
                <option value="newsletter">Newsletter</option>
                <option value="drip">Drip sequence</option>
                <option value="promo">Promotional</option>
                <option value="announcement">Announcement</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#8BA3C7] mb-1">Emails Sent *</label>
              <input
                className="w-full bg-[#060D1A] border border-[#1E3352] rounded p-2 text-xs text-[#F0F4FF] outline-none font-mono"
                type="number"
                placeholder="1200"
                value={emailForm.emails_sent}
                onChange={(e) => setEmailForm((prev) => ({ ...prev, emails_sent: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#8BA3C7] mb-1">Emails Delivered *</label>
              <input
                className="w-full bg-[#060D1A] border border-[#1E3352] rounded p-2 text-xs text-[#F0F4FF] outline-none font-mono"
                type="number"
                placeholder="1180"
                value={emailForm.delivered}
                onChange={(e) => setEmailForm((prev) => ({ ...prev, delivered: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#8BA3C7] mb-1">Opened count *</label>
              <input
                className="w-full bg-[#060D1A] border border-[#1E3352] rounded p-2 text-xs text-[#F0F4FF] outline-none font-mono"
                type="number"
                placeholder="420"
                value={emailForm.opened}
                onChange={(e) => setEmailForm((prev) => ({ ...prev, opened: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#8BA3C7] mb-1">Clicked count *</label>
              <input
                className="w-full bg-[#060D1A] border border-[#1E3352] rounded p-2 text-xs text-[#F0F4FF] outline-none font-mono"
                type="number"
                placeholder="85"
                value={emailForm.clicked}
                onChange={(e) => setEmailForm((prev) => ({ ...prev, clicked: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#8BA3C7] mb-1">Unsubscribed</label>
              <input
                className="w-full bg-[#060D1A] border border-[#1E3352] rounded p-2 text-xs text-[#F0F4FF] outline-none font-mono"
                type="number"
                placeholder="6"
                value={emailForm.unsubscribed}
                onChange={(e) => setEmailForm((prev) => ({ ...prev, unsubscribed: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#8BA3C7] mb-1">Bounced</label>
              <input
                className="w-full bg-[#060D1A] border border-[#1E3352] rounded p-2 text-xs text-[#F0F4FF] outline-none font-mono"
                type="number"
                placeholder="20"
                value={emailForm.bounced}
                onChange={(e) => setEmailForm((prev) => ({ ...prev, bounced: e.target.value }))}
              />
            </div>

            <div className="col-span-2">
              <label className="block text-[11px] font-semibold text-[#8BA3C7] mb-1">Notes</label>
              <textarea
                className="w-full bg-[#060D1A] border border-[#1E3352] rounded p-2 text-xs text-[#F0F4FF] outline-none h-16 resize-none"
                placeholder="Sent via Resend API"
                value={emailForm.notes}
                onChange={(e) => setEmailForm((prev) => ({ ...prev, notes: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" size="sm" onClick={() => setModalOpen((prev) => ({ ...prev, email: false }))} className="border-[#1E3352] text-[#8BA3C7] hover:text-[#F0F4FF] text-xs font-semibold cursor-pointer">
              Cancel
            </Button>
            <Button onClick={() => handleLogSubmit('email')} disabled={isSubmitting} size="sm" className="bg-[#1B4FD8] hover:bg-[#2563EB] text-white text-xs font-semibold cursor-pointer">
              {isSubmitting ? 'Saving...' : 'Save Campaign'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ━━━ MODAL: LOG WHATSAPP CAMPAIGN ━━━ */}
      <Dialog open={modalOpen.whatsapp} onOpenChange={(open) => setModalOpen((prev) => ({ ...prev, whatsapp: open }))}>
        <DialogContent className="bg-[#0D1829] border border-[#1E3352] text-[#F0F4FF] max-w-md select-none">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-[#F0F4FF]">Log WhatsApp Campaign Details</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 my-2 text-xs">
            <div className="col-span-2">
              <label className="block text-[11px] font-semibold text-[#8BA3C7] mb-1">Campaign Name *</label>
              <input
                className="w-full bg-[#060D1A] border border-[#1E3352] rounded p-2 text-xs text-[#F0F4FF] outline-none"
                type="text"
                placeholder="June Broadcast to Cold Kanpur Leads"
                value={whatsappForm.name}
                onChange={(e) => setWhatsappForm((prev) => ({ ...prev, name: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#8BA3C7] mb-1">Template Name</label>
              <input
                className="w-full bg-[#060D1A] border border-[#1E3352] rounded p-2 text-xs text-[#F0F4FF] outline-none font-mono"
                type="text"
                placeholder="vg_agency_intro_v1"
                value={whatsappForm.template_name}
                onChange={(e) => setWhatsappForm((prev) => ({ ...prev, template_name: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#8BA3C7] mb-1">Month-Year *</label>
              <input
                className="w-full bg-[#060D1A] border border-[#1E3352] rounded p-2 text-xs text-[#F0F4FF] outline-none font-mono"
                type="text"
                placeholder="Jun 2026"
                value={whatsappForm.month_year}
                onChange={(e) => setWhatsappForm((prev) => ({ ...prev, month_year: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#8BA3C7] mb-1">Campaign Type</label>
              <select
                className="w-full bg-[#060D1A] border border-[#1E3352] rounded p-2 text-xs text-[#F0F4FF] outline-none"
                value={whatsappForm.campaign_type}
                onChange={(e) => setWhatsappForm((prev) => ({ ...prev, campaign_type: e.target.value }))}
              >
                <option value="broadcast">Broadcast</option>
                <option value="sequence">Sequence / Follow up</option>
                <option value="chatbot">Chatbot flows</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#8BA3C7] mb-1">Messages Sent *</label>
              <input
                className="w-full bg-[#060D1A] border border-[#1E3352] rounded p-2 text-xs text-[#F0F4FF] outline-none font-mono"
                type="number"
                placeholder="200"
                value={whatsappForm.messages_sent}
                onChange={(e) => setWhatsappForm((prev) => ({ ...prev, messages_sent: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#8BA3C7] mb-1">Delivered Messages *</label>
              <input
                className="w-full bg-[#060D1A] border border-[#1E3352] rounded p-2 text-xs text-[#F0F4FF] outline-none font-mono"
                type="number"
                placeholder="196"
                value={whatsappForm.delivered}
                onChange={(e) => setWhatsappForm((prev) => ({ ...prev, delivered: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#8BA3C7] mb-1">Read Count *</label>
              <input
                className="w-full bg-[#060D1A] border border-[#1E3352] rounded p-2 text-xs text-[#F0F4FF] outline-none font-mono"
                type="number"
                placeholder="150"
                value={whatsappForm.read_count}
                onChange={(e) => setWhatsappForm((prev) => ({ ...prev, read_count: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#8BA3C7] mb-1">Replied Messages *</label>
              <input
                className="w-full bg-[#060D1A] border border-[#1E3352] rounded p-2 text-xs text-[#F0F4FF] outline-none font-mono"
                type="number"
                placeholder="40"
                value={whatsappForm.replied}
                onChange={(e) => setWhatsappForm((prev) => ({ ...prev, replied: e.target.value }))}
              />
            </div>

            <div className="col-span-2">
              <label className="block text-[11px] font-semibold text-[#8BA3C7] mb-1">Notes</label>
              <textarea
                className="w-full bg-[#060D1A] border border-[#1E3352] rounded p-2 text-xs text-[#F0F4FF] outline-none h-16 resize-none"
                placeholder="Logged broadcast sequence"
                value={whatsappForm.notes}
                onChange={(e) => setWhatsappForm((prev) => ({ ...prev, notes: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" size="sm" onClick={() => setModalOpen((prev) => ({ ...prev, whatsapp: false }))} className="border-[#1E3352] text-[#8BA3C7] hover:text-[#F0F4FF] text-xs font-semibold cursor-pointer">
              Cancel
            </Button>
            <Button onClick={() => handleLogSubmit('whatsapp')} disabled={isSubmitting} size="sm" className="bg-[#1B4FD8] hover:bg-[#2563EB] text-white text-xs font-semibold cursor-pointer">
              {isSubmitting ? 'Saving...' : 'Save Campaign'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
export default AgencyDashboard;
