// components/admin/reports/reports-dashboard.tsx
'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { 
  FileText, 
  Download, 
  Eye, 
  Send, 
  CheckCircle, 
  AlertCircle, 
  ChevronRight, 
  Loader2, 
  Sparkles,
  TrendingUp,
  TrendingDown,
  Globe,
  Share2,
  Calendar,
  Layers,
  Facebook,
  Grid,
  Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageContainer } from '@/components/shared/page-container';
import { 
  Client, 
  GeneratedReport, 
  GscConnection, 
  Ga4Connection, 
  MetaConnection, 
  GoogleAdsConnection, 
  SeoCampaign, 
  SeoKeyword, 
  MetaCampaign, 
  GoogleAdsCampaign, 
  SocialMediaMetrics 
} from '@/types';
import { ReportPreview } from './report-preview';

interface ReportsDashboardProps {
  initialClients: Client[];
  initialReports: GeneratedReport[];
  initialGscConns: GscConnection[];
  initialGa4Conns: Ga4Connection[];
  initialMetaConns: MetaConnection[];
  initialGoogleAdsConns: GoogleAdsConnection[];
  selectedMonth: string;
  selectedClientId: string;
  selectedClientData: Client | null;
  seoData: SeoCampaign | null;
  prevSeoData: SeoCampaign | null;
  keywordsData: SeoKeyword[];
  metaData: MetaCampaign[];
  prevMetaData: MetaCampaign[];
  googleAdsData: GoogleAdsCampaign[];
  prevGoogleAdsData: GoogleAdsCampaign[];
  socialData: SocialMediaMetrics[];
  prevSocialData: SocialMediaMetrics[];
}

