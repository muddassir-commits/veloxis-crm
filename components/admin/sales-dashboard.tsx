'use client';

import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import {
  Plus,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PipelineKanban } from './sales/pipeline-kanban';
import { OutreachLog } from './sales/outreach-log';
import { SalesAnalytics } from './sales/sales-analytics';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Lead, OutreachLog as OutreachLogType, Profile } from '@/types';

interface SalesDashboardProps {
  clientId?: string; // Optional client id context (not used for global sales)
  initialLeads: Lead[] | null;
  initialOutreachLogs: OutreachLogType[] | null;
  profiles: Profile[] | null;
}

export function SalesDashboard({
  initialLeads,
  initialOutreachLogs,
  profiles,
}: SalesDashboardProps) {
  const supabase = createClient();
  const [activeTab, setActiveTab] = useState<'pipeline' | 'outreach' | 'analytics'>('pipeline');
  const [leads, setLeads] = useState<Lead[]>(initialLeads || []);
  const [outreachLogs, setOutreachLogs] = useState<OutreachLogType[]>(initialOutreachLogs || []);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [addLeadOpen, setAddLeadOpen] = useState(false);

  // Form state for adding lead
  const [leadForm, setLeadForm] = useState({
    name: '',
    company: '',
    email: '',
    phone: '',
    whatsapp: '',
    website: '',
    industry: '',
    city: '',
    source: 'website',
    estimated_value: '',
    notes: '',
    follow_up_date: '',
    assigned_to: '',
  });

  // Fetch updated data from database
  const refreshData = async () => {
    setIsRefreshing(true);
    try {
      const { data: newLeads } = await supabase
        .from('leads')
        .select('*')
        .order('updated_at', { ascending: false });

      const { data: newLogs } = await supabase
        .from('outreach_log')
        .select('*')
        .order('date', { ascending: false });

      if (newLeads) setLeads(newLeads);
      if (newLogs) setOutreachLogs(newLogs);
      
    } catch {
      toast.error('Failed to refresh data.');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Auto lead scoring function
  const calculateLeadScore = (form: typeof leadForm) => {
    let score = 30; // base score

    // 1. Budget Indicated (Estimated Value)
    const val = Number(form.estimated_value || 0);
    if (val >= 100000) score += 30;
    else if (val >= 50000) score += 20;
    else if (val >= 20000) score += 10;

    // 2. Lead Source Quality
    const src = form.source;
    if (src === 'referral') score += 25;
    else if (src === 'website') score += 15;
    else if (src === 'linkedin') score += 10;
    else if (src === 'cold_whatsapp') score -= 10;

    // 3. Target Industry
    const ind = form.industry.toLowerCase();
    if (
      ind.includes('tech') ||
      ind.includes('software') ||
      ind.includes('ecommerce') ||
      ind.includes('finance') ||
      ind.includes('education') ||
      ind.includes('real estate')
    ) {
      score += 15;
    }

    return Math.min(100, Math.max(0, score));
  };

  // Submit Handler for Adding Lead
  const handleAddLead = async () => {
    if (!leadForm.name.trim()) {
      toast.error('Lead name is required.');
      return;
    }

    try {
      const score = calculateLeadScore(leadForm);
      const estValue = leadForm.estimated_value ? Number(leadForm.estimated_value) : 0;

      const { data, error } = await supabase
        .from('leads')
        .insert({
          name: leadForm.name,
          company: leadForm.company || null,
          email: leadForm.email || null,
          phone: leadForm.phone || null,
          whatsapp: leadForm.whatsapp || null,
          website: leadForm.website || null,
          industry: leadForm.industry || null,
          city: leadForm.city || null,
          source: leadForm.source,
          status: 'new',
          score,
          estimated_value: estValue,
          notes: leadForm.notes || null,
          assigned_to: leadForm.assigned_to || null,
          follow_up_date: leadForm.follow_up_date || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select('*')
        .single();

      if (error) throw error;

      // Log activity for creation
      await supabase.from('lead_activities').insert({
        lead_id: data.id,
        type: 'note',
        description: `Lead created via sales dashboard. Auto-score: ${score}/100.`,
        created_at: new Date().toISOString(),
      });

      // Notify ALL admins — new lead created
      const { data: admins } = await supabase.from('profiles').select('id').eq('role', 'admin');
      if (admins && admins.length > 0) {
        const notifs = admins.map((a) => ({
          user_id: a.id,
          title: '🆕 New Lead Added',
          message: `New lead: ${leadForm.name} from ${leadForm.source} (Value: ₹${estValue})`,
          type: 'lead_new',
          link: `/dashboard/sales`,
          is_read: false,
          priority: 'normal'
        }));
        await supabase.from('notifications').insert(notifs);
      }

      toast.success(`Lead ${leadForm.name} created successfully.`);
      setAddLeadOpen(false);
      setLeadForm({
        name: '',
        company: '',
        email: '',
        phone: '',
        whatsapp: '',
        website: '',
        industry: '',
        city: '',
        source: 'website',
        estimated_value: '',
        notes: '',
        follow_up_date: '',
        assigned_to: '',
      });
      refreshData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create lead.';
      toast.error(message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Tab Navigation header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border/20 select-none gap-4 pb-2">
        <div className="flex items-center gap-2 overflow-x-auto">
          {(['pipeline', 'outreach', 'analytics'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider border-b-2 cursor-pointer transition-all ${
                activeTab === tab
                  ? 'border-primary text-text-primary'
                  : 'border-transparent text-text-secondary hover:text-text-primary'
              }`}
            >
              {tab === 'pipeline' ? 'Pipeline' : tab === 'outreach' ? 'Outreach Log' : 'Analytics'}
            </button>
          ))}
        </div>

        {/* Global Toolbar buttons */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          {activeTab === 'pipeline' && (
            <Button
              onClick={() => setAddLeadOpen(true)}
              size="sm"
              className="text-xs h-8 gap-1.5 cursor-pointer font-semibold"
            >
              <Plus size={13} />
              <span>Add Lead</span>
            </Button>
          )}

          <Button
            onClick={refreshData}
            disabled={isRefreshing}
            size="sm"
            variant="outline"
            className="text-text-secondary hover:text-text-primary text-xs h-8 gap-1.5 cursor-pointer"
          >
            <RefreshCw size={13} className={`stroke-[1.5] ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
          </Button>
        </div>
      </div>

      {/* Render selected tab */}
      {activeTab === 'pipeline' && (
        <PipelineKanban
          leads={leads}
          profiles={profiles || []}
          onLeadUpdated={refreshData}
        />
      )}

      {activeTab === 'outreach' && (
        <OutreachLog
          outreachLogs={outreachLogs}
          onOutreachLogged={refreshData}
        />
      )}

      {activeTab === 'analytics' && <SalesAnalytics leads={leads} />}

      {/* ━━━ MODAL: ADD LEAD ━━━ */}
      <Dialog open={addLeadOpen} onOpenChange={setAddLeadOpen}>
        <DialogContent className="sm:max-w-[600px] select-none">
          <DialogHeader>
            <DialogTitle>Add New Lead</DialogTitle>
            <DialogDescription>
              Enter the client details to add a new lead. Leads will be automatically scored based on industry, value, and source.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4 my-2 text-xs">
            <div className="space-y-1">
              <label className="text-text-secondary font-semibold">Full Name *</label>
              <Input
                type="text"
                placeholder="e.g. John Doe"
                value={leadForm.name}
                onChange={(e) => setLeadForm((p) => ({ ...p, name: e.target.value }))}
                className="h-9"
              />
            </div>

            <div className="space-y-1">
              <label className="text-text-secondary font-semibold">Company / Business Name</label>
              <Input
                type="text"
                placeholder="e.g. Acme Corp"
                value={leadForm.company}
                onChange={(e) => setLeadForm((p) => ({ ...p, company: e.target.value }))}
                className="h-9"
              />
            </div>

            <div className="space-y-1">
              <label className="text-text-secondary font-semibold">Email Address</label>
              <Input
                type="email"
                placeholder="john@example.com"
                value={leadForm.email}
                onChange={(e) => setLeadForm((p) => ({ ...p, email: e.target.value }))}
                className="h-9"
              />
            </div>

            <div className="space-y-1">
              <label className="text-text-secondary font-semibold">Phone Number</label>
              <Input
                type="text"
                placeholder="e.g. +91 9999999999"
                value={leadForm.phone}
                onChange={(e) => setLeadForm((p) => ({ ...p, phone: e.target.value }))}
                className="h-9"
              />
            </div>

            <div className="space-y-1">
              <label className="text-text-secondary font-semibold">WhatsApp Number</label>
              <Input
                type="text"
                placeholder="e.g. 919999999999"
                value={leadForm.whatsapp}
                onChange={(e) => setLeadForm((p) => ({ ...p, whatsapp: e.target.value }))}
                className="h-9"
              />
            </div>

            <div className="space-y-1">
              <label className="text-text-secondary font-semibold">Website Domain</label>
              <Input
                type="text"
                placeholder="e.g. example.com"
                value={leadForm.website}
                onChange={(e) => setLeadForm((p) => ({ ...p, website: e.target.value }))}
                className="h-9"
              />
            </div>

            <div className="space-y-1">
              <label className="text-text-secondary font-semibold">Industry Type</label>
              <Input
                type="text"
                placeholder="e.g. E-commerce, Real Estate"
                value={leadForm.industry}
                onChange={(e) => setLeadForm((p) => ({ ...p, industry: e.target.value }))}
                className="h-9"
              />
            </div>

            <div className="space-y-1">
              <label className="text-text-secondary font-semibold">City / Region</label>
              <Input
                type="text"
                placeholder="e.g. Kanpur, Lucknow"
                value={leadForm.city}
                onChange={(e) => setLeadForm((p) => ({ ...p, city: e.target.value }))}
                className="h-9"
              />
            </div>

            <div className="space-y-1">
              <label className="text-text-secondary font-semibold">Lead Source</label>
              <select
                value={leadForm.source}
                onChange={(e) => setLeadForm((p) => ({ ...p, source: e.target.value }))}
                className="flex h-9 w-full rounded-lg border border-border/30 bg-bg-card/50 backdrop-blur-[8px] px-3 py-1 text-xs text-text-primary outline-none hover:border-border/60 focus:border-primary/50 focus:bg-bg-card/70 focus:shadow-[0_0_16px_rgba(37,99,235,0.15)] transition-all duration-200"
              >
                <option value="website">Website Audit Form</option>
                <option value="linkedin">LinkedIn Outreach</option>
                <option value="instagram">Instagram DM</option>
                <option value="cold_whatsapp">Cold WhatsApp</option>
                <option value="referral">Client Referral</option>
                <option value="other">Other / Custom</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-text-secondary font-semibold">Estimated Deal Value (₹)</label>
              <Input
                type="number"
                placeholder="e.g. 25000"
                value={leadForm.estimated_value}
                onChange={(e) => setLeadForm((p) => ({ ...p, estimated_value: e.target.value }))}
                className="h-9"
              />
            </div>

            <div className="space-y-1">
              <label className="text-text-secondary font-semibold">Assign To Agent</label>
              <select
                value={leadForm.assigned_to}
                onChange={(e) => setLeadForm((p) => ({ ...p, assigned_to: e.target.value }))}
                className="flex h-9 w-full rounded-lg border border-border/30 bg-bg-card/50 backdrop-blur-[8px] px-3 py-1 text-xs text-text-primary outline-none hover:border-border/60 focus:border-primary/50 focus:bg-bg-card/70 focus:shadow-[0_0_16px_rgba(37,99,235,0.15)] transition-all duration-200"
              >
                <option value="">Unassigned</option>
                {profiles?.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.full_name} ({p.role})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-text-secondary font-semibold">Next Follow-Up Date</label>
              <Input
                type="date"
                value={leadForm.follow_up_date}
                onChange={(e) => setLeadForm((p) => ({ ...p, follow_up_date: e.target.value }))}
                className="h-9"
              />
            </div>

            <div className="col-span-2 space-y-1">
              <label className="text-text-secondary font-semibold">Lead Notes / Requirements</label>
              <Textarea
                placeholder="Describe client specific requirements..."
                value={leadForm.notes}
                onChange={(e) => setLeadForm((p) => ({ ...p, notes: e.target.value }))}
                rows={2}
                className="resize-none"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAddLeadOpen(false)}
              className="text-text-secondary hover:text-text-primary cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddLead}
              className="cursor-pointer"
            >
              Create Lead
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
export default SalesDashboard;
