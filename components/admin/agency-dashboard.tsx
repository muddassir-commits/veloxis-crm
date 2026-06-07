'use client';

/* eslint-disable @next/next/no-img-element */

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
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
  Link2,
  Link2Off,
  Loader2,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  FileText,
  FileImage,
  FileSpreadsheet,
  Archive,
  Eye,
  Trash2,
  Upload,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Copy,
  Settings,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatCard } from '@/components/shared/stat-card';
import { StatusBadge } from '@/components/shared/status-badge';
import { DataTable } from '@/components/shared/data-table';
import { formatCurrency, formatDate, formatBytes } from '@/lib/utils';
import { FileUpload } from '@/components/shared/file-upload';
import { SocialCalendar } from '@/components/admin/social/social-calendar';
import { SchedulePostModal } from '@/components/admin/social/schedule-post-modal';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { SocialListView } from '@/components/admin/social/social-list-view';
import {
  SeoCampaign,
  SeoKeyword,
  SocialMediaMetrics,
  AgencyWhatsappCampaign,
  AgencyEmailCampaign,
  AgencyOwnAdCampaign,
  FileRecord,
} from '@/types';
import { PostWithClient } from '@/components/admin/social/social-dashboard';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
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
  brandFiles: FileRecord[];
  socialPosts: PostWithClient[];
}

