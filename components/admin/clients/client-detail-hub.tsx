'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Client, Profile } from '@/types';
import { toast } from 'sonner';
import { createClient as createSupabaseClient } from '@/lib/supabase/client';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  LayoutDashboard,
  Briefcase,
  ListTodo,
  Search,
  Megaphone,
  FileText,
  Activity,
  Edit2,
  Globe,
  MapPin,
  HeartPulse,
  CheckCircle,
  Clock,
  XCircle,
  PauseCircle,
  Calendar,
  MoreHorizontal,
  Star,
  MessageSquare,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';

// Tab components
import { OverviewTab } from '@/components/admin/clients/tabs/overview-tab';
import { ProjectsTab } from '@/components/admin/clients/tabs/projects-tab';
import { DeliverablesTab } from '@/components/admin/clients/tabs/deliverables-tab';
import { SeoTab } from '@/components/admin/clients/tabs/seo-tab';
import { AdsTab } from '@/components/admin/clients/tabs/ads-tab';
import { InvoicesTab } from '@/components/admin/clients/tabs/invoices-tab';
import { FilesTab } from '@/components/admin/clients/tabs/files-tab';
import { ActivityTab } from '@/components/admin/clients/tabs/activity-tab';
import { ClientRelationsTab } from '@/components/admin/clients/tabs/client-relations-tab';
import { ClientStatus } from '@/types';

interface ClientDetailHubProps {
  client: Client;
  profiles: Profile[];
}

type TabId =
  | 'overview'
  | 'projects'
  | 'deliverables'
  | 'seo'
  | 'ads'
  | 'relations'
  | 'invoices'
  | 'files'
  | 'activity';

interface Tab {
  id: TabId;
  label: string;
  icon: React.ElementType;
  hidden?: boolean;
}

const TABS: Tab[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'projects', label: 'Projects', icon: Briefcase },
  { id: 'deliverables', label: 'Deliverables', icon: ListTodo },
  { id: 'seo', label: 'SEO', icon: Search },
  { id: 'ads', label: 'Ads', icon: Megaphone },
  { id: 'relations', label: 'Client Relations', icon: MessageSquare },
  { id: 'invoices', label: 'Invoices', icon: FileText },
  { id: 'files', label: 'Files', icon: FileText },
  { id: 'activity', label: 'Activity', icon: Activity },
];

const STATUS_CONFIG: Record<ClientStatus | 'agency_self', { label: string; icon: React.ElementType; color: string }> = {
  active: { label: 'Active', icon: CheckCircle, color: 'text-[#22C55E]' },
  lead: { label: 'Lead', icon: Star, color: 'text-[#4D90FE]' },
  paused: { label: 'Paused', icon: PauseCircle, color: 'text-[#F59E0B]' },
  churned: { label: 'Churned', icon: XCircle, color: 'text-[#EF4444]' },
  agency_self: { label: 'My Agency', icon: Star, color: 'text-[#F97316]' },
};

const SERVICE_OPTIONS = [
  { id: 'seo', label: 'SEO' },
  { id: 'smm', label: 'Social Media' },
  { id: 'google_ads', label: 'Google Ads' },
  { id: 'meta_ads', label: 'Meta Ads' },
  { id: 'content', label: 'Content Marketing' },
  { id: 'website', label: 'Web Design' },
  { id: 'email', label: 'Email Marketing' },
  { id: 'whatsapp', label: 'WhatsApp Automation' },
  { id: 'gbp', label: 'GBP Management' },
  { id: 'other', label: 'Other / Custom' },
];