export function ReportsDashboard({
  initialClients,
  initialReports,
  initialGscConns,
  initialGa4Conns,
  initialMetaConns,
  initialGoogleAdsConns,
  selectedMonth,
  selectedClientId,
  selectedClientData,
  seoData,
  prevSeoData,
  keywordsData,
  metaData,
  prevMetaData,
  googleAdsData,
  prevGoogleAdsData,
  socialData,
  prevSocialData
}: ReportsDashboardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'preview'>('dashboard');
  const [generating, setGenerating] = useState(false);
  const [sendingReportId, setSendingReportId] = useState<string | null>(null);

  // Month options (past 12 months)
  const getMonthOptions = () => {
    const options = [];
    const date = new Date();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    for (let i = 0; i < 12; i++) {
      const mStr = `${months[date.getMonth()]} ${date.getFullYear()}`;
      options.push(mStr);
      date.setMonth(date.getMonth() - 1);
    }
    return options;
  };

  const monthOptions = getMonthOptions();

  // Navigation handlers
  const handleClientChange = (clientId: string) => {
    startTransition(() => {
      router.push(`/dashboard/reports?clientId=${clientId}&month=${encodeURIComponent(selectedMonth)}`);
    });
  };

  const handleMonthChange = (month: string) => {
    startTransition(() => {
      router.push(`/dashboard/reports?clientId=${selectedClientId}&month=${encodeURIComponent(month)}`);
    });
  };

  // Check integration statuses for selected client
  const isGscConnected = initialGscConns.some(c => c.client_id === selectedClientId && c.is_active);
  const isGa4Connected = initialGa4Conns.some(c => c.client_id === selectedClientId && c.is_active);
  const isMetaConnected = initialMetaConns.some(c => c.client_id === selectedClientId && c.is_active);
  const isGoogleAdsConnected = initialGoogleAdsConns.some(c => c.client_id === selectedClientId && c.is_active);

  // Get current report if generated
  const currentReport = initialReports.find(
    r => r.client_id === selectedClientId && r.month_year === selectedMonth
  );

  // Aggregate values at component scope
  const metaSpend = metaData.reduce((acc, c) => acc + Number(c.budget_spent || 0), 0);
  const metaLeads = metaData.reduce((acc, c) => acc + Number(c.leads || 0), 0);
  const metaClicks = metaData.reduce((acc, c) => acc + Number(c.clicks || 0), 0);
  const metaAvgCpl = metaLeads > 0 ? (metaSpend / metaLeads) : 0;
  
  const gadsSpend = googleAdsData.reduce((acc, c) => acc + Number(c.budget_spent || 0), 0);
  const gadsConvs = googleAdsData.reduce((acc, c) => acc + Number(c.conversions || 0), 0);
  const gadsClicks = googleAdsData.reduce((acc, c) => acc + Number(c.clicks || 0), 0);
  const gadsCostPerConv = gadsConvs > 0 ? (gadsSpend / gadsConvs) : 0;

  // CSV Export
  const handleExportCSV = () => {
    if (!selectedClientData) return;
    
    const seoTraffic = seoData?.organic_traffic ?? 0;
    const seoClicks = seoData?.gsc_clicks ?? 0;
    const seoImpressions = seoData?.gsc_impressions ?? 0;
    const seoAvgPos = seoData?.gsc_avg_position ?? 0;

    const socialReach = socialData.reduce((acc, s) => acc + (s.reach || 0), 0);
    const socialFollowers = socialData.reduce((acc, s) => acc + (s.followers || 0), 0);

    const rows = [
      ['Metric Group', 'Metric Name', 'Value', 'Month/Period'],
      ['Client Details', 'Client Name', selectedClientData.name, selectedMonth],
      ['Client Details', 'Company', selectedClientData.company ?? 'N/A', selectedMonth],
      ['SEO', 'Organic Traffic', seoTraffic, selectedMonth],
      ['SEO', 'GSC Clicks', seoClicks, selectedMonth],
      ['SEO', 'GSC Impressions', seoImpressions, selectedMonth],
      ['SEO', 'GSC Avg Position', seoAvgPos, selectedMonth],
      ['Meta Ads', 'Total Spend', metaSpend, selectedMonth],
      ['Meta Ads', 'Leads Generated', metaLeads, selectedMonth],
      ['Meta Ads', 'Clicks', metaClicks, selectedMonth],
      ['Meta Ads', 'Average CPL', metaAvgCpl.toFixed(2), selectedMonth],
      ['Google Ads', 'Total Spend', gadsSpend, selectedMonth],
      ['Google Ads', 'Conversions', gadsConvs, selectedMonth],
      ['Google Ads', 'Clicks', gadsClicks, selectedMonth],
      ['Google Ads', 'Cost Per Conversion', gadsCostPerConv.toFixed(2), selectedMonth],
      ['Social Media', 'Total Reach', socialReach, selectedMonth],
      ['Social Media', 'Follower Count', socialFollowers, selectedMonth],
    ];

    const csvContent = "data:text/csv;charset=utf-8," 
      + rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Report_${selectedClientData.name.replace(/\s+/g, '_')}_${selectedMonth.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('CSV metrics exported successfully!');
  };

  // Generate Report Action
  const handleGenerateReport = async () => {
    if (!selectedClientId) return;
    setGenerating(true);
    const toastId = toast.loading('Compiling stats and generating PDF report...');
    try {
      const response = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientId: selectedClientId,
          monthYear: selectedMonth,
        }),
      });

      const data = await response.json();
      if (!response.ok || data.error) {
        throw new Error(data.error || 'Failed to generate report');
      }

      toast.success('Report PDF generated successfully!', { id: toastId });
      router.refresh();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- catch block err type
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate report', { id: toastId });
    } finally {
      setGenerating(false);
    }
  };

  // Send Report Action
  const handleSendReport = async (reportId: string) => {
    setSendingReportId(reportId);
    const toastId = toast.loading('Publishing report and sending email notification via Resend...');
    try {
      const response = await fetch('/api/reports/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reportId }),
      });

      const data = await response.json();
      if (!response.ok || data.error) {
        throw new Error(data.error || 'Failed to send report');
      }

      toast.success('Report successfully shared in portal & emailed to client!', { id: toastId });
      router.refresh();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- catch block err type
    } catch (err: any) {
      toast.error(err.message || 'Failed to send report', { id: toastId });
    } finally {
      setSendingReportId(null);
    }
  };

  // Growth calculation helper
  const renderMoM = (current: number, previous: number, format: 'number' | 'currency' | 'percent' = 'number') => {
    if (!previous || previous === 0) {
      return (
        <span className="text-gray-400 text-xs flex items-center font-normal">
          No historical data
        </span>
      );
    }
    const pct = ((current - previous) / previous) * 100;
    const isUp = pct > 0;
    const pctStr = `${isUp ? '+' : ''}${pct.toFixed(1)}%`;
    
    return (
      <span className={`text-xs flex items-center font-medium ${isUp ? 'text-emerald-400' : pct === 0 ? 'text-gray-400' : 'text-rose-400'}`}>
        {isUp ? <TrendingUp className="w-3 h-3 mr-1" /> : pct === 0 ? null : <TrendingDown className="w-3 h-3 mr-1" />}
        {pctStr} MoM
      </span>
    );
  };

  // Compiled metric values
  const currentTraffic = seoData?.organic_traffic ?? 0;
  const previousTraffic = prevSeoData?.organic_traffic ?? 0;

  const currentClicks = seoData?.gsc_clicks ?? 0;
  const previousClicks = prevSeoData?.gsc_clicks ?? 0;

  const currentMetaLeads = metaData.reduce((acc, c) => acc + Number(c.leads || 0), 0);
  const previousMetaLeads = prevMetaData.reduce((acc, c) => acc + Number(c.leads || 0), 0);

  const currentGadsConvs = googleAdsData.reduce((acc, c) => acc + Number(c.conversions || 0), 0);
  const previousGadsConvs = prevGoogleAdsData.reduce((acc, c) => acc + Number(c.conversions || 0), 0);

  // Total Leads + Conversions
  const totalConversions = currentMetaLeads + currentGadsConvs;
  const prevTotalConversions = previousMetaLeads + previousGadsConvs;

  // Ad Spend totals
  const currentMetaSpend = metaData.reduce((acc, c) => acc + Number(c.budget_spent || 0), 0);
  const currentGadsSpend = googleAdsData.reduce((acc, c) => acc + Number(c.budget_spent || 0), 0);
  const totalAdSpend = currentMetaSpend + currentGadsSpend;

  return (
    <PageContainer title="Reports & Analytics" description="Compile, review, generate and distribute monthly client performance reports.">
      {/* Upper Control Bar */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center bg-bg-card border border-border/30 p-4 rounded-xl mb-6 shadow-md">
        <div className="flex flex-wrap gap-3 items-center w-full md:w-auto">
          {/* Client Selector */}
          <div className="flex flex-col gap-1 min-w-[200px]">
            <label className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider">Select Client</label>
            <select
              value={selectedClientId}
              onChange={(e) => handleClientChange(e.target.value)}
              className="bg-[#0A1628] border border-border/30 text-text-primary rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500 w-full"
              disabled={isPending || generating}
            >
              <option value="">-- Choose Client --</option>
              {initialClients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.is_agency_self ? '⭐ (Agency Self)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Month Selector */}
          <div className="flex flex-col gap-1 min-w-[150px]">
            <label className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider">Select Month</label>
            <select
              value={selectedMonth}
              onChange={(e) => handleMonthChange(e.target.value)}
              className="bg-[#0A1628] border border-border/30 text-text-primary rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500 w-full"
              disabled={isPending || generating}
            >
              {monthOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        </div>

        {selectedClientId && (
          <div className="flex gap-2 w-full md:w-auto justify-end">
            <Button
              variant={activeTab === 'dashboard' ? 'secondary' : 'ghost'}
              onClick={() => setActiveTab('dashboard')}
              className={`text-xs ${activeTab === 'dashboard' ? 'bg-[#1E3352] text-text-primary hover:bg-[#1E3352]/80' : 'text-text-secondary'}`}
            >
              <Grid className="w-4.5 h-4.5 mr-1.5" /> Dashboard View
            </Button>
            <Button
              variant={activeTab === 'preview' ? 'secondary' : 'ghost'}
              onClick={() => setActiveTab('preview')}
              className={`text-xs ${activeTab === 'preview' ? 'bg-[#1E3352] text-text-primary hover:bg-[#1E3352]/80' : 'text-text-secondary'}`}
            >
              <Eye className="w-4.5 h-4.5 mr-1.5" /> Portal Preview
            </Button>
          </div>
        )}
      </div>

      {isPending ? (
        <div className="flex flex-col items-center justify-center p-20 bg-bg-card border border-border/30 rounded-xl text-text-secondary gap-3">
          <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
          <span className="text-sm font-medium">Fetching monthly report metrics...</span>
        </div>
      ) : !selectedClientId ? (
        <div className="rounded-xl border border-border/30 bg-bg-card p-16 text-center text-text-secondary flex flex-col items-center justify-center gap-4 shadow-md">
          <div className="p-4 bg-[#1E3352]/40 rounded-full text-blue-400">
            <Layers className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-text-primary mb-1">No Client Selected</h3>
            <p className="text-sm text-text-secondary max-w-md mx-auto">
              Please choose a client from the dropdown at the top to compile performance metrics, view historical reports, and generate deliverables.
            </p>
          </div>
        </div>
      ) : activeTab === 'preview' ? (
        /* Portal Preview View */
        <div className="bg-[#0B132B] border border-border/30 rounded-xl p-4 md:p-8 shadow-inner overflow-hidden">
          <div className="flex justify-between items-center mb-6 border-b border-border/30 pb-4">
            <div>
              <h3 className="text-md font-semibold text-text-primary">Client Portal Preview</h3>
              <p className="text-xs text-text-secondary">Light-themed preview matching what the client views in their portal dashboard.</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveTab('dashboard')}
              className="text-xs border-border/30 text-text-secondary hover:bg-[#1E3352]/40"
            >
              Back to Dashboard
            </Button>
          </div>
          <ReportPreview
            client={selectedClientData!}
            monthYear={selectedMonth}
            seoData={seoData}
            keywordsData={keywordsData}
            metaData={metaData}
            googleAdsData={googleAdsData}
            socialData={socialData}
          />
        </div>
      ) : (
        /* Dashboard View */
        <div className="space-y-6">
          {/* Integration Status & Actions Panel */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Action Card */}
            <Card className="lg:col-span-2 bg-bg-card border-border/30 text-text-primary">
              <CardHeader className="pb-3 border-b border-border/30/50">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg font-semibold text-text-primary flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-blue-400" />
                      Report Compiler
                    </CardTitle>
                    <CardDescription className="text-text-secondary text-xs">
                      Compile current month metrics into a client-ready snapshot.
                    </CardDescription>
                  </div>
                  {currentReport && (
                    <div className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1 ${
                      currentReport.status === 'sent' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    }`}>
                      {currentReport.status === 'sent' ? <CheckCircle className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                      Report {currentReport.status}
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-5 space-y-4">
                <div className="text-sm text-text-secondary leading-relaxed">
                  Compiling gathers GSC traffic, GA4 conversions, Meta ads performance, Google Ads leads, and SMM metrics for <span className="font-semibold text-text-primary">{selectedClientData?.name}</span> during <span className="font-semibold text-text-primary">{selectedMonth}</span>.
                </div>

                <div className="flex flex-wrap gap-3 pt-2">
                  <Button
                    onClick={handleGenerateReport}
                    disabled={generating || isPending}
                    className="bg-[#2E66FF] hover:bg-[#1E4DFF] text-white text-xs px-4 py-2 font-medium"
                  >
                    {generating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating PDF...
                      </>
                    ) : currentReport ? (
                      <>
                        <FileText className="w-4 h-4 mr-2" /> Re-Generate PDF Report
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" /> Generate PDF Report
                      </>
                    )}
                  </Button>

                  {currentReport && (
                    <>
                      <Button
                        onClick={() => handleSendReport(currentReport.id)}
                        disabled={sendingReportId !== null || generating}
                        className="bg-[#10B981] hover:bg-[#059669] text-white text-xs px-4 py-2 font-medium"
                      >
                        {sendingReportId === currentReport.id ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending...
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4 mr-2" /> Send to Client
                          </>
                        )}
                      </Button>

                      {currentReport.files?.public_url && (
                        <a 
                          href={currentReport.files.public_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex shrink-0 items-center justify-center rounded-lg border border-border/30 bg-transparent text-sm font-medium whitespace-nowrap transition-all outline-none select-none text-text-secondary hover:bg-[#1E3352]/40 px-2.5 h-8 text-xs"
                        >
                          <Download className="w-4 h-4 mr-2" /> Download PDF
                        </a>
                      )}
                    </>
                  )}

                  <Button
                    variant="outline"
                    onClick={handleExportCSV}
                    className="border-border/30 text-text-secondary hover:bg-[#1E3352]/40 text-xs"
                  >
                    <Download className="w-4 h-4 mr-2" /> Export CSV
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Integrations Health Card */}
            <Card className="bg-bg-card border-border/30 text-text-primary">
              <CardHeader className="pb-3 border-b border-border/30/50">
                <CardTitle className="text-lg font-semibold text-text-primary flex items-center gap-2">
                  <Globe className="w-5 h-5 text-blue-400" />
                  Integration Health
                </CardTitle>
                <CardDescription className="text-text-secondary text-xs">
                  OAuth connections needed for auto-compiling data.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-5 space-y-4">
                <div className="space-y-3.5">
                  <div className="flex justify-between items-center bg-[#0A1628] border border-border/30/40 p-2.5 rounded-lg">
                    <span className="text-xs font-semibold text-text-primary">Google Search Console</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${isGscConnected ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-[#1E3352]/40 text-gray-400 border border-border/30/60'}`}>
                      {isGscConnected ? 'Connected' : 'Not Connected'}
                    </span>
                  </div>

                  <div className="flex justify-between items-center bg-[#0A1628] border border-border/30/40 p-2.5 rounded-lg">
                    <span className="text-xs font-semibold text-text-primary">Google Analytics 4</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${isGa4Connected ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-[#1E3352]/40 text-gray-400 border border-border/30/60'}`}>
                      {isGa4Connected ? 'Connected' : 'Not Connected'}
                    </span>
                  </div>

                  <div className="flex justify-between items-center bg-[#0A1628] border border-border/30/40 p-2.5 rounded-lg">
                    <span className="text-xs font-semibold text-text-primary">Meta Ads Insights</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${isMetaConnected ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-[#1E3352]/40 text-gray-400 border border-border/30/60'}`}>
                      {isMetaConnected ? 'Connected' : 'Not Connected'}
                    </span>
                  </div>

                  <div className="flex justify-between items-center bg-[#0A1628] border border-border/30/40 p-2.5 rounded-lg">
                    <span className="text-xs font-semibold text-text-primary">Google Ads API</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${isGoogleAdsConnected ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-[#1E3352]/40 text-gray-400 border border-border/30/60'}`}>
                      {isGoogleAdsConnected ? 'Connected' : 'Not Connected'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* MoM Performance Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Card 1: Organic Traffic */}
            <Card className="bg-bg-card border-border/30 text-text-primary hover:border-blue-900 transition-colors">
              <CardContent className="pt-6">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs text-text-secondary font-semibold uppercase tracking-wider">Organic Traffic</span>
                  <div className="p-1.5 bg-blue-900/30 rounded-lg text-blue-400">
                    <Globe className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-bold mb-1.5">{currentTraffic.toLocaleString()}</div>
                <div>{renderMoM(currentTraffic, previousTraffic)}</div>
              </CardContent>
            </Card>

            {/* Card 2: Organic Clicks */}
            <Card className="bg-bg-card border-border/30 text-text-primary hover:border-blue-900 transition-colors">
              <CardContent className="pt-6">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs text-text-secondary font-semibold uppercase tracking-wider">Search Clicks</span>
                  <div className="p-1.5 bg-blue-900/30 rounded-lg text-blue-400">
                    <FileText className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-bold mb-1.5">{currentClicks.toLocaleString()}</div>
                <div>{renderMoM(currentClicks, previousClicks)}</div>
              </CardContent>
            </Card>

            {/* Card 3: Ad Spend */}
            <Card className="bg-bg-card border-border/30 text-text-primary hover:border-blue-900 transition-colors">
              <CardContent className="pt-6">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs text-text-secondary font-semibold uppercase tracking-wider">Total Ad Spend</span>
                  <div className="p-1.5 bg-blue-900/30 rounded-lg text-blue-400">
                    <Share2 className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-bold mb-1.5">
                  ₹{totalAdSpend.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </div>
                <div className="text-xs text-text-secondary flex items-center font-normal">
                  Meta + Google Ads combined
                </div>
              </CardContent>
            </Card>

            {/* Card 4: Leads / Conversions */}
            <Card className="bg-bg-card border-border/30 text-text-primary hover:border-blue-900 transition-colors">
              <CardContent className="pt-6">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs text-text-secondary font-semibold uppercase tracking-wider">Leads & Conversions</span>
                  <div className="p-1.5 bg-blue-900/30 rounded-lg text-blue-400">
                    <CheckCircle className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-bold mb-1.5">{totalConversions.toLocaleString()}</div>
                <div>{renderMoM(totalConversions, prevTotalConversions)}</div>
              </CardContent>
            </Card>
          </div>

          {/* Compiled Channels Review */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* SEO & Keywords Summary */}
            <Card className="bg-bg-card border-border/30 text-text-primary">
              <CardHeader className="pb-3 border-b border-border/30/50">
                <CardTitle className="text-md font-semibold text-text-primary">SEO & Search Console Data</CardTitle>
                <CardDescription className="text-text-secondary text-xs">Keywords tracked and monthly averages.</CardDescription>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                {seoData ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-2 bg-[#0A1628] border border-border/30/40 p-3 rounded-lg text-center">
                      <div>
                        <div className="text-xs text-text-secondary">GSC Impressions</div>
                        <div className="text-md font-bold text-text-primary mt-0.5">{(seoData.gsc_impressions ?? 0).toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="text-xs text-text-secondary">Average Position</div>
                        <div className="text-md font-bold text-text-primary mt-0.5">{seoData.gsc_avg_position ?? 'N/A'}</div>
                      </div>
                      <div>
                        <div className="text-xs text-text-secondary">CTR %</div>
                        <div className="text-md font-bold text-text-primary mt-0.5">{seoData.gsc_ctr ? `${seoData.gsc_ctr}%` : 'N/A'}</div>
                      </div>
                    </div>

                    <div className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">Tracked Keywords Summary</div>
                    {keywordsData.length > 0 ? (
                      <div className="max-h-[160px] overflow-y-auto border border-border/30/50 rounded-lg">
                        <table className="w-full text-xs text-text-secondary text-left">
                          <thead className="bg-[#0A1628] text-text-primary uppercase text-[10px] border-b border-border/30/50 sticky top-0">
                            <tr>
                              <th className="px-3 py-2">Keyword</th>
                              <th className="px-3 py-2 text-center">Current Pos</th>
                              <th className="px-3 py-2 text-center">Difficulty</th>
                            </tr>
                          </thead>
                          <tbody>
                            {keywordsData.slice(0, 5).map((kw, i) => (
                              <tr key={i} className="border-b border-border/30/30 hover:bg-[#1E3352]/20">
                                <td className="px-3 py-2 text-text-primary">{kw.keyword}</td>
                                <td className="px-3 py-2 text-center font-semibold text-blue-400">{kw.current_position ?? 'N/A'}</td>
                                <td className="px-3 py-2 text-center">{kw.keyword_difficulty ?? 'N/A'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-center text-xs text-gray-500 py-6 bg-[#0A1628] rounded-lg border border-dashed border-border/30">
                        No tracked keywords for this month
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center text-xs text-text-secondary py-12">
                    No SEO Campaign records found for this month.
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Ads Summary */}
            <Card className="bg-bg-card border-border/30 text-text-primary">
              <CardHeader className="pb-3 border-b border-border/30/50">
                <CardTitle className="text-md font-semibold text-text-primary">Paid Campaigns Performance</CardTitle>
                <CardDescription className="text-text-secondary text-xs">Meta Ads and Google Ads performance details.</CardDescription>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {/* Meta Ads Box */}
                  <div className="bg-[#0A1628] border border-border/30/40 p-4 rounded-lg">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-text-primary mb-2 border-b border-border/30/50 pb-1.5">
                      <Facebook className="w-3.5 h-3.5 text-blue-500" /> Meta Campaigns ({metaData.length})
                    </div>
                    {metaData.length > 0 ? (
                      <div className="space-y-1 text-xs text-text-secondary">
                        <div className="flex justify-between">
                          <span>Spend:</span>
                          <span className="font-semibold text-text-primary">₹{metaSpend.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Leads:</span>
                          <span className="font-semibold text-emerald-400">{metaLeads}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Avg CPL:</span>
                          <span className="font-semibold text-blue-400">₹{metaAvgCpl.toFixed(2)}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center text-[10px] text-gray-500 py-6">
                        No Meta Campaigns active
                      </div>
                    )}
                  </div>

                  {/* Google Ads Box */}
                  <div className="bg-[#0A1628] border border-border/30/40 p-4 rounded-lg">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-text-primary mb-2 border-b border-border/30/50 pb-1.5">
                      <Calendar className="w-3.5 h-3.5 text-yellow-500" /> Google Campaigns ({googleAdsData.length})
                    </div>
                    {googleAdsData.length > 0 ? (
                      <div className="space-y-1 text-xs text-text-secondary">
                        <div className="flex justify-between">
                          <span>Spend:</span>
                          <span className="font-semibold text-text-primary">₹{gadsSpend.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Conversions:</span>
                          <span className="font-semibold text-emerald-400">{gadsConvs}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Cost/Conv:</span>
                          <span className="font-semibold text-blue-400">₹{gadsCostPerConv.toFixed(2)}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center text-[10px] text-gray-500 py-6">
                        No Google Campaigns active
                      </div>
                    )}
                  </div>
                </div>

                {/* Social media details */}
                <div className="bg-[#0A1628] border border-border/30/40 p-4 rounded-lg">
                  <div className="text-xs font-semibold text-text-primary mb-2">Social Media Organic Metrics</div>
                  {socialData.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs text-text-secondary text-center">
                      {socialData.map((s, idx) => (
                        <div key={idx} className="p-2 border border-border/30/30 rounded bg-bg-card/60">
                          <div className="font-semibold capitalize text-blue-400">{s.platform}</div>
                          <div className="text-[10px] text-gray-400 mt-0.5">Reach: {s.reach?.toLocaleString()}</div>
                          <div className="text-[10px] font-bold text-text-primary mt-0.5">Followers: {s.followers?.toLocaleString()}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center text-[10px] text-gray-500 py-2">
                      No SMM metrics logged for this month
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Client Specific Report History Table */}
          <Card className="bg-bg-card border-border/30 text-text-primary">
            <CardHeader className="pb-3 border-b border-border/30/50">
              <CardTitle className="text-md font-semibold text-text-primary">Report Archives</CardTitle>
              <CardDescription className="text-text-secondary text-xs">
                Generated PDF deliverables for {selectedClientData?.name}.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              {initialReports.filter(r => r.client_id === selectedClientId).length > 0 ? (
                <div className="overflow-x-auto border border-border/30/50 rounded-lg">
                  <table className="w-full text-xs text-text-secondary text-left">
                    <thead className="bg-[#0A1628] text-text-primary uppercase text-[10px] border-b border-border/30/50">
                      <tr>
                        <th className="px-4 py-3">Month</th>
                        <th className="px-4 py-3 text-center">Status</th>
                        <th className="px-4 py-3 text-center">Date Generated</th>
                        <th className="px-4 py-3 text-center">File Size</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {initialReports.filter(r => r.client_id === selectedClientId).map((r, i) => (
                        <tr key={i} className="border-b border-border/30/30 hover:bg-[#1E3352]/20">
                          <td className="px-4 py-3 font-semibold text-text-primary">{r.month_year}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider border ${
                              r.status === 'sent' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                            }`}>
                              {r.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">{new Date(r.created_at).toLocaleDateString()}</td>
                          <td className="px-4 py-3 text-center">{r.files?.size_bytes ? `${(r.files.size_bytes / 1024).toFixed(1)} KB` : 'N/A'}</td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex gap-2 justify-end">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  handleMonthChange(r.month_year);
                                  setActiveTab('preview');
                                }}
                                className="h-7 w-7 p-0 text-blue-400 hover:text-blue-300 hover:bg-blue-900/20"
                                title="View Portal Preview"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </Button>

                              {r.files?.public_url && (
                                <a
                                  href={r.files.public_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center justify-center rounded-lg border border-transparent text-text-secondary hover:text-text-primary hover:bg-[#1E3352]/40 h-7 w-7 p-0 transition-colors"
                                  title="Download PDF"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                </a>
                              )}

                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleSendReport(r.id)}
                                disabled={sendingReportId !== null}
                                className="h-7 w-7 p-0 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-900/20"
                                title="Send Report to Client"
                              >
                                {sendingReportId === r.id ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Send className="w-3.5 h-3.5" />
                                )}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center text-xs text-gray-500 py-10 bg-[#0A1628]/40 border border-dashed border-border/30 rounded-lg">
                  No historical reports generated for this client yet. Use the Report Compiler panel to create one.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </PageContainer>
  );
}
