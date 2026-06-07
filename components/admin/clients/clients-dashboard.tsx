'use client';

import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  Plus,
  Search,
  Building,
  ExternalLink,
  Edit2,
  Trash2,
  RefreshCw,
  DollarSign
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/shared/data-table';
import { StatusBadge } from '@/components/shared/status-badge';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Client, Profile, ClientStatus } from '@/types';

interface ClientsDashboardProps {
  initialClients: Client[];
  profiles: Profile[];
}

export function ClientsDashboard({ initialClients, profiles }: ClientsDashboardProps) {
  const supabase = createClient();
  const [clients, setClients] = useState<Client[]>(initialClients);
  const [prevInitialClients, setPrevInitialClients] = useState<Client[]>(initialClients);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Sync prop changes into local state during render
  if (initialClients !== prevInitialClients) {
    setPrevInitialClients(initialClients);
    setClients(initialClients);
  }

  // Filters state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [industryFilter, setIndustryFilter] = useState<string>('all');

  // Modal states
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  // Form states
  const [form, setForm] = useState({
    name: '',
    company: '',
    email: '',
    phone: '',
    whatsapp: '',
    website: '',
    industry: '',
    city: '',
    status: 'active' as ClientStatus,
    monthly_retainer: '',
    start_date: new Date().toISOString().split('T')[0],
    contract_end: '',
    services: [] as string[],
    notes: '',
    health_score: '100',
    assigned_to: '',
  });

  const SERVICE_OPTIONS = [
    { id: 'seo', label: 'SEO' },
    { id: 'smm', label: 'Social Media' },
    { id: 'google_ads', label: 'Google Ads' },
    { id: 'meta_ads', label: 'Meta Ads' },
    { id: 'content', label: 'Content' },
    { id: 'website', label: 'Web Design' },
    { id: 'email', label: 'Email' },
    { id: 'gbp', label: 'GBP' },
    { id: 'whatsapp', label: 'WhatsApp' },
  ];

  // Refresh data from database
  const refreshData = async () => {
    setIsRefreshing(true);
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('is_agency_self', { ascending: false })
        .order('name', { ascending: true });

      if (error) throw error;
      if (data) setClients(data);
    } catch {
      toast.error('Failed to refresh clients.');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Separate is_agency_self from regular clients
  const agencySelf = clients.find((c) => c.is_agency_self);
  const regularClients = clients.filter((c) => !c.is_agency_self);

  // Calculations for stats pills
  const totalRegular = regularClients.length;
  const activeCount = regularClients.filter((c) => c.status === 'active').length;
  const leadCount = regularClients.filter((c) => c.status === 'lead').length;
  const pausedCount = regularClients.filter((c) => c.status === 'paused').length;
  const churnedCount = regularClients.filter((c) => c.status === 'churned').length;

  // Filter regular clients
  const filteredClients = regularClients.filter((client) => {
    const matchesSearch =
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (client.company || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (client.industry || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || client.status === statusFilter;
    const matchesIndustry = industryFilter === 'all' || client.industry === industryFilter;

    return matchesSearch && matchesStatus && matchesIndustry;
  });

  // Extract unique industries for filter (excluding nulls and agency)
  const uniqueIndustries = Array.from(
    new Set(
      regularClients
        .filter((c) => c.industry)
        .map((c) => c.industry as string)
    )
  );

  // Setup Form for Edit
  const openEditModal = (client: Client) => {
    setSelectedClient(client);
    setForm({
      name: client.name,
      company: client.company || '',
      email: client.email || '',
      phone: client.phone || '',
      whatsapp: client.whatsapp || '',
      website: client.website || '',
      industry: client.industry || '',
      city: client.city || '',
      status: client.status,
      monthly_retainer: String(client.monthly_retainer || 0),
      start_date: client.start_date || new Date().toISOString().split('T')[0],
      contract_end: client.contract_end || '',
      services: client.services || [],
      notes: client.notes || '',
      health_score: String(client.health_score || 100),
      assigned_to: client.assigned_to || '',
    });
    setEditModalOpen(true);
  };

  // Submit Handler: Add Client
  const handleAddClient = async () => {
    if (!form.name.trim()) {
      toast.error('Client name is required.');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Unauthenticated');

      const { data: newClient, error } = await supabase
        .from('clients')
        .insert({
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
          contract_end: form.contract_end || null,
          services: form.services,
          notes: form.notes || null,
          health_score: Number(form.health_score || 100),
          assigned_to: form.assigned_to || null,
          is_agency_self: false,
        })
        .select('id')
        .single();

      if (error) throw error;

      // 1. Log to activity_log
      await supabase.from('activity_log').insert({
        user_id: user.id,
        client_id: newClient.id,
        action: 'create',
        entity_type: 'clients',
        entity_id: newClient.id,
        title: `New client added: ${form.name}`,
        description: `Company: ${form.company || 'N/A'}, Retainer: ₹${Number(form.monthly_retainer || 0).toLocaleString('en-IN')}`,
        metadata: { name: form.name, company: form.company },
        created_at: new Date().toISOString(),
      });

      // 2. Notify ALL admins — new client created
      const { data: admins } = await supabase.from('profiles').select('id').eq('role', 'admin');
      if (admins && admins.length > 0) {
        const notifs = admins.map((a) => ({
          user_id: a.id,
          type: 'client_new',
          title: `👤 New client added — ${form.name}`,
          message: `${form.name}${form.company ? ` (${form.company})` : ''} added. Monthly retainer: ₹${Number(form.monthly_retainer || 0).toLocaleString('en-IN')}.`,
          link: `/dashboard/clients/${newClient.id}`,
          priority: 'normal',
          is_read: false,
          created_at: new Date().toISOString(),
        }));
        await supabase.from('notifications').insert(notifs);
      }

      toast.success('Client added successfully');
      setAddModalOpen(false);
      resetForm();
      refreshData();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create client.';
      toast.error(errorMessage);
    }
  };

  // Submit Handler: Edit Client
  const handleEditClient = async () => {
    if (!selectedClient) return;
    if (!form.name.trim()) {
      toast.error('Client name is required.');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Unauthenticated');

      const { error } = await supabase
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
          contract_end: form.contract_end || null,
          services: form.services,
          notes: form.notes || null,
          health_score: Number(form.health_score || 100),
          assigned_to: form.assigned_to || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedClient.id);

      if (error) throw error;

      // Log update in activity_log
      await supabase.from('activity_log').insert({
        user_id: user.id,
        client_id: selectedClient.id,
        action: 'update',
        entity_type: 'clients',
        entity_id: selectedClient.id,
        title: `Client profile updated: ${form.name}`,
        description: `Modified details for client ${form.name}`,
        created_at: new Date().toISOString(),
      });

      toast.success('Client profile updated successfully.');
      setEditModalOpen(false);
      resetForm();
      refreshData();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update client.';
      toast.error(errorMessage);
    }
  };

  // Submit Handler: Delete Client
  const handleDeleteClient = async () => {
    if (!selectedClient) return;
    if (selectedClient.is_agency_self) {
      toast.error('Cannot delete agency self-client profile.');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Unauthenticated');

      // 1. Cascade cleanup of dependent records
      // Delete any won lead that was converted_to this client (prevents Kanban orphan cards)
      await supabase.from('leads').delete().eq('converted_to', selectedClient.id);
      // Also delete if the client has a direct lead_id FK reference stored on its own row
      if (selectedClient.lead_id) {
        await supabase.from('leads').delete().eq('id', selectedClient.lead_id);
      }
      // Delete any contracts linked to this client (prevents FK constraint violations)
      await supabase.from('contracts').delete().eq('client_id', selectedClient.id);

      // 2. Perform main deletion
      const { error } = await supabase.from('clients').delete().eq('id', selectedClient.id);
      if (error) throw error;

      // Log delete in activity_log
      await supabase.from('activity_log').insert({
        user_id: user.id,
        action: 'delete',
        entity_type: 'clients',
        entity_id: selectedClient.id,
        title: `Client deleted: ${selectedClient.name}`,
        description: `Client account and all associated pipeline and contract data deleted.`,
        created_at: new Date().toISOString(),
      });

      toast.success('Client and associated data deleted successfully');
      setDeleteDialogOpen(false);
      setSelectedClient(null);
      refreshData();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete client.';
      toast.error(errorMessage);
    }
  };

  const resetForm = () => {
    setForm({
      name: '',
      company: '',
      email: '',
      phone: '',
      whatsapp: '',
      website: '',
      industry: '',
      city: '',
      status: 'active',
      monthly_retainer: '',
      start_date: new Date().toISOString().split('T')[0],
      contract_end: '',
      services: [],
      notes: '',
      health_score: '100',
      assigned_to: '',
    });
    setSelectedClient(null);
  };

  // Service Mapping
  const getServiceLabel = (svc: string) => {
    switch (svc) {
      case 'seo': return 'SEO';
      case 'smm': return 'Social Media';
      case 'google_ads': return 'Google Ads';
      case 'meta_ads': return 'Meta Ads';
      case 'content': return 'Content';
      case 'website': return 'Web Design';
      case 'email': return 'Email';
      case 'gbp': return 'GBP';
      case 'whatsapp': return 'WhatsApp';
      default: return svc.toUpperCase();
    }
  };

  // Columns definition for DataTable
  const columns = [
    {
      key: 'name',
      header: 'Name',
      width: '20%',
      render: (val: unknown) => {
        const name = String(val);
        return (
          <div className="font-bold text-sm text-text-primary group-hover:underline select-none">
            {name}
          </div>
        );
      },
    },
    {
      key: 'company',
      header: 'Company',
      width: '18%',
      render: (val: unknown) => <span className="text-[13px] text-text-secondary">{String(val || '-')}</span>,
    },
    {
      key: 'industry',
      header: 'Industry',
      width: '12%',
      render: (val: unknown) => <span className="text-[13px] text-text-secondary">{String(val || '-')}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      width: '10%',
      render: (val: unknown) => (
        <StatusBadge status={String(val)} />
      ),
    },
    {
      key: 'services',
      header: 'Services',
      width: '18%',
      render: (val: unknown) => {
        const list = (val as string[]) || [];
        if (list.length === 0) return <span className="text-text-tertiary">-</span>;
        return (
          <div className="flex flex-wrap gap-1 max-w-[170px] select-none">
            {list.slice(0, 3).map((svc) => (
              <span
                key={svc}
                className="text-[9px] bg-bg-card border border-border/20 text-text-secondary rounded-full px-2 py-0.5 uppercase font-medium"
              >
                {getServiceLabel(svc)}
              </span>
            ))}
            {list.length > 3 && (
              <span className="text-[9px] text-text-tertiary font-bold self-center ml-1">+{list.length - 3} more</span>
            )}
          </div>
        );
      },
    },
    {
      key: 'monthly_retainer',
      header: 'Retainer',
      width: '10%',
      render: (val: unknown) => {
        const retainer = Number(val || 0);
        return (
          <div className="text-right">
            <span className="font-semibold font-mono text-xs text-accent">
              {formatCurrency(retainer)}
            </span>
          </div>
        );
      },
    },
    {
      key: 'health_score',
      header: 'Health',
      width: '12%',
      render: (val: unknown) => {
        const score = Number(val || 100);
        const getBarColor = (sc: number) => {
          if (sc >= 80) return 'bg-online';
          if (sc >= 50) return 'bg-warning';
          return 'bg-error';
        };
        const getTextColor = (sc: number) => {
          if (sc >= 80) return 'text-online';
          if (sc >= 50) return 'text-warning';
          return 'text-error';
        };
        return (
          <div className="flex items-center gap-2 select-none">
            <div className="w-[60px] bg-border/20 h-1.5 rounded-full overflow-hidden shrink-0">
              <div className={`h-full ${getBarColor(score)}`} style={{ width: `${score}%` }} />
            </div>
            <span className={`font-bold font-mono text-xs ${getTextColor(score)}`}>
              {score}%
            </span>
          </div>
        );
      },
    },
    {
      key: 'start_date',
      header: 'Since',
      width: '10%',
      render: (val: unknown) => (
        <span className="text-xs text-text-tertiary font-mono">
          {val ? formatDate(String(val)) : '-'}
        </span>
      ),
    },
  ];

  // Actions dropdown generator per row
  const rowActions = (row: Record<string, unknown>) => {
    const client = row as unknown as Client;

    return (
      <>
        <DropdownMenuItem
          onClick={() => {
            window.location.href = `/dashboard/clients/${client.id}`;
          }}
          className="text-xs hover:bg-bg-card-hover/20 cursor-pointer text-text-secondary hover:text-text-primary gap-2 py-1.5 flex items-center"
        >
          <ExternalLink size={12} />
          <span>View Profile</span>
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => openEditModal(client)}
          className="text-xs hover:bg-bg-card-hover/20 cursor-pointer text-text-secondary hover:text-text-primary gap-2 py-1.5"
        >
          <Edit2 size={12} />
          <span>Edit Profile</span>
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => {
            window.location.href = `/dashboard/finance?generateClient=${client.id}`;
          }}
          className="text-xs hover:bg-bg-card-hover/20 cursor-pointer text-accent hover:text-text-primary gap-2 py-1.5"
        >
          <DollarSign size={12} />
          <span>Generate Invoice</span>
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => {
            setSelectedClient(client);
            setDeleteDialogOpen(true);
          }}
          className="text-xs hover:bg-bg-card-hover/20 cursor-pointer text-error hover:text-error gap-2 py-1.5"
        >
          <Trash2 size={12} />
          <span>Delete Client</span>
        </DropdownMenuItem>
      </>
    );
  };

  return (
    <div className="space-y-6">
      {/* ━━━ HEADER ROW ━━━ */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border/20 select-none">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-[20px] font-bold text-text-primary tracking-tight">Clients</h2>
          <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
            <span className="bg-bg-card border border-border/20 text-text-secondary px-2 py-0.5 rounded-full font-semibold">
              Total: {totalRegular}
            </span>
            <span className="bg-online/15 border border-online/20 text-online px-2 py-0.5 rounded-full font-semibold">
              Active: {activeCount}
            </span>
            <span className="bg-indigo-500/15 border border-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded-full font-semibold">
              Leads: {leadCount}
            </span>
            <span className="bg-warning/15 border border-warning/20 text-warning px-2 py-0.5 rounded-full font-semibold">
              Paused: {pausedCount}
            </span>
            <span className="bg-error/15 border border-error/20 text-error px-2 py-0.5 rounded-full font-semibold">
              Churned: {churnedCount}
            </span>
          </div>
        </div>
        <Button
          onClick={() => setAddModalOpen(true)}
          size="sm"
        >
          <Plus size={13} />
          <span>Add Client</span>
        </Button>
      </div>

      {/* ━━━ PINNED AGENCY CARD ━━━ */}
      {agencySelf && (
        <div className="opacity-70 hover:opacity-100 transition-all duration-200">
          <div
            onClick={() => {
              window.location.href = '/dashboard/my-agency';
            }}
            className="p-4 rounded-xl bg-accent/5 border border-accent/30 select-none flex items-center justify-between cursor-pointer group shadow-elevated"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-accent/10 rounded-full shrink-0 text-accent">
                <Building size={16} className="stroke-[1.5]" />
              </div>
              <div>
                <div className="text-[10px] uppercase font-bold text-text-secondary tracking-wider">
                  Agency Profile
                </div>
                <div className="text-sm font-bold text-text-primary mt-0.5 flex items-center gap-2">
                  <span>My Agency — Veloxis Global</span>
                  <span className="text-[9px] font-bold bg-accent/20 border border-accent/30 text-accent rounded-full px-2 py-0.5 uppercase tracking-wider">
                    Agency
                  </span>
                </div>
              </div>
            </div>
            <div className="text-xs text-accent font-semibold flex items-center gap-1 opacity-70 group-hover:opacity-100 group-hover:translate-x-1 transition-all">
              <span>Go to Dashboard</span>
              <ExternalLink size={12} />
            </div>
          </div>
        </div>
      )}

      {/* Filter and Control Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 select-none">
        <div className="flex flex-wrap items-center gap-3 flex-grow">
          {/* Search Input */}
          <div className="relative w-full sm:w-[280px]">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-text-secondary pointer-events-none" />
            <input
              type="text"
              placeholder="Search clients..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-9 w-full min-w-0 rounded-lg border border-border/30 bg-bg-card/50 pl-9 pr-3 text-xs text-text-primary backdrop-blur-[8px] outline-none transition-all duration-200 focus:border-primary/50 focus:bg-bg-card/70 focus:shadow-[0_0_16px_rgba(37,99,235,0.15)] placeholder:text-text-tertiary"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 w-full min-w-0 rounded-lg border border-border/30 bg-bg-card/50 px-3 py-1 text-xs text-text-primary backdrop-blur-[8px] outline-none transition-all duration-200 focus:border-primary/50 focus:bg-bg-card/70 focus:shadow-[0_0_16px_rgba(37,99,235,0.15)] max-w-[150px]"
          >
            <option value="all">All Statuses</option>
            <option value="lead">Lead</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="churned">Churned</option>
          </select>

          {/* Industry Filter */}
          <select
            value={industryFilter}
            onChange={(e) => setIndustryFilter(e.target.value)}
            className="h-9 w-full min-w-0 rounded-lg border border-border/30 bg-bg-card/50 px-3 py-1 text-xs text-text-primary backdrop-blur-[8px] outline-none transition-all duration-200 focus:border-primary/50 focus:bg-bg-card/70 focus:shadow-[0_0_16px_rgba(37,99,235,0.15)] max-w-[180px]"
          >
            <option value="all">All Industries</option>
            {uniqueIndustries.map((ind) => (
              <option key={ind} value={ind}>
                {ind}
              </option>
            ))}
          </select>
        </div>

        {/* Sync/Refresh Control */}
        <Button
          onClick={refreshData}
          disabled={isRefreshing}
          size="sm"
          variant="secondary"
        >
          <RefreshCw size={13} className={`stroke-[1.5] ${isRefreshing ? 'animate-spin' : ''}`} />
          <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
        </Button>
      </div>

      {/* Clients DataTable (Excluding is_agency_self) */}
      <DataTable
        columns={columns}
        data={filteredClients as unknown as Record<string, unknown>[]}
        rowActions={rowActions}
        onRowClick={(row) => {
          window.location.href = `/dashboard/clients/${row.id}`;
        }}
        emptyState={{
          icon: Building,
          title: 'No Clients Found',
          description: 'Add a new client account to start tracking projects, tasks, SEO keywords, and billing.',
          actionLabel: 'Add First Client',
          onAction: () => setAddModalOpen(true),
        }}
      />

      {/* ━━━ MODAL: ADD CLIENT ━━━ */}
      <Dialog open={addModalOpen} onOpenChange={(open) => { setAddModalOpen(open); if(!open) resetForm(); }}>
        <DialogContent className="sm:max-w-[600px] select-none max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Client Account</DialogTitle>
            <DialogDescription>
              Configure client portal settings, retainer details, and target marketing services.
            </DialogDescription>
          </DialogHeader>

          {/* Restructured 2-Column Grid Layout */}
          <div className="grid grid-cols-2 gap-4 my-2 text-xs">
            {/* Row 1: Name* | Company */}
            <div className="space-y-1 flex flex-col">
              <label className="text-xs font-semibold text-text-secondary select-none">Client Name *</label>
              <input
                type="text"
                placeholder="e.g. Rahul Sharma"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                className="h-9 w-full min-w-0 rounded-lg border border-border/30 bg-bg-card/50 px-3 py-1 text-sm text-text-primary backdrop-blur-[8px] outline-none transition-all duration-200 focus:border-primary/50 focus:bg-bg-card/70 focus:shadow-[0_0_16px_rgba(37,99,235,0.15)] placeholder:text-text-tertiary"
              />
            </div>
            <div className="space-y-1 flex flex-col">
              <label className="text-xs font-semibold text-text-secondary select-none">Company / Business Name</label>
              <input
                type="text"
                placeholder="e.g. Sharma Dental Clinic"
                value={form.company}
                onChange={(e) => setForm((p) => ({ ...p, company: e.target.value }))}
                className="h-9 w-full min-w-0 rounded-lg border border-border/30 bg-bg-card/50 px-3 py-1 text-sm text-text-primary backdrop-blur-[8px] outline-none transition-all duration-200 focus:border-primary/50 focus:bg-bg-card/70 focus:shadow-[0_0_16px_rgba(37,99,235,0.15)] placeholder:text-text-tertiary"
              />
            </div>

            {/* Row 2: Email | Phone */}
            <div className="space-y-1 flex flex-col">
              <label className="text-xs font-semibold text-text-secondary select-none">Email Address</label>
              <input
                type="email"
                placeholder="e.g. client@example.com"
                value={form.email}
                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                className="h-9 w-full min-w-0 rounded-lg border border-border/30 bg-bg-card/50 px-3 py-1 text-sm text-text-primary backdrop-blur-[8px] outline-none transition-all duration-200 focus:border-primary/50 focus:bg-bg-card/70 focus:shadow-[0_0_16px_rgba(37,99,235,0.15)] placeholder:text-text-tertiary"
              />
            </div>
            <div className="space-y-1 flex flex-col">
              <label className="text-xs font-semibold text-text-secondary select-none">Phone Number</label>
              <input
                type="text"
                placeholder="e.g. +91 9999999999"
                value={form.phone}
                onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                className="h-9 w-full min-w-0 rounded-lg border border-border/30 bg-bg-card/50 px-3 py-1 text-sm text-text-primary backdrop-blur-[8px] outline-none transition-all duration-200 focus:border-primary/50 focus:bg-bg-card/70 focus:shadow-[0_0_16px_rgba(37,99,235,0.15)] placeholder:text-text-tertiary"
              />
            </div>

            {/* Row 3: WhatsApp | Website */}
            <div className="space-y-1 flex flex-col">
              <label className="text-xs font-semibold text-text-secondary select-none">WhatsApp Number</label>
              <input
                type="text"
                placeholder="e.g. 919999999999"
                value={form.whatsapp}
                onChange={(e) => setForm((p) => ({ ...p, whatsapp: e.target.value }))}
                className="h-9 w-full min-w-0 rounded-lg border border-border/30 bg-bg-card/50 px-3 py-1 text-sm text-text-primary backdrop-blur-[8px] outline-none transition-all duration-200 focus:border-primary/50 focus:bg-bg-card/70 focus:shadow-[0_0_16px_rgba(37,99,235,0.15)] placeholder:text-text-tertiary"
              />
            </div>
            <div className="space-y-1 flex flex-col">
              <label className="text-xs font-semibold text-text-secondary select-none">Website Domain</label>
              <input
                type="text"
                placeholder="e.g. sharmadental.com"
                value={form.website}
                onChange={(e) => setForm((p) => ({ ...p, website: e.target.value }))}
                className="h-9 w-full min-w-0 rounded-lg border border-border/30 bg-bg-card/50 px-3 py-1 text-sm text-text-primary backdrop-blur-[8px] outline-none transition-all duration-200 focus:border-primary/50 focus:bg-bg-card/70 focus:shadow-[0_0_16px_rgba(37,99,235,0.15)] placeholder:text-text-tertiary"
              />
            </div>

            {/* Row 4: Industry | City */}
            <div className="space-y-1 flex flex-col">
              <label className="text-xs font-semibold text-text-secondary select-none">Industry</label>
              <input
                type="text"
                placeholder="e.g. Healthcare, Education"
                value={form.industry}
                onChange={(e) => setForm((p) => ({ ...p, industry: e.target.value }))}
                className="h-9 w-full min-w-0 rounded-lg border border-border/30 bg-bg-card/50 px-3 py-1 text-sm text-text-primary backdrop-blur-[8px] outline-none transition-all duration-200 focus:border-primary/50 focus:bg-bg-card/70 focus:shadow-[0_0_16px_rgba(37,99,235,0.15)] placeholder:text-text-tertiary"
              />
            </div>
            <div className="space-y-1 flex flex-col">
              <label className="text-xs font-semibold text-text-secondary select-none">City / Location</label>
              <input
                type="text"
                placeholder="e.g. Kanpur"
                value={form.city}
                onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))}
                className="h-9 w-full min-w-0 rounded-lg border border-border/30 bg-bg-card/50 px-3 py-1 text-sm text-text-primary backdrop-blur-[8px] outline-none transition-all duration-200 focus:border-primary/50 focus:bg-bg-card/70 focus:shadow-[0_0_16px_rgba(37,99,235,0.15)] placeholder:text-text-tertiary"
              />
            </div>

            {/* Row 5: Status (dropdown) | Monthly Retainer (₹) */}
            <div className="space-y-1 flex flex-col">
              <label className="text-xs font-semibold text-text-secondary select-none">Client Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm((p) => ({ ...p, status: e.target.value as ClientStatus }))}
                className="h-9 w-full min-w-0 rounded-lg border border-border/30 bg-bg-card/50 px-3 py-1 text-sm text-text-primary backdrop-blur-[8px] outline-none transition-all duration-200 focus:border-primary/50 focus:bg-bg-card/70 focus:shadow-[0_0_16px_rgba(37,99,235,0.15)]"
              >
                <option value="active">Active Client</option>
                <option value="lead">Lead / Prospect</option>
                <option value="paused">Paused</option>
                <option value="churned">Churned / Closed</option>
              </select>
            </div>
            <div className="space-y-1 flex flex-col">
              <label className="text-xs font-semibold text-text-secondary select-none">Monthly Retainer (₹)</label>
              <input
                type="number"
                placeholder="e.g. 15000"
                value={form.monthly_retainer}
                onChange={(e) => setForm((p) => ({ ...p, monthly_retainer: e.target.value }))}
                className="h-9 w-full min-w-0 rounded-lg border border-border/30 bg-bg-card/50 px-3 py-1 text-sm text-text-primary backdrop-blur-[8px] outline-none transition-all duration-200 focus:border-primary/50 focus:bg-bg-card/70 focus:shadow-[0_0_16px_rgba(37,99,235,0.15)] placeholder:text-text-tertiary"
              />
            </div>

            {/* Row 6: Start Date | Contract End Date */}
            <div className="space-y-1 flex flex-col">
              <label className="text-xs font-semibold text-text-secondary select-none">Start Date</label>
              <input
                type="date"
                value={form.start_date}
                onChange={(e) => setForm((p) => ({ ...p, start_date: e.target.value }))}
                className="h-9 w-full min-w-0 rounded-lg border border-border/30 bg-bg-card/50 px-3 py-1 text-sm text-text-primary backdrop-blur-[8px] outline-none transition-all duration-200 focus:border-primary/50 focus:bg-bg-card/70 focus:shadow-[0_0_16px_rgba(37,99,235,0.15)]"
              />
            </div>
            <div className="space-y-1 flex flex-col">
              <label className="text-xs font-semibold text-text-secondary select-none">Contract End Date</label>
              <input
                type="date"
                value={form.contract_end}
                onChange={(e) => setForm((p) => ({ ...p, contract_end: e.target.value }))}
                className="h-9 w-full min-w-0 rounded-lg border border-border/30 bg-bg-card/50 px-3 py-1 text-sm text-text-primary backdrop-blur-[8px] outline-none transition-all duration-200 focus:border-primary/50 focus:bg-bg-card/70 focus:shadow-[0_0_16px_rgba(37,99,235,0.15)]"
              />
            </div>

            {/* Account Manager (Unassigned default helper) */}
            <div className="col-span-2 space-y-1 flex flex-col">
              <label className="text-xs font-semibold text-text-secondary select-none">Assigned Account Manager</label>
              <select
                value={form.assigned_to}
                onChange={(e) => setForm((p) => ({ ...p, assigned_to: e.target.value }))}
                className="h-9 w-full min-w-0 rounded-lg border border-border/30 bg-bg-card/50 px-3 py-1 text-sm text-text-primary backdrop-blur-[8px] outline-none transition-all duration-200 focus:border-primary/50 focus:bg-bg-card/70 focus:shadow-[0_0_16px_rgba(37,99,235,0.15)]"
              >
                <option value="">Unassigned</option>
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.full_name} ({p.role})
                  </option>
                ))}
              </select>
            </div>

            {/* Full width: Services checkboxes in pill style */}
            <div className="col-span-2 space-y-2 flex flex-col">
              <label className="text-xs font-semibold text-text-secondary select-none">Services Subscribed</label>
              <div className="flex flex-wrap gap-2 p-1">
                {SERVICE_OPTIONS.map((opt) => {
                  const isSelected = form.services.includes(opt.id);
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        setForm((p) => ({
                          ...p,
                          services: isSelected
                            ? p.services.filter((s) => s !== opt.id)
                            : [...p.services, opt.id],
                        }));
                      }}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider transition-all border cursor-pointer select-none ${
                        isSelected
                          ? 'bg-primary border-primary text-text-primary'
                          : 'bg-bg-card border border-border/20 text-text-secondary hover:border-border/60 hover:text-text-primary'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Full width: Notes textarea */}
            <div className="col-span-2 space-y-1 flex flex-col">
              <label className="text-xs font-semibold text-text-secondary select-none">Retainer Notes</label>
              <textarea
                placeholder="Specific instructions, billing conditions, deliverables agreements..."
                value={form.notes}
                onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                rows={3}
                className="h-20 w-full rounded-lg border border-border/30 bg-bg-card/50 px-3 py-2 text-sm text-text-primary backdrop-blur-[8px] outline-none transition-all duration-200 focus:border-primary/50 focus:bg-bg-card/70 focus:shadow-[0_0_16px_rgba(37,99,235,0.15)] placeholder:text-text-tertiary resize-none"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => { setAddModalOpen(false); resetForm(); }}
            >
              Cancel
            </Button>
            <Button onClick={handleAddClient}>
              Add Client
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ━━━ MODAL: EDIT CLIENT ━━━ */}
      <Dialog open={editModalOpen} onOpenChange={(open) => { setEditModalOpen(open); if(!open) resetForm(); }}>
        <DialogContent className="sm:max-w-[600px] select-none max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Client Profile</DialogTitle>
            <DialogDescription>
              Modify business information, health index score, retainer status, and active channels.
            </DialogDescription>
          </DialogHeader>

          {/* Restructured 2-Column Grid Layout */}
          <div className="grid grid-cols-2 gap-4 my-2 text-xs">
            {/* Row 1: Name* | Company */}
            <div className="space-y-1 flex flex-col">
              <label className="text-xs font-semibold text-text-secondary select-none">Client Name *</label>
              <input
                type="text"
                placeholder="Name"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                className="h-9 w-full min-w-0 rounded-lg border border-border/30 bg-bg-card/50 px-3 py-1 text-sm text-text-primary backdrop-blur-[8px] outline-none transition-all duration-200 focus:border-primary/50 focus:bg-bg-card/70 focus:shadow-[0_0_16px_rgba(37,99,235,0.15)] placeholder:text-text-tertiary"
              />
            </div>
            <div className="space-y-1 flex flex-col">
              <label className="text-xs font-semibold text-text-secondary select-none">Company / Business Name</label>
              <input
                type="text"
                placeholder="Company"
                value={form.company}
                onChange={(e) => setForm((p) => ({ ...p, company: e.target.value }))}
                className="h-9 w-full min-w-0 rounded-lg border border-border/30 bg-bg-card/50 px-3 py-1 text-sm text-text-primary backdrop-blur-[8px] outline-none transition-all duration-200 focus:border-primary/50 focus:bg-bg-card/70 focus:shadow-[0_0_16px_rgba(37,99,235,0.15)] placeholder:text-text-tertiary"
              />
            </div>

            {/* Row 2: Email | Phone */}
            <div className="space-y-1 flex flex-col">
              <label className="text-xs font-semibold text-text-secondary select-none">Email Address</label>
              <input
                type="email"
                placeholder="Email"
                value={form.email}
                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                className="h-9 w-full min-w-0 rounded-lg border border-border/30 bg-bg-card/50 px-3 py-1 text-sm text-text-primary backdrop-blur-[8px] outline-none transition-all duration-200 focus:border-primary/50 focus:bg-bg-card/70 focus:shadow-[0_0_16px_rgba(37,99,235,0.15)] placeholder:text-text-tertiary"
              />
            </div>
            <div className="space-y-1 flex flex-col">
              <label className="text-xs font-semibold text-text-secondary select-none">Phone Number</label>
              <input
                type="text"
                placeholder="Phone"
                value={form.phone}
                onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                className="h-9 w-full min-w-0 rounded-lg border border-border/30 bg-bg-card/50 px-3 py-1 text-sm text-text-primary backdrop-blur-[8px] outline-none transition-all duration-200 focus:border-primary/50 focus:bg-bg-card/70 focus:shadow-[0_0_16px_rgba(37,99,235,0.15)] placeholder:text-text-tertiary"
              />
            </div>

            {/* Row 3: WhatsApp | Website */}
            <div className="space-y-1 flex flex-col">
              <label className="text-xs font-semibold text-text-secondary select-none">WhatsApp Number</label>
              <input
                type="text"
                placeholder="WhatsApp"
                value={form.whatsapp}
                onChange={(e) => setForm((p) => ({ ...p, whatsapp: e.target.value }))}
                className="h-9 w-full min-w-0 rounded-lg border border-border/30 bg-bg-card/50 px-3 py-1 text-sm text-text-primary backdrop-blur-[8px] outline-none transition-all duration-200 focus:border-primary/50 focus:bg-bg-card/70 focus:shadow-[0_0_16px_rgba(37,99,235,0.15)] placeholder:text-text-tertiary"
              />
            </div>
            <div className="space-y-1 flex flex-col">
              <label className="text-xs font-semibold text-text-secondary select-none">Website Domain</label>
              <input
                type="text"
                placeholder="Website"
                value={form.website}
                onChange={(e) => setForm((p) => ({ ...p, website: e.target.value }))}
                className="h-9 w-full min-w-0 rounded-lg border border-border/30 bg-bg-card/50 px-3 py-1 text-sm text-text-primary backdrop-blur-[8px] outline-none transition-all duration-200 focus:border-primary/50 focus:bg-bg-card/70 focus:shadow-[0_0_16px_rgba(37,99,235,0.15)] placeholder:text-text-tertiary"
              />
            </div>

            {/* Row 4: Industry | City */}
            <div className="space-y-1 flex flex-col">
              <label className="text-xs font-semibold text-text-secondary select-none">Industry</label>
              <input
                type="text"
                placeholder="Industry"
                value={form.industry}
                onChange={(e) => setForm((p) => ({ ...p, industry: e.target.value }))}
                className="h-9 w-full min-w-0 rounded-lg border border-border/30 bg-bg-card/50 px-3 py-1 text-sm text-text-primary backdrop-blur-[8px] outline-none transition-all duration-200 focus:border-primary/50 focus:bg-bg-card/70 focus:shadow-[0_0_16px_rgba(37,99,235,0.15)] placeholder:text-text-tertiary"
              />
            </div>
            <div className="space-y-1 flex flex-col">
              <label className="text-xs font-semibold text-text-secondary select-none">City / Location</label>
              <input
                type="text"
                placeholder="City"
                value={form.city}
                onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))}
                className="h-9 w-full min-w-0 rounded-lg border border-border/30 bg-bg-card/50 px-3 py-1 text-sm text-text-primary backdrop-blur-[8px] outline-none transition-all duration-200 focus:border-primary/50 focus:bg-bg-card/70 focus:shadow-[0_0_16px_rgba(37,99,235,0.15)] placeholder:text-text-tertiary"
              />
            </div>

            {/* Row 5: Status (dropdown) | Monthly Retainer (₹) */}
            <div className="space-y-1 flex flex-col">
              <label className="text-xs font-semibold text-text-secondary select-none">Client Status</label>
              <select
                value={form.status}
                disabled={selectedClient?.is_agency_self}
                onChange={(e) => setForm((p) => ({ ...p, status: e.target.value as ClientStatus }))}
                className="h-9 w-full min-w-0 rounded-lg border border-border/30 bg-bg-card/50 px-3 py-1 text-sm text-text-primary backdrop-blur-[8px] outline-none transition-all duration-200 focus:border-primary/50 focus:bg-bg-card/70 focus:shadow-[0_0_16px_rgba(37,99,235,0.15)]"
              >
                <option value="active">Active Client</option>
                <option value="lead">Lead / Prospect</option>
                <option value="paused">Paused</option>
                <option value="churned">Churned / Closed</option>
              </select>
            </div>
            <div className="space-y-1 flex flex-col">
              <label className="text-xs font-semibold text-text-secondary select-none">Monthly Retainer (₹)</label>
              <input
                type="number"
                placeholder="Retainer"
                disabled={selectedClient?.is_agency_self}
                value={form.monthly_retainer}
                onChange={(e) => setForm((p) => ({ ...p, monthly_retainer: e.target.value }))}
                className="h-9 w-full min-w-0 rounded-lg border border-border/30 bg-bg-card/50 px-3 py-1 text-sm text-text-primary backdrop-blur-[8px] outline-none transition-all duration-200 focus:border-primary/50 focus:bg-bg-card/70 focus:shadow-[0_0_16px_rgba(37,99,235,0.15)] placeholder:text-text-tertiary"
              />
            </div>

            {/* Row 6: Start Date | Contract End Date */}
            <div className="space-y-1 flex flex-col">
              <label className="text-xs font-semibold text-text-secondary select-none">Start Date</label>
              <input
                type="date"
                value={form.start_date}
                onChange={(e) => setForm((p) => ({ ...p, start_date: e.target.value }))}
                className="h-9 w-full min-w-0 rounded-lg border border-border/30 bg-bg-card/50 px-3 py-1 text-sm text-text-primary backdrop-blur-[8px] outline-none transition-all duration-200 focus:border-primary/50 focus:bg-bg-card/70 focus:shadow-[0_0_16px_rgba(37,99,235,0.15)]"
              />
            </div>
            <div className="space-y-1 flex flex-col">
              <label className="text-xs font-semibold text-text-secondary select-none">Contract End Date</label>
              <input
                type="date"
                value={form.contract_end}
                onChange={(e) => setForm((p) => ({ ...p, contract_end: e.target.value }))}
                className="h-9 w-full min-w-0 rounded-lg border border-border/30 bg-bg-card/50 px-3 py-1 text-sm text-text-primary backdrop-blur-[8px] outline-none transition-all duration-200 focus:border-primary/50 focus:bg-bg-card/70 focus:shadow-[0_0_16px_rgba(37,99,235,0.15)]"
              />
            </div>

            {/* Account Manager & Health Score */}
            <div className="space-y-1 flex flex-col">
              <label className="text-xs font-semibold text-text-secondary select-none">Account Manager</label>
              <select
                value={form.assigned_to}
                onChange={(e) => setForm((p) => ({ ...p, assigned_to: e.target.value }))}
                className="h-9 w-full min-w-0 rounded-lg border border-border/30 bg-bg-card/50 px-3 py-1 text-sm text-text-primary backdrop-blur-[8px] outline-none transition-all duration-200 focus:border-primary/50 focus:bg-bg-card/70 focus:shadow-[0_0_16px_rgba(37,99,235,0.15)]"
              >
                <option value="">Unassigned</option>
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.full_name} ({p.role})
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1 flex flex-col">
              <label className="text-xs font-semibold text-text-secondary select-none">Client Health Score (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                placeholder="100"
                value={form.health_score}
                onChange={(e) => setForm((p) => ({ ...p, health_score: e.target.value }))}
                className="h-9 w-full min-w-0 rounded-lg border border-border/30 bg-bg-card/50 px-3 py-1 text-sm text-text-primary backdrop-blur-[8px] outline-none transition-all duration-200 focus:border-primary/50 focus:bg-bg-card/70 focus:shadow-[0_0_16px_rgba(37,99,235,0.15)]"
              />
            </div>

            {/* Full width: Services checkboxes in pill style */}
            <div className="col-span-2 space-y-2 flex flex-col">
              <label className="text-xs font-semibold text-text-secondary select-none">Services Subscribed</label>
              <div className="flex flex-wrap gap-2 p-1">
                {SERVICE_OPTIONS.map((opt) => {
                  const isSelected = form.services.includes(opt.id);
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        setForm((p) => ({
                          ...p,
                          services: isSelected
                            ? p.services.filter((s) => s !== opt.id)
                            : [...p.services, opt.id],
                        }));
                      }}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider transition-all border cursor-pointer select-none ${
                        isSelected
                          ? 'bg-primary border-primary text-text-primary'
                          : 'bg-bg-card border border-border/20 text-text-secondary hover:border-border/60 hover:text-text-primary'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Full width: Notes textarea */}
            <div className="col-span-2 space-y-1 flex flex-col">
              <label className="text-xs font-semibold text-text-secondary select-none">Notes / Logs</label>
              <textarea
                placeholder="Add special instructions..."
                value={form.notes}
                onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                rows={3}
                className="h-20 w-full rounded-lg border border-border/30 bg-bg-card/50 px-3 py-2 text-sm text-text-primary backdrop-blur-[8px] outline-none transition-all duration-200 focus:border-primary/50 focus:bg-bg-card/70 focus:shadow-[0_0_16px_rgba(37,99,235,0.15)] placeholder:text-text-tertiary resize-none"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => { setEditModalOpen(false); resetForm(); }}
            >
              Cancel
            </Button>
            <Button onClick={handleEditClient}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ━━━ CONFIRM DIALOG: DELETE CLIENT ━━━ */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onClose={() => { setDeleteDialogOpen(false); setSelectedClient(null); }}
        onConfirm={handleDeleteClient}
        title="Delete Client Account"
        description={`Are you sure you want to permanently delete the client account for "${selectedClient?.name}"? All associated active projects, keyword audits, and uploaded folders will be removed. This action is irreversible.`}
        confirmLabel="Delete Account"
        variant="danger"
      />
    </div>
  );
}
export default ClientsDashboard;