export function ClientDetailHub({ client: initialClient, profiles }: ClientDetailHubProps) {
  const supabase = createSupabaseClient();
  const [client, setClient] = useState<Client>(initialClient);
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab');
      if (tab && TABS.some((t) => t.id === tab)) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setActiveTab(tab as TabId);
      }
    }
  }, []);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [inviting, setInviting] = useState(false);

  // Edit form state
  const [form, setForm] = useState({
    name: client.name,
    company: client.company || '',
    email: client.email || '',
    phone: client.phone || '',
    whatsapp: client.whatsapp || '',
    website: client.website || '',
    industry: client.industry || '',
    city: client.city || '',
    status: client.status as ClientStatus,
    monthly_retainer: String(client.monthly_retainer || 0),
    start_date: client.start_date || '',
    services: client.services || [],
    notes: client.notes || '',
    health_score: String(client.health_score || 100),
    assigned_to: client.assigned_to || '',
  });

  const openEditModal = () => {
    setForm({
      name: client.name,
      company: client.company || '',
      email: client.email || '',
      phone: client.phone || '',
      whatsapp: client.whatsapp || '',
      website: client.website || '',
      industry: client.industry || '',
      city: client.city || '',
      status: client.status as ClientStatus,
      monthly_retainer: String(client.monthly_retainer || 0),
      start_date: client.start_date || '',
      services: client.services || [],
      notes: client.notes || '',
      health_score: String(client.health_score || 100),
      assigned_to: client.assigned_to || '',
    });
    setEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!form.name.trim()) {
      toast.error('Client name is required.');
      return;
    }
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('clients')
        .update({
          name: form.name,
          company: form.company || null,
          email: form.email || null,
          phone: form.phone || null,
          whatsapp: form.whatsapp || null,
          website: form.website || null,
          industry: form.industry || null,
          city: form.city || null,
          status: form.status,
          monthly_retainer: Number(form.monthly_retainer || 0),
          start_date: form.start_date || null,
          services: form.services,
          notes: form.notes || null,
          health_score: Number(form.health_score || 100),
          assigned_to: form.assigned_to || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', client.id)
        .select()
        .single();

      if (error) throw error;
      if (data) setClient(data);

      toast.success('Client profile updated.');
      setEditModalOpen(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update client.';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClient = async () => {
    try {
      const { error } = await supabase.from('clients').delete().eq('id', client.id);
      if (error) throw error;
      toast.success('Client profile deleted.');
      window.location.href = '/dashboard/clients';
    } catch {
      toast.error('Failed to delete client.');
    }
  };

  const handleSendInvite = async () => {
    if (!client.email) {
      toast.error('Client has no email registered.');
      return;
    }
    setInviting(true);
    const toastId = toast.loading('Sending client portal invitation...');
    try {
      const res = await fetch('/api/clients/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: client.id }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to send invite');
      }
      toast.success('Client portal invitation sent successfully!', { id: toastId });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      toast.error(`Invite failed: ${msg}`, { id: toastId });
    } finally {
      setInviting(false);
    }
  };

  const handleExportClient = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(client, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `${client.name.replace(/\s+/g, '_')}_profile.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    toast.success("Client data exported successfully.");
  };

  const effectiveStatus: ClientStatus | 'agency_self' = client.is_agency_self ? 'agency_self' : client.status;
  const statusConfig = STATUS_CONFIG[effectiveStatus] || STATUS_CONFIG.active;
  const StatusIcon = statusConfig.icon;

  // Visible tabs: hide invoices for agency self
  const visibleTabs = TABS.filter((t) => {
    if (t.id === 'invoices' && client.is_agency_self) return false;
    return true;
  });

  const renderTab = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewTab client={client} onTabChange={setActiveTab} />;
      case 'projects':
        return <ProjectsTab client={client} />;
      case 'deliverables':
        return <DeliverablesTab client={client} profiles={profiles} />;
      case 'seo':
        return <SeoTab client={client} />;
      case 'ads':
        return <AdsTab client={client} />;
      case 'invoices':
        return !client.is_agency_self ? <InvoicesTab client={client} /> : null;
      case 'relations':
        return <ClientRelationsTab client={client} profiles={profiles} />;
      case 'files':
        return <FilesTab client={client} />;
      case 'activity':
        return <ActivityTab client={client} />;
      default:
        return <OverviewTab client={client} />;
    }
  };

  return (
    <div className="space-y-0">
      {/* ━━━ PAGE HEADER HERO ━━━ */}
      <div className="bg-[#060D1A] border-b border-[#1E3352] px-6 py-5 select-none">
        {/* Back breadcrumb */}
        <div className="mb-4">
          <Link
            href="/dashboard/clients"
            className="inline-flex items-center gap-1.5 text-[10px] text-[#4A6480] hover:text-[#8BA3C7] transition-colors"
          >
            <span>← Clients</span>
          </Link>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-5">
          {/* Client Identity Block */}
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div className="w-14 h-14 rounded-[12px] bg-gradient-to-br from-[#1B4FD8] to-[#7C3AED] flex items-center justify-center shrink-0">
              <span className="text-xl font-black text-white">
                {client.name.charAt(0).toUpperCase()}
              </span>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-[22px] font-bold text-[#F0F4FF] leading-tight">
                  {client.name}
                </h1>
                {client.is_agency_self && (
                  <span className="text-[9px] font-bold bg-[#F97316]/10 border border-[#F97316]/20 text-[#F97316] rounded-full px-2 py-0.5 uppercase tracking-wide">
                    My Agency
                  </span>
                )}
              </div>

              {client.company && (
                <p className="text-sm text-[#8BA3C7]">{client.company}</p>
              )}

              <div className="flex items-center gap-3 flex-wrap text-[10px] text-[#4A6480]">
                {client.website && (
                  <a
                    href={client.website.startsWith('http') ? client.website : `https://${client.website}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 hover:text-[#4D90FE] transition-colors"
                  >
                    <Globe size={11} />
                    <span>{client.website}</span>
                  </a>
                )}
                {client.city && (
                  <span className="flex items-center gap-1">
                    <MapPin size={11} />
                    <span>{client.city}</span>
                  </span>
                )}
                {client.start_date && (
                  <span className="flex items-center gap-1">
                    <Clock size={11} />
                    <span>Since {formatDate(client.start_date)}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right side: Stats + Actions */}
          <div className="flex flex-col items-end gap-3">
            <div className="flex items-center gap-3">
              {/* Status chip */}
              <div className={`flex items-center gap-1.5 text-[10px] font-semibold ${statusConfig.color} bg-[#0D1829] border border-[#1E3352] rounded-full px-3 py-1`}>
                <StatusIcon size={11} />
                <span>{statusConfig.label}</span>
              </div>

              {/* Health Score */}
              <div className={`flex items-center gap-1.5 text-[10px] font-semibold ${
                client.health_score >= 80 ? 'text-[#22C55E]' :
                client.health_score >= 50 ? 'text-[#F59E0B]' : 'text-[#EF4444]'
              } bg-[#0D1829] border border-[#1E3352] rounded-full px-3 py-1`}>
                <HeartPulse size={11} />
                <span>{client.health_score}% Health</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                onClick={openEditModal}
                size="sm"
                className="bg-[#132035] hover:bg-[#1A2D47] border border-[#1E3352] text-[#8BA3C7] hover:text-[#F0F4FF] text-xs h-8 gap-1.5 cursor-pointer"
              >
                <Edit2 size={12} />
                <span>Edit</span>
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      size="sm"
                      className="bg-[#132035] hover:bg-[#1A2D47] border border-[#1E3352] text-[#8BA3C7] hover:text-[#F0F4FF] text-xs h-8 px-2.5 cursor-pointer"
                    >
                      <MoreHorizontal size={14} />
                    </Button>
                  }
                />
                <DropdownMenuContent align="end" className="bg-[#0D1829] border-[#1E3352] text-[#F0F4FF] min-w-[160px]">
                  <DropdownMenuItem
                    onClick={handleSendInvite}
                    disabled={inviting}
                    className="text-xs hover:bg-[#132035] cursor-pointer text-[#8BA3C7] hover:text-[#F0F4FF] gap-2 py-1.5"
                  >
                    <span>Send Portal Invite</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={handleExportClient}
                    className="text-xs hover:bg-[#132035] cursor-pointer text-[#8BA3C7] hover:text-[#F0F4FF] gap-2 py-1.5"
                  >
                    <span>Export</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setDeleteDialogOpen(true)}
                    className="text-xs hover:bg-[#132035] cursor-pointer text-[#EF4444] hover:text-[#EF4444] gap-2 py-1.5"
                  >
                    <span>Delete</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>

      {/* ━━━ INFO CARDS ROW ━━━ */}
      <div className="bg-[#060D1A] border-b border-[#1E3352] px-6 py-4">
        <div className="flex flex-row overflow-x-auto gap-4 pb-2 md:pb-0 scrollbar-hide md:grid md:grid-cols-5 flex-nowrap">
          {/* Card 1: Retainer */}
          <div className="bg-[#0D1829] border border-[#1E3352] rounded-[10px] p-[16px_20px] min-w-[180px] flex flex-col justify-center">
            <span className="text-[10px] text-[#4A6480] uppercase tracking-wider font-semibold">Monthly Retainer</span>
            <span className="text-xl font-bold font-mono text-[#F97316] mt-1">
              {formatCurrency(client.monthly_retainer)}
            </span>
          </div>

          {/* Card 2: Industry */}
          <div className="bg-[#0D1829] border border-[#1E3352] rounded-[10px] p-[16px_20px] min-w-[180px] flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#4D90FE]/10 text-[#4D90FE]">
              <Briefcase size={16} />
            </div>
            <div>
              <span className="text-[10px] text-[#4A6480] uppercase tracking-wider block">Industry</span>
              <span className="text-xs font-semibold text-[#F0F4FF] truncate block max-w-[120px]">{client.industry || 'Not Specified'}</span>
            </div>
          </div>

          {/* Card 3: City */}
          <div className="bg-[#0D1829] border border-[#1E3352] rounded-[10px] p-[16px_20px] min-w-[180px] flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#EF4444]/10 text-[#EF4444]">
              <MapPin size={16} />
            </div>
            <div>
              <span className="text-[10px] text-[#4A6480] uppercase tracking-wider block">Location</span>
              <span className="text-xs font-semibold text-[#F0F4FF] block">{client.city || 'Not Specified'}</span>
            </div>
          </div>

          {/* Card 4: Start Date */}
          <div className="bg-[#0D1829] border border-[#1E3352] rounded-[10px] p-[16px_20px] min-w-[180px] flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#22C55E]/10 text-[#22C55E]">
              <Calendar size={16} />
            </div>
            <div>
              <span className="text-[10px] text-[#4A6480] uppercase tracking-wider block">Start Date</span>
              <span className="text-xs font-semibold text-[#F0F4FF] font-mono block">
                {client.start_date ? formatDate(client.start_date) : 'Not Started'}
              </span>
            </div>
          </div>

          {/* Card 5: Services */}
          <div className="bg-[#0D1829] border border-[#1E3352] rounded-[10px] p-[16px_20px] min-w-[200px] flex flex-col justify-center gap-1.5">
            <span className="text-[10px] text-[#4A6480] uppercase tracking-wider font-semibold">Subscribed Services</span>
            <div className="flex flex-wrap gap-1">
              {client.services && client.services.length > 0 ? (
                client.services.map((svc) => (
                  <span
                    key={svc}
                    className="text-[9px] bg-[#1B4FD8]/10 text-[#4D90FE] border border-[#1B4FD8]/20 rounded px-1.5 py-0.5 uppercase font-semibold"
                  >
                    {svc}
                  </span>
                ))
              ) : (
                <span className="text-[9px] text-[#4A6480] italic">None</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ━━━ TAB NAVIGATION ━━━ */}
      <div className="bg-[#060D1A] border-b border-[#1E3352] px-6 select-none sticky top-0 z-20">
        <nav className="flex gap-0 -mb-px overflow-x-auto scrollbar-hide">
          {visibleTabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const TabIcon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-1.5 px-4 py-3.5 text-[11px] font-semibold border-b-2 whitespace-nowrap cursor-pointer transition-all
                  ${isActive
                    ? 'border-[#1B4FD8] text-[#1B4FD8]'
                    : 'border-transparent text-[#4A6480] hover:text-[#8BA3C7] hover:border-[#2A4060]'}
                `}
              >
                <TabIcon size={12} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* ━━━ TAB CONTENT ━━━ */}
      <div className="p-6">
        {renderTab()}
      </div>

      {/* ━━━ CONFIRM DIALOG: DELETE CLIENT ━━━ */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleDeleteClient}
        title="Delete Client Profile"
        description={`Are you sure you want to permanently delete client "${client.name}"? This will delete all campaign projects, invoices, and files associated with this client profile. This action is irreversible.`}
        confirmLabel="Delete Client"
        variant="danger"
      />

      {/* ━━━ MODAL: EDIT CLIENT ━━━ */}
      <Dialog open={editModalOpen} onOpenChange={(open) => { setEditModalOpen(open); }}>
        <DialogContent className="bg-[#0D1829] border border-[#1E3352] text-[#F0F4FF] max-w-lg select-none max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-[#F0F4FF]">Edit Client Profile</DialogTitle>
            <DialogDescription className="text-xs text-[#8BA3C7]">
              Update business information, health score, retainer and subscribed services.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4 my-2 text-xs">
            {/* Name */}
            <div className="space-y-1">
              <label className="label">Client Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                className="input h-9"
              />
            </div>

            {/* Company */}
            <div className="space-y-1">
              <label className="label">Company / Business Name</label>
              <input
                type="text"
                value={form.company}
                onChange={(e) => setForm((p) => ({ ...p, company: e.target.value }))}
                className="input h-9"
              />
            </div>

            {/* Email */}
            <div className="space-y-1">
              <label className="label">Email Address</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                className="input h-9"
              />
            </div>

            {/* Phone */}
            <div className="space-y-1">
              <label className="label">Phone Number</label>
              <input
                type="text"
                value={form.phone}
                onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                className="input h-9"
              />
            </div>

            {/* Website */}
            <div className="space-y-1">
              <label className="label">Website Domain</label>
              <input
                type="text"
                value={form.website}
                onChange={(e) => setForm((p) => ({ ...p, website: e.target.value }))}
                className="input h-9"
              />
            </div>

            {/* City */}
            <div className="space-y-1">
              <label className="label">City</label>
              <input
                type="text"
                value={form.city}
                onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))}
                className="input h-9"
              />
            </div>

            {/* Industry */}
            <div className="space-y-1">
              <label className="label">Industry</label>
              <input
                type="text"
                value={form.industry}
                onChange={(e) => setForm((p) => ({ ...p, industry: e.target.value }))}
                className="input h-9"
              />
            </div>

            {/* Status */}
            {!client.is_agency_self && (
              <div className="space-y-1">
                <label className="label">Client Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm((p) => ({ ...p, status: e.target.value as ClientStatus }))}
                  className="input h-9"
                >
                  <option value="active">Active Client</option>
                  <option value="lead">Lead / Prospect</option>
                  <option value="paused">Paused</option>
                  <option value="churned">Churned / Closed</option>
                </select>
              </div>
            )}

            {/* Monthly Retainer */}
            {!client.is_agency_self && (
              <div className="space-y-1">
                <label className="label">Monthly Retainer (₹)</label>
                <input
                  type="number"
                  value={form.monthly_retainer}
                  onChange={(e) => setForm((p) => ({ ...p, monthly_retainer: e.target.value }))}
                  className="input h-9"
                />
              </div>
            )}

            {/* Health Score */}
            <div className="space-y-1">
              <label className="label">Health Score (0–100)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={form.health_score}
                onChange={(e) => setForm((p) => ({ ...p, health_score: e.target.value }))}
                className="input h-9"
              />
            </div>

            {/* Assigned To */}
            <div className="space-y-1">
              <label className="label">Assigned Account Manager</label>
              <select
                value={form.assigned_to}
                onChange={(e) => setForm((p) => ({ ...p, assigned_to: e.target.value }))}
                className="input h-9"
              >
                <option value="">Unassigned</option>
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.full_name} ({p.role})
                  </option>
                ))}
              </select>
            </div>

            {/* Start Date */}
            <div className="space-y-1">
              <label className="label">Contract Start Date</label>
              <input
                type="date"
                value={form.start_date}
                onChange={(e) => setForm((p) => ({ ...p, start_date: e.target.value }))}
                className="input h-9"
              />
            </div>

            {/* Services */}
            <div className="col-span-2 space-y-1">
              <label className="label">Subscribed Services</label>
              <div className="grid grid-cols-2 gap-2 border border-[#1E3352] rounded-[7px] bg-[#060D1A] p-2.5 max-h-[140px] overflow-y-auto">
                {SERVICE_OPTIONS.map((opt) => (
                  <label
                    key={opt.id}
                    className="flex items-center gap-2 cursor-pointer text-[11px] text-[#8BA3C7] hover:text-[#F0F4FF] select-none"
                  >
                    <input
                      type="checkbox"
                      checked={form.services.includes(opt.id)}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setForm((p) => ({
                          ...p,
                          services: checked
                            ? [...p.services, opt.id]
                            : p.services.filter((s) => s !== opt.id),
                        }));
                      }}
                      className="rounded border-[#1E3352] bg-[#060D1A] text-[#1B4FD8] focus:ring-0 shrink-0"
                    />
                    <span>{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div className="col-span-2 space-y-1">
              <label className="label">Account Notes & Strategy</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                rows={3}
                className="input resize-none"
                placeholder="Billing terms, delivery agreements, client preferences..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditModalOpen(false)}
              className="bg-transparent border-[#1E3352] text-[#8BA3C7] hover:bg-[#132035] hover:text-[#F0F4FF] cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={saving}
              className="bg-[#1B4FD8] hover:bg-[#2563EB] text-white cursor-pointer"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ClientDetailHub;