export function AgencyDashboard({
  clientId,
  seoCampaigns,
  seoKeywords,
  socialMetrics,
  whatsappCampaigns,
  emailCampaigns,
  adCampaigns,
  brandFiles,
  socialPosts,
}: AgencyDashboardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  // Collapsible Integrations Panel
  const [integrationsOpen, setIntegrationsOpen] = useState(false);
  const [integrationStatus, setIntegrationStatus] = useState<{
    gsc: { connected: boolean; propertyUrl?: string; lastSync?: string } | null;
    ga4: { connected: boolean; propertyId?: string; lastSync?: string } | null;
    meta: { connected: boolean; adAccountId?: string; lastSync?: string } | null;
    google: { connected: boolean; customerId?: string; lastSync?: string } | null;
  }>({ gsc: null, ga4: null, meta: null, google: null });
  const [syncingService, setSyncingService] = useState<string | null>(null);
  const [disconnectingService, setDisconnectingService] = useState<string | null>(null);
  const [ga4PropertyModalOpen, setGa4PropertyModalOpen] = useState(false);
  const [ga4PropertyId, setGa4PropertyId] = useState('');
  const [gscPropertyModalOpen, setGscPropertyModalOpen] = useState(false);
  const [gscPropertyUrl, setGscPropertyUrl] = useState('');
  const [metaConnectOpen, setMetaConnectOpen] = useState(false);
  const [googleConnectOpen, setGoogleConnectOpen] = useState(false);
  const [adAccountIdInput, setAdAccountIdInput] = useState('');
  const [customerIdInput, setCustomerIdInput] = useState('');
  const [connecting, setConnecting] = useState(false);

  const fetchIntegrationStatus = useCallback(async () => {
    try {
      let gscData = null;
      let ga4Data = null;
      let metaData = null;
      let googleData = null;

      try {
        const { data } = await supabase.from('gsc_connections').select('*').eq('client_id', clientId).maybeSingle();
        gscData = data;
      } catch (e) {
        console.warn('GSC table not available or error:', e);
      }

      try {
        const { data } = await supabase.from('ga4_connections').select('*').eq('client_id', clientId).maybeSingle();
        ga4Data = data;
      } catch (e) {
        console.warn('GA4 table not available or error:', e);
      }

      try {
        const { data } = await supabase.from('meta_connections').select('*').eq('client_id', clientId).maybeSingle();
        metaData = data;
      } catch (e) {
        console.warn('Meta connections table not available or error:', e);
      }

      try {
        const { data } = await supabase.from('google_ads_connections').select('*').eq('client_id', clientId).maybeSingle();
        googleData = data;
      } catch (e) {
        console.warn('Google Ads connections table not available or error:', e);
      }

      setIntegrationStatus({
        gsc: gscData
          ? { connected: gscData.is_active, propertyUrl: gscData.property_url, lastSync: gscData.last_sync }
          : { connected: false },
        ga4: ga4Data
          ? { connected: ga4Data.is_active, propertyId: ga4Data.property_id, lastSync: ga4Data.last_sync }
          : { connected: false },
        meta: metaData
          ? { connected: metaData.is_active, adAccountId: metaData.ad_account_id, lastSync: metaData.last_sync }
          : { connected: false },
        google: googleData
          ? { connected: googleData.is_active, customerId: googleData.customer_id, lastSync: googleData.last_sync }
          : { connected: false },
      });
    } catch (err) {
      console.error('Failed to load agency integrations status.', err);
    }
  }, [clientId, supabase]);

  const handleSync = useCallback(async (service: 'gsc' | 'ga4' | 'meta' | 'google') => {
    setSyncingService(service);
    try {
      let endpoint = '';
      if (service === 'ga4') endpoint = `/api/integrations/ga4/sync/${clientId}`;
      else if (service === 'gsc') endpoint = `/api/integrations/gsc/sync/${clientId}`;
      else if (service === 'meta') endpoint = `/api/integrations/meta/sync/${clientId}`;
      else if (service === 'google') endpoint = `/api/integrations/google-ads/sync/${clientId}`;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      toast.success(`${service === 'google' ? 'Google Ads' : service === 'meta' ? 'Meta Ads' : service.toUpperCase()} data synced successfully!`);
      fetchIntegrationStatus();
    } catch (err) {
      const error = err as Error;
      toast.error(`Sync failed: ${error.message}`);
    } finally {
      setSyncingService(null);
    }
  }, [clientId, fetchIntegrationStatus]);

  const handleConnectGoogle = (service: 'gsc' | 'ga4') => {
    window.location.href = `/api/integrations/gsc/auth?client_id=${clientId}&service=${service}`;
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
        body: JSON.stringify({ clientId, adAccountId: adAccountIdInput.trim() }),
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

  const handleConnectGoogleAds = async () => {
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
        body: JSON.stringify({ clientId, customerId: customerIdInput.trim() }),
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
        body: JSON.stringify({ clientId, propertyId: ga4PropertyId.trim() }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      toast.success('GA4 Property ID saved. Syncing data...');
      setGa4PropertyModalOpen(false);
      setGa4PropertyId('');
      fetchIntegrationStatus();
      handleSync('ga4');
    } catch (err) {
      const error = err as Error;
      toast.error(error.message || 'Failed to save GA4 Property');
    } finally {
      setConnecting(false);
    }
  };

  const handleSaveGscProperty = async () => {
    if (!gscPropertyUrl.trim()) {
      toast.error('Please enter a GSC Property URL.');
      return;
    }
    setConnecting(true);
    try {
      const res = await fetch('/api/integrations/gsc/property', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, propertyUrl: gscPropertyUrl.trim() }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      toast.success('GSC Property URL saved. Syncing data...');
      setGscPropertyModalOpen(false);
      setGscPropertyUrl('');
      fetchIntegrationStatus();
      handleSync('gsc');
    } catch (err) {
      const error = err as Error;
      toast.error(error.message || 'Failed to save GSC Property');
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async (service: 'gsc' | 'ga4' | 'meta' | 'google') => {
    setDisconnectingService(service);
    try {
      let table = '';
      if (service === 'gsc') table = 'gsc_connections';
      else if (service === 'ga4') table = 'ga4_connections';
      else if (service === 'meta') table = 'meta_connections';
      else if (service === 'google') table = 'google_ads_connections';

      const { error } = await supabase
        .from(table)
        .update({ is_active: false })
        .eq('client_id', clientId);
      if (error) throw error;
      toast.success(`${service === 'google' ? 'Google Ads' : service === 'meta' ? 'Meta Ads' : service.toUpperCase()} disconnected.`);
      fetchIntegrationStatus();
    } catch {
      toast.error('Failed to disconnect.');
    } finally {
      setDisconnectingService(null);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchIntegrationStatus();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchIntegrationStatus]);

  useEffect(() => {
    const oauthSuccess = searchParams.get('oauth_success');
    const oauthError = searchParams.get('oauth_error');
    if (oauthSuccess) {
      const timer = setTimeout(() => {
        if (oauthSuccess === 'gsc') {
          toast.success('GSC connected! Syncing...');
          handleSync('gsc');
        } else if (oauthSuccess === 'ga4') {
          toast.success('Google Analytics connected! Enter GA4 Property ID.');
          setGa4PropertyModalOpen(true);
        }
        router.replace('/dashboard/my-agency');
      }, 0);
      return () => clearTimeout(timer);
    }
    if (oauthError) {
      const timer = setTimeout(() => {
        toast.error(`OAuth error: ${decodeURIComponent(oauthError)}`);
        router.replace('/dashboard/my-agency');
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [searchParams, router, handleSync]);

  useEffect(() => {
    // Listen to SEO, social, WhatsApp, email, and own ads updates
    const channel = supabase
      .channel(`agency-dashboard-${clientId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'seo_campaigns', filter: `client_id=eq.${clientId}` },
        () => {
          toast.success('Live Update: SEO Campaign metrics synchronized!');
          router.refresh();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'social_media_metrics', filter: `client_id=eq.${clientId}` },
        () => {
          toast.success('Live Update: Social Media statistics synchronized!');
          router.refresh();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'agency_whatsapp_campaigns' },
        () => {
          toast.success('Live Update: WhatsApp campaign broadcasts statistics updated!');
          router.refresh();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'agency_email_campaigns' },
        () => {
          toast.success('Live Update: Email marketing newsletter statistics updated!');
          router.refresh();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'agency_own_ad_campaigns' },
        () => {
          toast.success('Live Update: Paid Ads campaign performance updated!');
          router.refresh();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [clientId, supabase, router]);

  const [activeTab, setActiveTab] = useState('overview');
  const [socialPlatform, setSocialPlatform] = useState('all');
  const [adsPlatform, setAdsPlatform] = useState('all');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Brand Assets states
  const [assetCategory, setAssetCategory] = useState<'logos' | 'templates' | 'brand'>('logos');
  const [assetUploadOpen, setAssetUploadOpen] = useState(false);
  const [deleteBrandFile, setDeleteBrandFile] = useState<FileRecord | null>(null);

  // Content Planner states
  const [plannerDate, setPlannerDate] = useState<Date>(new Date(2026, 5, 1)); // June 2026 default
  const [plannerScheduleOpen, setPlannerScheduleOpen] = useState(false);
  const [plannerPrefilledDate, setPlannerPrefilledDate] = useState<Date | null>(null);
  const [deletePostId, setDeletePostId] = useState<string | null>(null);
  const [plannerView, setPlannerView] = useState<'calendar' | 'list'>('calendar');

  // Mapped social posts for content planner
  const socialPostsMapped: PostWithClient[] = (socialPosts || []).map((post) => ({
    ...post,
    clients: {
      name: 'Veloxis Global',
      is_agency_self: true,
    },
    profiles: post.profiles ? {
      full_name: post.profiles.full_name,
    } : undefined,
  }));

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

  // Copy Link Helper
  const handleCopyLink = (url: string | null) => {
    if (!url) {
      toast.error('No public URL available for this file.');
      return;
    }
    navigator.clipboard.writeText(url);
    toast.success('Public URL copied to clipboard!');
  };

  // Delete Brand File Helper
  const handleDeleteBrandFileConfirm = async () => {
    if (!deleteBrandFile) return;
    const toastId = toast.loading('Deleting asset...');
    try {
      const res = await fetch(`/api/files/delete/${deleteBrandFile.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Deletion failed.');
      toast.success('Brand asset deleted successfully.', { id: toastId });
      setDeleteBrandFile(null);
      router.refresh();
    } catch {
      toast.error('Failed to delete brand asset.', { id: toastId });
    }
  };

  // Delete Planner Post Helper
  const handleDeletePostConfirm = async () => {
    if (!deletePostId) return;
    const toastId = toast.loading('Removing post from planner...');
    try {
      const { error } = await supabase.from('social_posts').delete().eq('id', deletePostId);
      if (error) throw error;
      toast.success('Post removed from planner.', { id: toastId });
      setDeletePostId(null);
      router.refresh();
    } catch {
      toast.error('Failed to delete planner post.', { id: toastId });
    }
  };

  // Brand Assets categories filtering
  const filteredBrandFiles = brandFiles.filter((file) => {
    const pathLower = file.storage_path.toLowerCase();
    const tagsLower = file.tags?.map(t => t.toLowerCase()) || [];
    if (assetCategory === 'logos') {
      return pathLower.includes('/logos/') || tagsLower.includes('logos') || tagsLower.includes('logo');
    }
    if (assetCategory === 'templates') {
      return pathLower.includes('/templates/') || tagsLower.includes('templates') || tagsLower.includes('template');
    }
    return !pathLower.includes('/logos/') && !pathLower.includes('/templates/') && !tagsLower.includes('logos') && !tagsLower.includes('templates') && !tagsLower.includes('logo') && !tagsLower.includes('template');
  });

  // Calendar month navigator helper
  const navigatePlannerMonth = (direction: 'prev' | 'next') => {
    const d = new Date(plannerDate);
    if (direction === 'prev') {
      d.setMonth(d.getMonth() - 1);
    } else {
      d.setMonth(d.getMonth() + 1);
    }
    setPlannerDate(d);
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
        <div className="bg-bg-card border border-border/30 rounded-[10px] p-4 flex flex-col justify-between h-[100px] hover:border-border/50 transition-all">
          <div>
            <div className="text-[10px] uppercase font-bold text-text-tertiary tracking-wider select-none">
              Organic Traffic
            </div>
            <div className="text-xl font-bold font-mono text-text-primary mt-1 select-all">
              {trafficVal.toLocaleString()}
            </div>
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-[10px] text-online font-semibold select-none">
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
        <div className="bg-bg-card border border-border/30 rounded-[10px] p-4 flex flex-col justify-between h-[100px] hover:border-border/50 transition-all">
          <div>
            <div className="text-[10px] uppercase font-bold text-text-tertiary tracking-wider select-none">
              Keywords Top 10
            </div>
            <div className="text-xl font-bold font-mono text-text-primary mt-1 select-all">
              {keywordsVal}
            </div>
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-[10px] text-text-secondary/60 select-none">Tracked Search Term</span>
            {renderSparkline(keywordsSparkline, CHART_COLORS.success)}
          </div>
        </div>

        {/* KPI 3 — Instagram Followers */}
        <div className="bg-bg-card border border-border/30 rounded-[10px] p-4 flex flex-col justify-between h-[100px] hover:border-border/50 transition-all">
          <div>
            <div className="text-[10px] uppercase font-bold text-text-tertiary tracking-wider select-none">
              Insta Followers
            </div>
            <div className="text-xl font-bold font-mono text-text-primary mt-1 select-all">
              {followersVal.toLocaleString()}
            </div>
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-[10px] text-[#8B5CF6] font-semibold select-none">Instagram Brand</span>
            {renderSparkline(socialSparkline, CHART_COLORS.purple)}
          </div>
        </div>

        {/* KPI 4 — Total Ad Leads */}
        <div className="bg-bg-card border border-border/30 rounded-[10px] p-4 flex flex-col justify-between h-[100px] hover:border-border/50 transition-all">
          <div>
            <div className="text-[10px] uppercase font-bold text-text-tertiary tracking-wider select-none">
              Ad Leads (Mo)
            </div>
            <div className="text-xl font-bold font-mono text-text-primary mt-1 select-all">
              {totalLeads}
            </div>
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-[10px] text-accent font-mono font-semibold select-none">
              {avgCplVal > 0 ? `₹${avgCplVal} CPL` : 'No spend'}
            </span>
            {renderSparkline(adLeadsSparkline, CHART_COLORS.secondary)}
          </div>
        </div>

        {/* KPI 5 — Email Open Rate */}
        <div className="bg-bg-card border border-border/30 rounded-[10px] p-4 flex flex-col justify-between h-[100px] hover:border-border/50 transition-all">
          <div>
            <div className="text-[10px] uppercase font-bold text-text-tertiary tracking-wider select-none">
              Email Open Rate
            </div>
            <div className="text-xl font-bold font-mono text-text-primary mt-1 select-all">
              {emailOpenRateVal}%
            </div>
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-[10px] text-text-secondary/60 select-none">Resend Campaigns</span>
            {renderSparkline(emailOpenSparkline, CHART_COLORS.cyan)}
          </div>
        </div>

        {/* KPI 6 — WA Messages Sent */}
        <div className="bg-bg-card border border-border/30 rounded-[10px] p-4 flex flex-col justify-between h-[100px] hover:border-border/50 transition-all">
          <div>
            <div className="text-[10px] uppercase font-bold text-text-tertiary tracking-wider select-none">
              WA Messages Sent
            </div>
            <div className="text-xl font-bold font-mono text-text-primary mt-1 select-all">
              {waSentVal.toLocaleString()}
            </div>
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-[10px] text-online font-semibold select-none">WhatsApp Bot</span>
            {renderSparkline(whatsappSentSparkline, CHART_COLORS.success)}
          </div>
        </div>
      </div>

      {/* ━━━ SECTION 2: TABBED DEPARTMENT VIEW ━━━ */}
      <div className="space-y-4">
        {/* Navigation Tabs Header */}
        <div className="border-b border-border/30 flex items-center gap-2 select-none overflow-x-auto">
          {[
            { id: 'overview', label: 'overview' },
            { id: 'seo', label: 'seo' },
            { id: 'social', label: 'social' },
            { id: 'ads', label: 'lead-gen ads' },
            { id: 'email', label: 'email' },
            { id: 'whatsapp', label: 'whatsapp' },
            { id: 'brand-assets', label: 'brand assets' },
            { id: 'content-planner', label: 'content planner' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider border-b-2 cursor-pointer transition-all ${
                activeTab === tab.id
                  ? 'border-primary text-text-primary'
                  : 'border-transparent text-text-secondary hover:text-text-primary'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab contents */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
            {/* Left 65% Column — Radar Chart */}
            <div className="lg:col-span-6 bg-bg-card border border-border/30 rounded-[10px] p-5 flex flex-col justify-between h-[380px]">
              <div>
                <h3 className="text-sm font-semibold text-text-primary select-none flex items-center gap-2">
                  <Award size={15} className="text-[#1B4FD8]" />
                  <span>All Channels Performance (Scores)</span>
                </h3>
                <p className="text-[10px] text-text-tertiary mt-0.5 select-none uppercase tracking-wide">
                  Target vs Actual Performance Scores
                </p>
              </div>
              <div className="flex-1 flex justify-center items-center">
                <ResponsiveContainer width="100%" height={260}>
                  <RadarChart cx="50%" cy="50%" outerRadius={85} data={radarData}>
                    <PolarGrid stroke="var(--color-border-subtle)" />
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
              <div className="bg-bg-card border border-border/30 rounded-[10px] p-5 space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-text-tertiary select-none">
                  Monthly Growth Target KPIs
                </h3>
                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between border-b border-border/30/20 pb-2">
                    <span className="text-text-secondary">New Leads</span>
                    <span className="text-text-primary font-semibold select-all">8 / 20 leads (🟡)</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-border/30/20 pb-2">
                    <span className="text-text-secondary">Website Traffic</span>
                    <span className="text-text-primary font-semibold select-all">{trafficVal} / 500 visits (🟡)</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-border/30/20 pb-2">
                    <span className="text-text-secondary">Insta Followers</span>
                    <span className="text-text-primary font-semibold select-all">+{socialMetrics?.length ? socialMetrics[0].new_followers : 0} / +100 (🟡)</span>
                  </div>
                  <div className="flex items-center justify-between pb-1">
                    <span className="text-text-secondary">Clients Won</span>
                    <span className="text-error font-semibold select-all">0 / 2 clients (🔴)</span>
                  </div>
                </div>
              </div>

              {/* Traffic Sources Pie */}
              <div className="bg-bg-card border border-border/30 rounded-[10px] p-5 flex flex-col justify-between h-[210px]">
                <h3 className="text-xs font-bold uppercase tracking-wider text-text-tertiary select-none">
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
                      <div key={entry.name} className="flex items-center gap-1.5 text-text-secondary">
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
              <div className="bg-bg-card border border-border/30 rounded-[10px] p-5 h-[280px]">
                <h4 className="text-xs font-bold uppercase tracking-wider text-text-tertiary select-none mb-4">
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
                      <CartesianGrid stroke="var(--color-border-subtle)" strokeDasharray="3 3" vertical={false} opacity={0.3} />
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
              <div className="bg-bg-card border border-border/30 rounded-[10px] p-5 h-[280px]">
                <h4 className="text-xs font-bold uppercase tracking-wider text-text-tertiary select-none mb-4">
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
                      <CartesianGrid stroke="var(--color-border-subtle)" strokeDasharray="3 3" vertical={false} opacity={0.3} />
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
              <h4 className="text-xs font-bold uppercase tracking-wider text-text-tertiary select-none">
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
                      if (!prev) return <span className="text-text-secondary">-</span>;
                      const diff = prev - curr; // position decrease is positive (e.g. 5 to 3 is improvement of 2)
                      if (diff > 0) return <span className="text-online font-semibold">↑ {diff}</span>;
                      if (diff < 0) return <span className="text-error font-semibold">↓ {Math.abs(diff)}</span>;
                      return <span className="text-text-secondary">No change</span>;
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

            {/* ━━━ COLLAPSIBLE INTEGRATIONS PANEL ━━━ */}
            <div className="border border-border/30 rounded-[10px] bg-bg-card/30">
              <button
                onClick={() => setIntegrationsOpen(!integrationsOpen)}
                className="w-full flex items-center justify-between p-4 text-xs font-semibold text-text-primary select-none hover:bg-bg-card/50 transition-all rounded-[10px]"
              >
                <div className="flex items-center gap-2">
                  <Link2 size={14} className="text-primary-light" />
                  <span>Agency API Integrations (GSC, GA4, Meta & Google Ads)</span>
                </div>
                {integrationsOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>

              {integrationsOpen && (
                <div className="p-4 border-t border-border/30/40 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* GSC Card */}
                  <div className={`p-4 rounded-lg border ${integrationStatus.gsc?.connected ? 'bg-bg-card border-online/30' : 'bg-[#0A1220] border-border/30'} flex flex-col justify-between h-40`}>
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-text-primary">Google Search Console</span>
                        {integrationStatus.gsc?.connected ? (
                          <span className="text-[9px] font-bold text-online bg-online/10 px-2 py-0.5 rounded-full border border-online/20">CONNECTED</span>
                        ) : (
                          <span className="text-[9px] font-bold text-text-tertiary bg-bg-card-hover/20 px-2 py-0.5 rounded-full border border-border/30">NOT CONNECTED</span>
                        )}
                      </div>
                      <p className="text-[10px] text-text-secondary mt-2 leading-relaxed">
                        {integrationStatus.gsc?.connected
                          ? `Property: ${integrationStatus.gsc.propertyUrl || 'Linked'}`
                          : 'Connect search console accounts to pull keywords list.'}
                      </p>
                      {integrationStatus.gsc?.connected && integrationStatus.gsc.lastSync && (
                        <p className="text-[9px] text-text-tertiary mt-1">Last Synced: {formatDate(integrationStatus.gsc.lastSync)}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {!integrationStatus.gsc?.connected ? (
                        <Button size="sm" onClick={() => handleConnectGoogle('gsc')} className="bg-primary hover:bg-primary-light text-white text-[10px] h-7 px-3 cursor-pointer">
                          <Link2 size={11} className="mr-1" />
                          Connect GSC
                        </Button>
                      ) : (
                        <>
                          <Button size="sm" onClick={() => handleSync('gsc')} disabled={syncingService === 'gsc'} className="bg-bg-card-hover/20 hover:bg-bg-card-hover/40 border border-border/30 text-text-secondary text-[10px] h-7 px-3 cursor-pointer">
                            {syncingService === 'gsc' ? <Loader2 size={10} className="animate-spin mr-1" /> : <RefreshCw size={10} className="mr-1" />}
                            Sync
                          </Button>
                          <Button size="sm" onClick={() => { setGscPropertyUrl(integrationStatus.gsc?.propertyUrl || ''); setGscPropertyModalOpen(true); }} className="bg-bg-card-hover/20 hover:bg-bg-card-hover/40 border border-border/30 text-text-secondary text-[10px] h-7 px-3 cursor-pointer">
                            <Settings size={10} className="mr-1" />
                            Configure
                          </Button>
                          <Button size="sm" onClick={() => handleDisconnect('gsc')} disabled={disconnectingService === 'gsc'} className="bg-transparent border border-error/30 text-error/70 hover:bg-error/10 text-[10px] h-7 px-3 cursor-pointer">
                            <Link2Off size={10} className="mr-1" />
                            Disconnect
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* GA4 Card */}
                  <div className={`p-4 rounded-lg border ${integrationStatus.ga4?.connected ? 'bg-bg-card border-online/30' : 'bg-[#0A1220] border-border/30'} flex flex-col justify-between h-40`}>
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-text-primary">Google Analytics 4</span>
                        {integrationStatus.ga4?.connected ? (
                          <span className="text-[9px] font-bold text-online bg-online/10 px-2 py-0.5 rounded-full border border-online/20">CONNECTED</span>
                        ) : (
                          <span className="text-[9px] font-bold text-text-tertiary bg-bg-card-hover/20 px-2 py-0.5 rounded-full border border-border/30">NOT CONNECTED</span>
                        )}
                      </div>
                      <p className="text-[10px] text-text-secondary mt-2 leading-relaxed">
                        {integrationStatus.ga4?.connected
                          ? `Property ID: ${integrationStatus.ga4.propertyId || 'Linked'}`
                          : 'Connect analytics property to sync organic session statistics.'}
                      </p>
                      {integrationStatus.ga4?.connected && integrationStatus.ga4.lastSync && (
                        <p className="text-[9px] text-text-tertiary mt-1">Last Synced: {formatDate(integrationStatus.ga4.lastSync)}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {!integrationStatus.ga4?.connected ? (
                        <Button size="sm" onClick={() => handleConnectGoogle('ga4')} className="bg-primary hover:bg-primary-light text-white text-[10px] h-7 px-3 cursor-pointer">
                          <Link2 size={11} className="mr-1" />
                          Connect GA4
                        </Button>
                      ) : (
                        <>
                          <Button size="sm" onClick={() => handleSync('ga4')} disabled={syncingService === 'ga4'} className="bg-bg-card-hover/20 hover:bg-bg-card-hover/40 border border-border/30 text-text-secondary text-[10px] h-7 px-3 cursor-pointer">
                            {syncingService === 'ga4' ? <Loader2 size={10} className="animate-spin mr-1" /> : <RefreshCw size={10} className="mr-1" />}
                            Sync
                          </Button>
                          <Button size="sm" onClick={() => handleDisconnect('ga4')} disabled={disconnectingService === 'ga4'} className="bg-transparent border border-error/30 text-error/70 hover:bg-error/10 text-[10px] h-7 px-3 cursor-pointer">
                            <Link2Off size={10} className="mr-1" />
                            Disconnect
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Meta Ads Card */}
                  <div className={`p-4 rounded-lg border ${integrationStatus.meta?.connected ? 'bg-bg-card border-online/30' : 'bg-[#0A1220] border-border/30'} flex flex-col justify-between h-40`}>
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-text-primary">Meta Ads Connection</span>
                        {integrationStatus.meta?.connected ? (
                          <span className="text-[9px] font-bold text-online bg-online/10 px-2 py-0.5 rounded-full border border-online/20">CONNECTED</span>
                        ) : (
                          <span className="text-[9px] font-bold text-text-tertiary bg-bg-card-hover/20 px-2 py-0.5 rounded-full border border-border/30">NOT CONNECTED</span>
                        )}
                      </div>
                      <p className="text-[10px] text-text-secondary mt-2 leading-relaxed">
                        {integrationStatus.meta?.connected
                          ? `Ad Account ID: ${integrationStatus.meta.adAccountId || 'Linked'}`
                          : 'Connect Meta Ad Account to sync advertising metrics.'}
                      </p>
                      {integrationStatus.meta?.connected && integrationStatus.meta.lastSync && (
                        <p className="text-[9px] text-text-tertiary mt-1">Last Synced: {formatDate(integrationStatus.meta.lastSync)}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {!integrationStatus.meta?.connected ? (
                        <Button size="sm" onClick={() => setMetaConnectOpen(true)} className="bg-primary hover:bg-primary-light text-white text-[10px] h-7 px-3 cursor-pointer">
                          <Link2 size={11} className="mr-1" />
                          Connect ID
                        </Button>
                      ) : (
                        <>
                          <Button size="sm" onClick={() => handleSync('meta')} disabled={syncingService === 'meta'} className="bg-bg-card-hover/20 hover:bg-bg-card-hover/40 border border-border/30 text-text-secondary text-[10px] h-7 px-3 cursor-pointer">
                            {syncingService === 'meta' ? <Loader2 size={10} className="animate-spin mr-1" /> : <RefreshCw size={10} className="mr-1" />}
                            Sync
                          </Button>
                          <Button size="sm" onClick={() => handleDisconnect('meta')} disabled={disconnectingService === 'meta'} className="bg-transparent border border-error/30 text-error/70 hover:bg-error/10 text-[10px] h-7 px-3 cursor-pointer">
                            <Link2Off size={10} className="mr-1" />
                            Disconnect
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Google Ads Card */}
                  <div className={`p-4 rounded-lg border ${integrationStatus.google?.connected ? 'bg-bg-card border-online/30' : 'bg-[#0A1220] border-border/30'} flex flex-col justify-between h-40`}>
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-text-primary">Google Ads Connection</span>
                        {integrationStatus.google?.connected ? (
                          <span className="text-[9px] font-bold text-online bg-online/10 px-2 py-0.5 rounded-full border border-online/20">CONNECTED</span>
                        ) : (
                          <span className="text-[9px] font-bold text-text-tertiary bg-bg-card-hover/20 px-2 py-0.5 rounded-full border border-border/30">NOT CONNECTED</span>
                        )}
                      </div>
                      <p className="text-[10px] text-text-secondary mt-2 leading-relaxed">
                        {integrationStatus.google?.connected
                          ? `Customer ID: ${integrationStatus.google.customerId || 'Linked'}`
                          : 'Connect Google Ads Customer ID to sync campaign performance.'}
                      </p>
                      {integrationStatus.google?.connected && integrationStatus.google.lastSync && (
                        <p className="text-[9px] text-text-tertiary mt-1">Last Synced: {formatDate(integrationStatus.google.lastSync)}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {!integrationStatus.google?.connected ? (
                        <Button size="sm" onClick={() => setGoogleConnectOpen(true)} className="bg-primary hover:bg-primary-light text-white text-[10px] h-7 px-3 cursor-pointer">
                          <Link2 size={11} className="mr-1" />
                          Connect ID
                        </Button>
                      ) : (
                        <>
                          <Button size="sm" onClick={() => handleSync('google')} disabled={syncingService === 'google'} className="bg-bg-card-hover/20 hover:bg-bg-card-hover/40 border border-border/30 text-text-secondary text-[10px] h-7 px-3 cursor-pointer">
                            {syncingService === 'google' ? <Loader2 size={10} className="animate-spin mr-1" /> : <RefreshCw size={10} className="mr-1" />}
                            Sync
                          </Button>
                          <Button size="sm" onClick={() => handleDisconnect('google')} disabled={disconnectingService === 'google'} className="bg-transparent border border-error/30 text-error/70 hover:bg-error/10 text-[10px] h-7 px-3 cursor-pointer">
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
          </div>
        )}

        {/* TAB 3: SOCIAL MEDIA */}
        {activeTab === 'social' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between select-none">
              <div className="flex items-center gap-1 bg-bg-card-hover/20 border border-border/30 p-0.5 rounded">
                {['all', 'instagram', 'facebook', 'linkedin'].map((plat) => (
                  <button
                    key={plat}
                    onClick={() => setSocialPlatform(plat)}
                    className={`px-3 py-1 rounded text-[10px] font-semibold uppercase cursor-pointer transition-all ${
                      socialPlatform === plat
                        ? 'bg-primary text-text-primary'
                        : 'text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    {plat}
                  </button>
                ))}
              </div>

              <Button
                onClick={() => setModalOpen((prev) => ({ ...prev, social: true }))}
                size="sm"
                className="bg-primary hover:bg-primary-light text-white text-xs h-8 gap-1 cursor-pointer font-semibold"
              >
                <Plus size={13} />
                <span>Log Social Data</span>
              </Button>
            </div>

            {/* Followers Trend Chart */}
            <div className="bg-bg-card border border-border/30 rounded-[10px] p-5 h-[280px]">
              <h4 className="text-xs font-bold uppercase tracking-wider text-text-tertiary select-none mb-4">
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
                    <CartesianGrid stroke="var(--color-border-subtle)" strokeDasharray="3 3" vertical={false} opacity={0.3} />
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
              <h4 className="text-xs font-bold uppercase tracking-wider text-text-tertiary select-none">
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
              <div className="flex items-center gap-1 bg-bg-card-hover/20 border border-border/30 p-0.5 rounded">
                {['all', 'meta', 'google'].map((plat) => (
                  <button
                    key={plat}
                    onClick={() => setAdsPlatform(plat)}
                    className={`px-3 py-1 rounded text-[10px] font-semibold uppercase cursor-pointer transition-all ${
                      adsPlatform === plat
                        ? 'bg-primary text-text-primary'
                        : 'text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    {plat}
                  </button>
                ))}
              </div>

              <Button
                onClick={() => setModalOpen((prev) => ({ ...prev, ad: true }))}
                size="sm"
                className="bg-primary hover:bg-primary-light text-white text-xs h-8 gap-1 cursor-pointer font-semibold"
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
                valueClassName="text-accent"
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
              <div className="bg-bg-card border border-border/30 rounded-[10px] p-5 h-[280px]">
                <h4 className="text-xs font-bold uppercase tracking-wider text-text-tertiary select-none mb-4">
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
                      <CartesianGrid stroke="var(--color-border-subtle)" strokeDasharray="3 3" vertical={false} opacity={0.3} />
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
              <div className="bg-bg-card border border-border/30 rounded-[10px] p-5 h-[280px]">
                <h4 className="text-xs font-bold uppercase tracking-wider text-text-tertiary select-none mb-4">
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
                      <CartesianGrid stroke="var(--color-border-subtle)" strokeDasharray="3 3" vertical={false} opacity={0.3} />
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
              <h4 className="text-xs font-bold uppercase tracking-wider text-text-tertiary select-none">
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
                className="bg-primary hover:bg-primary-light text-white text-xs h-8 gap-1 cursor-pointer font-semibold"
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
            <div className="bg-bg-card border border-border/30 rounded-[10px] p-5 h-[280px]">
              <h4 className="text-xs font-bold uppercase tracking-wider text-text-tertiary select-none mb-4">
                Email Open & Click Rate Performance (12 Months)
              </h4>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={emailCampaigns || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid stroke="var(--color-border-subtle)" strokeDasharray="3 3" vertical={false} opacity={0.3} />
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
              <h4 className="text-xs font-bold uppercase tracking-wider text-text-tertiary select-none">
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
                className="bg-primary hover:bg-primary-light text-white text-xs h-8 gap-1 cursor-pointer font-semibold"
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
              <div className="bg-bg-card border border-border/30 rounded-[10px] p-5 h-[280px]">
                <h4 className="text-xs font-bold uppercase tracking-wider text-text-tertiary select-none mb-4">
                  WhatsApp Campaign Message Volume (Sent/Read/Replied)
                </h4>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={whatsappCampaigns || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid stroke="var(--color-border-subtle)" strokeDasharray="3 3" vertical={false} opacity={0.3} />
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
              <div className="bg-bg-card border border-border/30 rounded-[10px] p-5 h-[280px]">
                <h4 className="text-xs font-bold uppercase tracking-wider text-text-tertiary select-none mb-4">
                  Read Rate Trend Line
                </h4>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={whatsappCampaigns || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid stroke="var(--color-border-subtle)" strokeDasharray="3 3" vertical={false} opacity={0.3} />
                      <XAxis dataKey="month_year" stroke="#4A6480" fontSize={10} axisLine={false} tickLine={false} />
                      <YAxis stroke="#4A6480" fontSize={10} axisLine={false} tickLine={false} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                      <Tooltip />
                      <ReferenceLine y={65} stroke="#4A6480" strokeDasharray="4 4" label={{ value: 'Industry Avg (65%)', fill: 'var(--color-text-tertiary)', fontSize: 10 }} />
                      <Line type="monotone" dataKey="read_rate" name="Read Rate" stroke={CHART_COLORS.success} strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Campaigns Table */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-text-tertiary select-none">
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

        {/* TAB 7: BRAND ASSETS LIBRARY */}
        {activeTab === 'brand-assets' && (
          <div className="space-y-6">
            {/* Category Folders Selection */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { id: 'logos', label: 'Logos & Icons', count: brandFiles.filter(f => f.storage_path.toLowerCase().includes('/logos/') || f.tags?.map(t => t.toLowerCase()).includes('logos') || f.tags?.map(t => t.toLowerCase()).includes('logo') || f.storage_path.toLowerCase().startsWith('logos/')).length, desc: 'Official brand assets, marks, and favicon templates.' },
                { id: 'templates', label: 'Proposal & Templates', count: brandFiles.filter(f => f.storage_path.toLowerCase().includes('/templates/') || f.tags?.map(t => t.toLowerCase()).includes('templates') || f.tags?.map(t => t.toLowerCase()).includes('template') || f.storage_path.toLowerCase().startsWith('templates/')).length, desc: 'Reusable slide decks, document headers, and PDF layouts.' },
                { id: 'brand', label: 'General Brand Files', count: brandFiles.filter(f => !f.storage_path.toLowerCase().includes('/logos/') && !f.storage_path.toLowerCase().includes('/templates/') && !f.storage_path.toLowerCase().startsWith('logos/') && !f.storage_path.toLowerCase().startsWith('templates/') && !f.tags?.map(t => t.toLowerCase()).includes('logos') && !f.tags?.map(t => t.toLowerCase()).includes('templates') && !f.tags?.map(t => t.toLowerCase()).includes('logo') && !f.tags?.map(t => t.toLowerCase()).includes('template')).length, desc: 'Corporate brochures, fonts, typography guidelines, and background wallpapers.' },
              ].map((folder) => (
                <div
                  key={folder.id}
                  onClick={() => setAssetCategory(folder.id as 'logos' | 'templates' | 'brand')}
                  className={`p-4 rounded-xl border cursor-pointer transition-all select-none flex flex-col justify-between h-[120px] ${
                    assetCategory === folder.id
                      ? 'bg-primary/10 border-primary shadow-lg shadow-[#1B4FD8]/5'
                      : 'bg-bg-card border-border/30 hover:border-primary/40 hover:bg-bg-card-hover/20/30'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="p-2 rounded bg-bg-dark text-[#1B4FD8]">
                      {folder.id === 'logos' && <FileImage size={18} className={assetCategory === folder.id ? 'text-[#1B4FD8]' : 'text-text-secondary'} />}
                      {folder.id === 'templates' && <FileText size={18} className={assetCategory === folder.id ? 'text-[#1B4FD8]' : 'text-text-secondary'} />}
                      {folder.id === 'brand' && <Archive size={18} className={assetCategory === folder.id ? 'text-[#1B4FD8]' : 'text-text-secondary'} />}
                    </div>
                    <span className="text-[10px] font-bold font-mono text-text-secondary bg-bg-card-hover/20 border border-border/30 px-2 py-0.5 rounded-full">
                      {folder.count} files
                    </span>
                  </div>
                  <div className="mt-2">
                    <h4 className="text-xs font-bold text-text-primary">{folder.label}</h4>
                    <p className="text-[10px] text-text-secondary mt-0.5 truncate leading-relaxed">{folder.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Folder Header Actions */}
            <div className="flex items-center justify-between border-b border-border/30/40 pb-2">
              <div>
                <h3 className="text-sm font-semibold text-text-primary capitalize">
                  {assetCategory === 'brand' ? 'General Brand Files' : `${assetCategory} Collection`}
                </h3>
                <p className="text-xs text-text-secondary mt-0.5">
                  Browse, copy public link, or manage documents in this category.
                </p>
              </div>
              <Button
                onClick={() => setAssetUploadOpen(true)}
                size="sm"
                className="bg-primary hover:bg-primary-light text-white text-xs h-8 gap-1 cursor-pointer font-semibold"
              >
                <Upload size={13} />
                <span>Upload to {assetCategory}</span>
              </Button>
            </div>

            {/* Assets Grid */}
            {filteredBrandFiles.length === 0 ? (
              <div className="py-12 border border-border/30 border-dashed rounded-lg text-center text-xs text-text-secondary space-y-2">
                <p className="font-semibold text-slate-500">No brand files uploaded in this folder</p>
                <p className="text-[10px] text-text-tertiary">Upload agency assets like logos, proposal PDFs, or style guides.</p>
                <Button
                  onClick={() => setAssetUploadOpen(true)}
                  size="sm"
                  variant="outline"
                  className="border-border/30 hover:bg-bg-card-hover/20 text-text-secondary text-xs h-8 cursor-pointer mt-2"
                >
                  <Upload size={12} className="mr-1" />
                  Upload First Asset
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredBrandFiles.map((file) => {
                  const isImage = file.mime_type?.startsWith('image/');
                  return (
                    <div
                      key={file.id}
                      className="bg-bg-card border border-border/30 rounded-lg overflow-hidden group hover:border-primary/40 transition-all flex flex-col justify-between"
                    >
                      {/* Thumbnail / Icon area */}
                      <div className="h-28 bg-bg-dark flex items-center justify-center border-b border-border/30/20 relative">
                        {isImage && file.public_url ? (
                          <img
                            src={file.public_url}
                            alt={file.name}
                            className="object-contain w-full h-full p-2 group-hover:scale-[1.03] transition-transform duration-200"
                          />
                        ) : (
                          <div className="p-4 rounded-full bg-bg-card-hover/20 text-[#1B4FD8]">
                            {file.mime_type?.includes('pdf') && <FileText size={24} />}
                            {file.mime_type?.includes('spreadsheet') || file.mime_type?.includes('xlsx') || file.mime_type?.includes('csv') ? <FileSpreadsheet size={24} /> : null}
                            {!file.mime_type?.includes('pdf') && !file.mime_type?.includes('spreadsheet') && !file.mime_type?.includes('xlsx') && !file.mime_type?.includes('csv') && <Archive size={24} />}
                          </div>
                        )}
                        <span className="absolute top-2 left-2 text-[8px] font-bold font-mono px-1.5 py-0.5 rounded bg-bg-card border border-border/30/50 text-text-secondary uppercase">
                          {file.mime_type?.split('/')[1] || 'binary'}
                        </span>
                      </div>

                      {/* File Details */}
                      <div className="p-3 space-y-2 flex-1 flex flex-col justify-between">
                        <div className="min-w-0">
                          <h5
                            className="text-xs font-bold text-text-primary truncate"
                            title={file.name}
                          >
                            {file.name}
                          </h5>
                          <div className="flex items-center justify-between text-[10px] text-text-secondary mt-1.5">
                            <span>{formatBytes(file.size_bytes || 0)}</span>
                            <span>{formatDate(file.created_at)}</span>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-1.5 pt-2 border-t border-border/30/20">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleCopyLink(file.public_url)}
                            className="h-7 w-7 rounded hover:bg-bg-card-hover/40 text-text-secondary hover:text-text-primary cursor-pointer"
                            title="Copy Public Link"
                          >
                            <Copy size={12} />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => window.open(file.public_url || '#', '_blank')}
                            className="h-7 w-7 rounded hover:bg-bg-card-hover/40 text-text-secondary hover:text-text-primary cursor-pointer"
                            title="View / Download"
                          >
                            <Eye size={12} />
                          </Button>
                          <div className="flex-1 flex justify-end">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => setDeleteBrandFile(file)}
                              className="h-7 w-7 rounded hover:bg-error/20 text-error/60 hover:text-error cursor-pointer"
                              title="Delete Asset"
                            >
                              <Trash2 size={12} />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 8: CONTENT PLANNER */}
        {activeTab === 'content-planner' && (
          <div className="space-y-6">
            {/* Header / Toolbar Row */}
            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 bg-bg-card border border-border/30 p-4 rounded-lg select-none">
              <div className="flex items-center gap-3">
                {/* Month Navigator */}
                <div className="flex items-center gap-1.5 bg-bg-dark border border-border/30 rounded-[7px] px-1.5 h-9">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navigatePlannerMonth('prev')}
                    className="h-6 w-6 text-text-secondary hover:text-text-primary hover:bg-bg-card-hover/20 rounded cursor-pointer"
                  >
                    <ChevronLeft size={14} />
                  </Button>
                  <span className="text-[11px] font-bold text-text-primary min-w-[80px] text-center font-mono select-none">
                    {plannerDate.toLocaleString('en-US', { month: 'short', year: 'numeric' })}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navigatePlannerMonth('next')}
                    className="h-6 w-6 text-text-secondary hover:text-text-primary hover:bg-bg-card-hover/20 rounded cursor-pointer"
                  >
                    <ChevronRight size={14} />
                  </Button>
                </div>

                {/* View Switcher Button Group */}
                <div className="flex items-center gap-1 bg-bg-dark border border-border/30 p-0.5 rounded-[7px] h-9">
                  <button
                    onClick={() => setPlannerView('calendar')}
                    className={`px-3 py-1 rounded text-[10px] font-semibold uppercase cursor-pointer transition-all flex items-center gap-1.5 ${
                      plannerView === 'calendar'
                        ? 'bg-primary text-text-primary'
                        : 'text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    <Calendar size={12} />
                    <span>Calendar</span>
                  </button>
                  <button
                    onClick={() => setPlannerView('list')}
                    className={`px-3 py-1 rounded text-[10px] font-semibold uppercase cursor-pointer transition-all flex items-center gap-1.5 ${
                      plannerView === 'list'
                        ? 'bg-primary text-text-primary'
                        : 'text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    <FileText size={12} />
                    <span>List View</span>
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3">
                <Button
                  onClick={() => {
                    setPlannerPrefilledDate(null);
                    setPlannerScheduleOpen(true);
                  }}
                  size="sm"
                  className="bg-primary hover:bg-primary-light text-white text-xs h-9 gap-1.5 font-semibold cursor-pointer"
                >
                  <Plus size={13} />
                  <span>Schedule Post</span>
                </Button>
              </div>
            </div>

            {/* Main Views */}
            {plannerView === 'calendar' ? (
              <SocialCalendar
                currentDate={plannerDate}
                posts={socialPostsMapped}
                onSelectDate={(date) => {
                  setPlannerPrefilledDate(date);
                  setPlannerScheduleOpen(true);
                }}
                onSelectPost={(post) => {
                  toast.info(`[${post.platform.toUpperCase()}] ${post.content_type || 'Post'} - Status: ${post.status.toUpperCase()}. Scheduled for ${new Date(post.scheduled_for || '').toLocaleString()}`);
                }}
              />
            ) : (
              <SocialListView
                posts={socialPostsMapped}
                onSelectPost={(post) => {
                  toast.info(`[${post.platform.toUpperCase()}] ${post.content_type || 'Post'} - Status: ${post.status.toUpperCase()}. Scheduled for ${new Date(post.scheduled_for || '').toLocaleString()}`);
                }}
                onEditPost={(post) => {
                  setPlannerPrefilledDate(new Date(post.scheduled_for || ''));
                  setPlannerScheduleOpen(true);
                }}
                onDeletePost={(post) => {
                  setDeletePostId(post.id);
                }}
              />
            )}
          </div>
        )}
      </div>

      {/* ━━━ MODAL: LOG SOCIAL MEDIA DATA ━━━ */}
      <Dialog open={modalOpen.social} onOpenChange={(open) => setModalOpen((prev) => ({ ...prev, social: open }))}>
        <DialogContent className="sm:max-w-[600px] select-none">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-text-primary">Log Social Media Metrics</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 my-2 text-xs">
            <div className="col-span-2">
              <label className="block text-[11px] font-semibold text-text-secondary mb-1">Social Platform *</label>
              <select
                className="w-full bg-bg-dark border border-border/30 rounded p-2 text-xs text-text-primary outline-none"
                value={socialForm.platform}
                onChange={(e) => setSocialForm((prev) => ({ ...prev, platform: e.target.value }))}
              >
                <option value="instagram">Instagram (@veloxisglobal)</option>
                <option value="facebook">Facebook page</option>
                <option value="linkedin">LinkedIn company page</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-text-secondary mb-1">Month-Year *</label>
              <input
                className="w-full bg-bg-dark border border-border/30 rounded p-2 text-xs text-text-primary outline-none font-mono"
                type="text"
                placeholder="Jun 2026"
                value={socialForm.month_year}
                onChange={(e) => setSocialForm((prev) => ({ ...prev, month_year: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-text-secondary mb-1">Followers Count *</label>
              <input
                className="w-full bg-bg-dark border border-border/30 rounded p-2 text-xs text-text-primary outline-none font-mono"
                type="number"
                placeholder="1000"
                value={socialForm.followers}
                onChange={(e) => setSocialForm((prev) => ({ ...prev, followers: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-text-secondary mb-1">New Followers</label>
              <input
                className="w-full bg-bg-dark border border-border/30 rounded p-2 text-xs text-text-primary outline-none font-mono"
                type="number"
                placeholder="50"
                value={socialForm.new_followers}
                onChange={(e) => setSocialForm((prev) => ({ ...prev, new_followers: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-text-secondary mb-1">Reach Volume</label>
              <input
                className="w-full bg-bg-dark border border-border/30 rounded p-2 text-xs text-text-primary outline-none font-mono"
                type="number"
                placeholder="2500"
                value={socialForm.reach}
                onChange={(e) => setSocialForm((prev) => ({ ...prev, reach: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-text-secondary mb-1">Impressions</label>
              <input
                className="w-full bg-bg-dark border border-border/30 rounded p-2 text-xs text-text-primary outline-none font-mono"
                type="number"
                placeholder="5000"
                value={socialForm.impressions}
                onChange={(e) => setSocialForm((prev) => ({ ...prev, impressions: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-text-secondary mb-1">Engagements</label>
              <input
                className="w-full bg-bg-dark border border-border/30 rounded p-2 text-xs text-text-primary outline-none font-mono"
                type="number"
                placeholder="150"
                value={socialForm.engagements}
                onChange={(e) => setSocialForm((prev) => ({ ...prev, engagements: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-text-secondary mb-1">Posts Published</label>
              <input
                className="w-full bg-bg-dark border border-border/30 rounded p-2 text-xs text-text-primary outline-none font-mono"
                type="number"
                placeholder="8"
                value={socialForm.posts_published}
                onChange={(e) => setSocialForm((prev) => ({ ...prev, posts_published: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-text-secondary mb-1">Profile Visits</label>
              <input
                className="w-full bg-bg-dark border border-border/30 rounded p-2 text-xs text-text-primary outline-none font-mono"
                type="number"
                placeholder="120"
                value={socialForm.profile_visits}
                onChange={(e) => setSocialForm((prev) => ({ ...prev, profile_visits: e.target.value }))}
              />
            </div>

            <div className="col-span-2">
              <label className="block text-[11px] font-semibold text-text-secondary mb-1">Website Click Redirects</label>
              <input
                className="w-full bg-bg-dark border border-border/30 rounded p-2 text-xs text-text-primary outline-none font-mono"
                type="number"
                placeholder="40"
                value={socialForm.website_clicks}
                onChange={(e) => setSocialForm((prev) => ({ ...prev, website_clicks: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" size="sm" onClick={() => setModalOpen((prev) => ({ ...prev, social: false }))} className="border-border/30 text-text-secondary hover:text-text-primary text-xs font-semibold cursor-pointer">
              Cancel
            </Button>
            <Button onClick={() => handleLogSubmit('social')} disabled={isSubmitting} size="sm" className="bg-primary hover:bg-primary-light text-white text-xs font-semibold cursor-pointer">
              {isSubmitting ? 'Saving...' : 'Save Metrics'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ━━━ MODAL: LOG AD CAMPAIGN ━━━ */}
      <Dialog open={modalOpen.ad} onOpenChange={(open) => setModalOpen((prev) => ({ ...prev, ad: open }))}>
        <DialogContent className="sm:max-w-[600px] select-none">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-text-primary">Log Ad Campaign Details</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 my-2 text-xs">
            <div>
              <label className="block text-[11px] font-semibold text-text-secondary mb-1">Platform *</label>
              <select
                className="w-full bg-bg-dark border border-border/30 rounded p-2 text-xs text-text-primary outline-none"
                value={adForm.platform}
                onChange={(e) => setAdForm((prev) => ({ ...prev, platform: e.target.value }))}
              >
                <option value="meta">Meta Ads (Facebook / Instagram)</option>
                <option value="google">Google Ads (Search / Display)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-text-secondary mb-1">Month-Year *</label>
              <input
                className="w-full bg-bg-dark border border-border/30 rounded p-2 text-xs text-text-primary outline-none font-mono"
                type="text"
                placeholder="Jun 2026"
                value={adForm.month_year}
                onChange={(e) => setAdForm((prev) => ({ ...prev, month_year: e.target.value }))}
              />
            </div>

            <div className="col-span-2">
              <label className="block text-[11px] font-semibold text-text-secondary mb-1">Campaign Name *</label>
              <input
                className="w-full bg-bg-dark border border-border/30 rounded p-2 text-xs text-text-primary outline-none"
                type="text"
                placeholder="Veloxis Kanpur Agency Leads Campaign"
                value={adForm.campaign_name}
                onChange={(e) => setAdForm((prev) => ({ ...prev, campaign_name: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-text-secondary mb-1">Campaign platform ID</label>
              <input
                className="w-full bg-bg-dark border border-border/30 rounded p-2 text-xs text-text-primary outline-none font-mono"
                type="text"
                placeholder="c_8928372"
                value={adForm.campaign_id}
                onChange={(e) => setAdForm((prev) => ({ ...prev, campaign_id: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-text-secondary mb-1">Budget Allocated (₹) *</label>
              <input
                className="w-full bg-bg-dark border border-border/30 rounded p-2 text-xs text-text-primary outline-none font-mono"
                type="number"
                placeholder="10000"
                value={adForm.budget_allocated}
                onChange={(e) => setAdForm((prev) => ({ ...prev, budget_allocated: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-text-secondary mb-1">Budget Spent (₹) *</label>
              <input
                className="w-full bg-bg-dark border border-border/30 rounded p-2 text-xs text-text-primary outline-none font-mono"
                type="number"
                placeholder="8400"
                value={adForm.budget_spent}
                onChange={(e) => setAdForm((prev) => ({ ...prev, budget_spent: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-text-secondary mb-1">Leads Generated *</label>
              <input
                className="w-full bg-bg-dark border border-border/30 rounded p-2 text-xs text-text-primary outline-none font-mono"
                type="number"
                placeholder="24"
                value={adForm.leads}
                onChange={(e) => setAdForm((prev) => ({ ...prev, leads: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-text-secondary mb-1">Clicks Count</label>
              <input
                className="w-full bg-bg-dark border border-border/30 rounded p-2 text-xs text-text-primary outline-none font-mono"
                type="number"
                placeholder="320"
                value={adForm.clicks}
                onChange={(e) => setAdForm((prev) => ({ ...prev, clicks: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-text-secondary mb-1">Impressions</label>
              <input
                className="w-full bg-bg-dark border border-border/30 rounded p-2 text-xs text-text-primary outline-none font-mono"
                type="number"
                placeholder="15000"
                value={adForm.impressions}
                onChange={(e) => setAdForm((prev) => ({ ...prev, impressions: e.target.value }))}
              />
            </div>

            <div className="col-span-2">
              <label className="block text-[11px] font-semibold text-text-secondary mb-1">Campaign status</label>
              <select
                className="w-full bg-bg-dark border border-border/30 rounded p-2 text-xs text-text-primary outline-none"
                value={adForm.status}
                onChange={(e) => setAdForm((prev) => ({ ...prev, status: e.target.value }))}
              >
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            <div className="col-span-2">
              <label className="block text-[11px] font-semibold text-text-secondary mb-1">Notes</label>
              <textarea
                className="w-full bg-bg-dark border border-border/30 rounded p-2 text-xs text-text-primary outline-none h-16 resize-none"
                placeholder="Targeting Kanpur digital marketing businesses"
                value={adForm.notes}
                onChange={(e) => setAdForm((prev) => ({ ...prev, notes: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" size="sm" onClick={() => setModalOpen((prev) => ({ ...prev, ad: false }))} className="border-border/30 text-text-secondary hover:text-text-primary text-xs font-semibold cursor-pointer">
              Cancel
            </Button>
            <Button onClick={() => handleLogSubmit('ad')} disabled={isSubmitting} size="sm" className="bg-primary hover:bg-primary-light text-white text-xs font-semibold cursor-pointer">
              {isSubmitting ? 'Saving...' : 'Save Campaign'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ━━━ MODAL: LOG EMAIL CAMPAIGN ━━━ */}
      <Dialog open={modalOpen.email} onOpenChange={(open) => setModalOpen((prev) => ({ ...prev, email: open }))}>
        <DialogContent className="sm:max-w-[600px] select-none">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-text-primary">Log Email Campaign Details</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 my-2 text-xs">
            <div className="col-span-2">
              <label className="block text-[11px] font-semibold text-text-secondary mb-1">Campaign Name *</label>
              <input
                className="w-full bg-bg-dark border border-border/30 rounded p-2 text-xs text-text-primary outline-none"
                type="text"
                placeholder="Veloxis June Newsletter"
                value={emailForm.name}
                onChange={(e) => setEmailForm((prev) => ({ ...prev, name: e.target.value }))}
              />
            </div>

            <div className="col-span-2">
              <label className="block text-[11px] font-semibold text-text-secondary mb-1">Subject Line</label>
              <input
                className="w-full bg-bg-dark border border-border/30 rounded p-2 text-xs text-text-primary outline-none"
                type="text"
                placeholder="5 SEO Secrets for Kanpur Local Businesses"
                value={emailForm.subject}
                onChange={(e) => setEmailForm((prev) => ({ ...prev, subject: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-text-secondary mb-1">Month-Year *</label>
              <input
                className="w-full bg-bg-dark border border-border/30 rounded p-2 text-xs text-text-primary outline-none font-mono"
                type="text"
                placeholder="Jun 2026"
                value={emailForm.month_year}
                onChange={(e) => setEmailForm((prev) => ({ ...prev, month_year: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-text-secondary mb-1">Campaign Type</label>
              <select
                className="w-full bg-bg-dark border border-border/30 rounded p-2 text-xs text-text-primary outline-none"
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
              <label className="block text-[11px] font-semibold text-text-secondary mb-1">Emails Sent *</label>
              <input
                className="w-full bg-bg-dark border border-border/30 rounded p-2 text-xs text-text-primary outline-none font-mono"
                type="number"
                placeholder="1200"
                value={emailForm.emails_sent}
                onChange={(e) => setEmailForm((prev) => ({ ...prev, emails_sent: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-text-secondary mb-1">Emails Delivered *</label>
              <input
                className="w-full bg-bg-dark border border-border/30 rounded p-2 text-xs text-text-primary outline-none font-mono"
                type="number"
                placeholder="1180"
                value={emailForm.delivered}
                onChange={(e) => setEmailForm((prev) => ({ ...prev, delivered: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-text-secondary mb-1">Opened count *</label>
              <input
                className="w-full bg-bg-dark border border-border/30 rounded p-2 text-xs text-text-primary outline-none font-mono"
                type="number"
                placeholder="420"
                value={emailForm.opened}
                onChange={(e) => setEmailForm((prev) => ({ ...prev, opened: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-text-secondary mb-1">Clicked count *</label>
              <input
                className="w-full bg-bg-dark border border-border/30 rounded p-2 text-xs text-text-primary outline-none font-mono"
                type="number"
                placeholder="85"
                value={emailForm.clicked}
                onChange={(e) => setEmailForm((prev) => ({ ...prev, clicked: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-text-secondary mb-1">Unsubscribed</label>
              <input
                className="w-full bg-bg-dark border border-border/30 rounded p-2 text-xs text-text-primary outline-none font-mono"
                type="number"
                placeholder="6"
                value={emailForm.unsubscribed}
                onChange={(e) => setEmailForm((prev) => ({ ...prev, unsubscribed: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-text-secondary mb-1">Bounced</label>
              <input
                className="w-full bg-bg-dark border border-border/30 rounded p-2 text-xs text-text-primary outline-none font-mono"
                type="number"
                placeholder="20"
                value={emailForm.bounced}
                onChange={(e) => setEmailForm((prev) => ({ ...prev, bounced: e.target.value }))}
              />
            </div>

            <div className="col-span-2">
              <label className="block text-[11px] font-semibold text-text-secondary mb-1">Notes</label>
              <textarea
                className="w-full bg-bg-dark border border-border/30 rounded p-2 text-xs text-text-primary outline-none h-16 resize-none"
                placeholder="Sent via Resend API"
                value={emailForm.notes}
                onChange={(e) => setEmailForm((prev) => ({ ...prev, notes: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" size="sm" onClick={() => setModalOpen((prev) => ({ ...prev, email: false }))} className="border-border/30 text-text-secondary hover:text-text-primary text-xs font-semibold cursor-pointer">
              Cancel
            </Button>
            <Button onClick={() => handleLogSubmit('email')} disabled={isSubmitting} size="sm" className="bg-primary hover:bg-primary-light text-white text-xs font-semibold cursor-pointer">
              {isSubmitting ? 'Saving...' : 'Save Campaign'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ━━━ MODAL: LOG WHATSAPP CAMPAIGN ━━━ */}
      <Dialog open={modalOpen.whatsapp} onOpenChange={(open) => setModalOpen((prev) => ({ ...prev, whatsapp: open }))}>
        <DialogContent className="sm:max-w-[600px] select-none">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-text-primary">Log WhatsApp Campaign Details</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 my-2 text-xs">
            <div className="col-span-2">
              <label className="block text-[11px] font-semibold text-text-secondary mb-1">Campaign Name *</label>
              <input
                className="w-full bg-bg-dark border border-border/30 rounded p-2 text-xs text-text-primary outline-none"
                type="text"
                placeholder="June Broadcast to Cold Kanpur Leads"
                value={whatsappForm.name}
                onChange={(e) => setWhatsappForm((prev) => ({ ...prev, name: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-text-secondary mb-1">Template Name</label>
              <input
                className="w-full bg-bg-dark border border-border/30 rounded p-2 text-xs text-text-primary outline-none font-mono"
                type="text"
                placeholder="vg_agency_intro_v1"
                value={whatsappForm.template_name}
                onChange={(e) => setWhatsappForm((prev) => ({ ...prev, template_name: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-text-secondary mb-1">Month-Year *</label>
              <input
                className="w-full bg-bg-dark border border-border/30 rounded p-2 text-xs text-text-primary outline-none font-mono"
                type="text"
                placeholder="Jun 2026"
                value={whatsappForm.month_year}
                onChange={(e) => setWhatsappForm((prev) => ({ ...prev, month_year: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-text-secondary mb-1">Campaign Type</label>
              <select
                className="w-full bg-bg-dark border border-border/30 rounded p-2 text-xs text-text-primary outline-none"
                value={whatsappForm.campaign_type}
                onChange={(e) => setWhatsappForm((prev) => ({ ...prev, campaign_type: e.target.value }))}
              >
                <option value="broadcast">Broadcast</option>
                <option value="sequence">Sequence / Follow up</option>
                <option value="chatbot">Chatbot flows</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-text-secondary mb-1">Messages Sent *</label>
              <input
                className="w-full bg-bg-dark border border-border/30 rounded p-2 text-xs text-text-primary outline-none font-mono"
                type="number"
                placeholder="200"
                value={whatsappForm.messages_sent}
                onChange={(e) => setWhatsappForm((prev) => ({ ...prev, messages_sent: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-text-secondary mb-1">Delivered Messages *</label>
              <input
                className="w-full bg-bg-dark border border-border/30 rounded p-2 text-xs text-text-primary outline-none font-mono"
                type="number"
                placeholder="196"
                value={whatsappForm.delivered}
                onChange={(e) => setWhatsappForm((prev) => ({ ...prev, delivered: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-text-secondary mb-1">Read Count *</label>
              <input
                className="w-full bg-bg-dark border border-border/30 rounded p-2 text-xs text-text-primary outline-none font-mono"
                type="number"
                placeholder="150"
                value={whatsappForm.read_count}
                onChange={(e) => setWhatsappForm((prev) => ({ ...prev, read_count: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-text-secondary mb-1">Replied Messages *</label>
              <input
                className="w-full bg-bg-dark border border-border/30 rounded p-2 text-xs text-text-primary outline-none font-mono"
                type="number"
                placeholder="40"
                value={whatsappForm.replied}
                onChange={(e) => setWhatsappForm((prev) => ({ ...prev, replied: e.target.value }))}
              />
            </div>

            <div className="col-span-2">
              <label className="block text-[11px] font-semibold text-text-secondary mb-1">Notes</label>
              <textarea
                className="w-full bg-bg-dark border border-border/30 rounded p-2 text-xs text-text-primary outline-none h-16 resize-none"
                placeholder="Logged broadcast sequence"
                value={whatsappForm.notes}
                onChange={(e) => setWhatsappForm((prev) => ({ ...prev, notes: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" size="sm" onClick={() => setModalOpen((prev) => ({ ...prev, whatsapp: false }))} className="border-border/30 text-text-secondary hover:text-text-primary text-xs font-semibold cursor-pointer">
              Cancel
            </Button>
            <Button onClick={() => handleLogSubmit('whatsapp')} disabled={isSubmitting} size="sm" className="bg-primary hover:bg-primary-light text-white text-xs font-semibold cursor-pointer">
              {isSubmitting ? 'Saving...' : 'Save Campaign'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ━━━ MODAL: CONFIGURE GSC PROPERTY URL ━━━ */}
      <Dialog open={gscPropertyModalOpen} onOpenChange={setGscPropertyModalOpen}>
        <DialogContent className="sm:max-w-[400px] bg-bg-card border border-border/30 text-text-primary select-none">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <Globe size={16} className="text-[#1D4ED8]" />
              <span>Configure GSC Property URL</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-text-secondary mt-1">
              Enter the exact Search Console property URL (e.g., sc-domain:veloxisglobal.com or https://veloxisglobal.com/) to sync SEO rankings.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <label className="block text-[10px] uppercase font-bold text-text-secondary tracking-wider select-none">
              GSC Property URL *
            </label>
            <input
              className="w-full bg-bg-dark border border-border/30 rounded p-2 text-xs text-text-primary outline-none font-mono"
              type="text"
              placeholder="e.g. sc-domain:veloxisglobal.com"
              value={gscPropertyUrl}
              onChange={(e) => setGscPropertyUrl(e.target.value)}
            />
          </div>

          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setGscPropertyModalOpen(false)}
              className="border-border/30 text-text-secondary hover:text-text-primary text-xs font-semibold cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveGscProperty}
              disabled={connecting}
              size="sm"
              className="bg-primary hover:bg-primary-light text-white text-xs font-semibold cursor-pointer"
            >
              {connecting ? 'Saving...' : 'Save & Sync'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ━━━ MODAL: CONFIGURE GA4 PROPERTY ID ━━━ */}
      <Dialog open={ga4PropertyModalOpen} onOpenChange={setGa4PropertyModalOpen}>
        <DialogContent className="sm:max-w-[400px] bg-bg-card border border-border/30 text-text-primary select-none">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <Globe size={16} className="text-[#1D4ED8]" />
              <span>Configure GA4 Property ID</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-text-secondary mt-1">
              Enter the numeric Property ID of your Google Analytics 4 property (e.g. 123456789) to sync traffic statistics.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <label className="block text-[10px] uppercase font-bold text-text-secondary tracking-wider select-none">
              GA4 Numeric Property ID *
            </label>
            <input
              className="w-full bg-bg-dark border border-border/30 rounded p-2 text-xs text-text-primary outline-none font-mono"
              type="text"
              placeholder="e.g. 293821033"
              value={ga4PropertyId}
              onChange={(e) => setGa4PropertyId(e.target.value)}
            />
          </div>

          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setGa4PropertyModalOpen(false)}
              className="border-border/30 text-text-secondary hover:text-text-primary text-xs font-semibold cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveGa4Property}
              disabled={connecting}
              size="sm"
              className="bg-primary hover:bg-primary-light text-white text-xs font-semibold cursor-pointer"
            >
              {connecting ? 'Saving...' : 'Save & Sync'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ━━━ MODAL: CONNECT META AD ACCOUNT ━━━ */}
      <Dialog open={metaConnectOpen} onOpenChange={setMetaConnectOpen}>
        <DialogContent className="sm:max-w-[400px] bg-bg-card border border-border/30 text-text-primary select-none">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <Link2 size={16} className="text-[#1D4ED8]" />
              <span>Connect Meta Ad Account</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-text-secondary mt-1">
              Provide the Meta Ad Account ID (format: act_XXXXXXXXX) to sync advertising metrics.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <label className="block text-[10px] uppercase font-bold text-text-secondary tracking-wider select-none">
              Ad Account ID *
            </label>
            <input
              className="w-full bg-bg-dark border border-border/30 rounded p-2 text-xs text-text-primary outline-none font-mono"
              type="text"
              placeholder="e.g. act_1234567890"
              value={adAccountIdInput}
              onChange={(e) => setAdAccountIdInput(e.target.value)}
            />
          </div>

          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMetaConnectOpen(false)}
              className="border-border/30 text-text-secondary hover:text-text-primary text-xs font-semibold cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConnectMeta}
              disabled={connecting}
              size="sm"
              className="bg-primary hover:bg-primary-light text-white text-xs font-semibold cursor-pointer"
            >
              {connecting ? 'Connecting...' : 'Connect & Sync'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ━━━ MODAL: CONNECT GOOGLE ADS CUSTOMER ID ━━━ */}
      <Dialog open={googleConnectOpen} onOpenChange={setGoogleConnectOpen}>
        <DialogContent className="sm:max-w-[400px] bg-bg-card border border-border/30 text-text-primary select-none">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <Link2 size={16} className="text-[#1D4ED8]" />
              <span>Connect Google Ads Account</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-text-secondary mt-1">
              Provide the Google Ads Customer ID (format: XXXXXXXXXX) to sync campaign performance.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <label className="block text-[10px] uppercase font-bold text-text-secondary tracking-wider select-none">
              Customer ID *
            </label>
            <input
              className="w-full bg-bg-dark border border-border/30 rounded p-2 text-xs text-text-primary outline-none font-mono"
              type="text"
              placeholder="e.g. 1234567890"
              value={customerIdInput}
              onChange={(e) => setCustomerIdInput(e.target.value)}
            />
          </div>

          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setGoogleConnectOpen(false)}
              className="border-border/30 text-text-secondary hover:text-text-primary text-xs font-semibold cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConnectGoogleAds}
              disabled={connecting}
              size="sm"
              className="bg-primary hover:bg-primary-light text-white text-xs font-semibold cursor-pointer"
            >
              {connecting ? 'Connecting...' : 'Connect & Sync'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ━━━ MODAL: UPLOAD BRAND ASSET ━━━ */}
      <Dialog open={assetUploadOpen} onOpenChange={setAssetUploadOpen}>
        <DialogContent className="sm:max-w-[500px] select-none">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-text-primary">Upload Brand Asset</DialogTitle>
            <DialogDescription className="text-xs text-text-secondary">
              Upload a logo creative, proposal template, or general brand guideline file to the agency cabinet.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 my-2 text-xs">
            <div className="space-y-1.5">
              <label className="block text-[11px] font-semibold text-text-secondary">Target Collection / Directory *</label>
              <select
                value={assetCategory}
                onChange={(e) => setAssetCategory(e.target.value as 'logos' | 'templates' | 'brand')}
                className="w-full bg-bg-dark border border-border/30 rounded p-2 text-xs text-text-primary outline-none"
              >
                <option value="logos">Logos & Icons (logos/ folder)</option>
                <option value="templates">Proposal & Templates (templates/ folder)</option>
                <option value="brand">General Brand Files (brand/ folder)</option>
              </select>
            </div>

            <div className="space-y-1.5 pt-2">
              <label className="block text-[11px] font-semibold text-text-secondary">Document Upload *</label>
              <FileUpload
                bucket="agency"
                storagePath={assetCategory}
                tags={[assetCategory]}
                onUpload={() => {
                  toast.success('Asset uploaded successfully!');
                  setAssetUploadOpen(false);
                  router.refresh();
                }}
              />
            </div>
          </div>

          <DialogFooter className="mt-4 pt-2 border-t border-border/30/30">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAssetUploadOpen(false)}
              className="border-border/30 text-text-secondary hover:text-text-primary text-xs font-semibold cursor-pointer"
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ━━━ SCHEDULE SOCIAL POST MODAL ━━━ */}
      <SchedulePostModal
        open={plannerScheduleOpen}
        onOpenChange={setPlannerScheduleOpen}
        onSuccess={() => {
          router.refresh();
        }}
        prefilledDate={plannerPrefilledDate}
        prefilledClientId={clientId}
      />

      {/* ━━━ CONFIRM DELETE BRAND FILE ━━━ */}
      <ConfirmDialog
        open={deleteBrandFile !== null}
        onClose={() => setDeleteBrandFile(null)}
        onConfirm={handleDeleteBrandFileConfirm}
        title="Delete Brand Asset"
        description={`Are you sure you want to permanently delete "${deleteBrandFile?.name || 'this asset'}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
      />

      {/* ━━━ CONFIRM REMOVE PLANNED POST ━━━ */}
      <ConfirmDialog
        open={deletePostId !== null}
        onClose={() => setDeletePostId(null)}
        onConfirm={handleDeletePostConfirm}
        title="Remove Planned Post"
        description="Are you sure you want to remove this scheduled post from the content planner?"
        confirmLabel="Remove"
        variant="danger"
      />
    </div>
  );
}
export default AgencyDashboard;
