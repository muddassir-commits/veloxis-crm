'use client';

import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
} from '@dnd-kit/core';
import { DraggableLeadCard } from '@/components/sales/lead-card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Lead, Profile, LeadStatus } from '@/types';

interface PipelineKanbanProps {
  leads: Lead[];
  profiles: Profile[];
  onLeadUpdated: () => void;
}

const COLUMNS = [
  { id: 'new', label: 'New', status: ['new'] },
  { id: 'contacted', label: 'Contacted', status: ['contacted'] },
  { id: 'discovery', label: 'Discovery', status: ['discovery'] },
  { id: 'proposal', label: 'Proposal', status: ['proposal'] },
  { id: 'negotiation', label: 'Negotiation', status: ['negotiation'] },
  { id: 'closed', label: 'Won — Lost', status: ['won', 'lost'] },
];

// Droppable Column Component
interface DroppableColumnProps {
  id: string;
  label: string;
  count: number;
  children: React.ReactNode;
}

function DroppableColumn({ id, label, count, children }: DroppableColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id,
  });

  return (
    <div
      ref={setNodeRef}
      className={`rounded-[10px] bg-[#0D1829] border border-[#1E3352] p-3 flex flex-col min-h-[400px] w-[280px] shrink-0 transition-all ${
        isOver ? 'border-[#1B4FD8] bg-[#132035]/50' : ''
      }`}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between mb-3 border-b border-[#1E3352]/30 pb-2">
        <span className="text-xs font-bold uppercase tracking-wider text-[#4A6480] select-none">
          {label}
        </span>
        <span className="text-[10px] font-mono bg-[#1E3352]/30 text-[#8BA3C7] px-2 py-0.5 rounded-full select-none font-bold">
          {count}
        </span>
      </div>

      {/* Cards list */}
      <div className="space-y-3 flex-1 flex flex-col">
        {children}
      </div>
    </div>
  );
}

export function PipelineKanban({ leads, profiles, onLeadUpdated }: PipelineKanbanProps) {
  const supabase = createClient();
  const [localLeads, setLocalLeads] = useState<Lead[]>(leads);
  const [prevLeads, setPrevLeads] = useState<Lead[]>(leads);

  // Sync prop changes into local state during render to avoid cascading useEffect renders
  if (leads !== prevLeads) {
    setPrevLeads(leads);
    setLocalLeads(leads);
  }

  const [now] = useState(() => Date.now());

  // Modal states
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [modalOpen, setModalOpen] = useState<{
    activity: boolean;
    convert: boolean;
    lost: boolean;
  }>({
    activity: false,
    convert: false,
    lost: false,
  });

  // Form states
  const [activityForm, setActivityForm] = useState({
    type: 'call',
    description: '',
    outcome: '',
    duration_min: '',
  });

  const [convertForm, setConvertForm] = useState<{
    monthly_retainer: string;
    services: string[];
    notes: string;
  }>({
    monthly_retainer: '',
    services: [],
    notes: '',
  });

  const [lostForm, setLostForm] = useState({
    lost_reason: '',
  });

  // Services list for conversion
  const SERVICE_OPTIONS = [
    { id: 'seo', label: 'SEO Optimization' },
    { id: 'meta_ads', label: 'Meta Ads (FB/IG)' },
    { id: 'google_ads', label: 'Google Ads' },
    { id: 'smm', label: 'Social Media Management' },
    { id: 'website', label: 'Web Design & Dev' },
    { id: 'content', label: 'Content Marketing' },
    { id: 'email', label: 'Email Marketing' },
    { id: 'whatsapp', label: 'WhatsApp Automation' },
    { id: 'gbp', label: 'GBP Management' },
    { id: 'other', label: 'Other / Custom' },
  ];

  // Configure pointer sensors with activation constraints
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // 5px drag threshold to prevent blocking click events on card action icons
      },
    })
  );

  // Drag End handler
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const leadId = String(active.id);
    const targetColId = String(over.id);

    const lead = localLeads.find((l) => l.id === leadId);
    if (!lead) return;

    // Check if current column of the lead is already in target column
    const currentColumn = COLUMNS.find((col) => col.status.includes(lead.status));
    if (currentColumn?.id === targetColId) return;

    if (targetColId === 'closed') {
      // Trigger convert or mark lost modal choice
      setSelectedLead(lead);
      setConvertForm({
        monthly_retainer: String(lead.estimated_value || 0),
        services: [],
        notes: lead.notes || '',
      });
      setModalOpen((prev) => ({ ...prev, convert: true }));
    } else {
      const targetStatus = targetColId as LeadStatus;
      const originalLeads = [...localLeads];

      // Optimistic update
      setLocalLeads((prev) =>
        prev.map((l) =>
          l.id === leadId
            ? { ...l, status: targetStatus, updated_at: new Date().toISOString() }
            : l
        )
      );

      try {
        const { error } = await supabase
          .from('leads')
          .update({ status: targetStatus, updated_at: new Date().toISOString() })
          .eq('id', leadId);

        if (error) throw error;

        // Log activity automatically on status change
        await supabase.from('lead_activities').insert({
          lead_id: leadId,
          type: 'note',
          description: `Lead status updated to ${targetStatus} (via Kanban Drag & Drop).`,
          created_at: new Date().toISOString(),
        });

        toast.success(`Status updated to ${targetStatus}`);
        onLeadUpdated();
      } catch (err) {
        // Rollback state on failure
        setLocalLeads(originalLeads);
        const errorMessage = err instanceof Error ? err.message : 'Failed to update status.';
        toast.error(`Database update failed: ${errorMessage}. Reverted card.`);
      }
    }
  };

  // Log Activity Submission
  const handleLogActivity = async () => {
    if (!selectedLead) return;
    if (!activityForm.description.trim()) {
      toast.error('Description is required.');
      return;
    }

    try {
      const { error } = await supabase.from('lead_activities').insert({
        lead_id: selectedLead.id,
        type: activityForm.type,
        description: activityForm.description,
        outcome: activityForm.outcome || null,
        duration_min: activityForm.duration_min ? Number(activityForm.duration_min) : null,
        created_at: new Date().toISOString(),
      });

      if (error) throw error;

      toast.success('Activity logged successfully.');
      setModalOpen((prev) => ({ ...prev, activity: false }));
      setActivityForm({ type: 'call', description: '', outcome: '', duration_min: '' });
      onLeadUpdated();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to log activity.';
      toast.error(errorMessage);
    }
  };

  // Convert Lead to Client Submission
  const handleConvertLead = async () => {
    if (!selectedLead) return;

    try {
      // 1. Create client
      const { data: client, error: clientErr } = await supabase
        .from('clients')
        .insert({
          name: selectedLead.name,
          company: selectedLead.company || selectedLead.name,
          email: selectedLead.email,
          phone: selectedLead.phone,
          whatsapp: selectedLead.whatsapp,
          website: selectedLead.website,
          industry: selectedLead.industry,
          city: selectedLead.city,
          status: 'active',
          monthly_retainer: Number(convertForm.monthly_retainer || 0),
          start_date: new Date().toISOString().split('T')[0],
          services: convertForm.services,
          notes: convertForm.notes || null,
          health_score: 100,
          assigned_to: selectedLead.assigned_to,
          lead_id: selectedLead.id,
          is_agency_self: false,
        })
        .select('id')
        .single();

      if (clientErr) throw clientErr;

      // 2. Update lead to won
      const { error: leadErr } = await supabase
        .from('leads')
        .update({
          status: 'won',
          converted_to: client.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedLead.id);

      if (leadErr) throw leadErr;

      // 3. Log won activity
      await supabase.from('lead_activities').insert({
        lead_id: selectedLead.id,
        type: 'meeting',
        description: `Lead converted to client successfully. Monthly retainer: ₹${Number(
          convertForm.monthly_retainer
        ).toLocaleString('en-IN')}`,
        outcome: 'won',
        created_at: new Date().toISOString(),
      });

      // 4. Activity log + Notify all admins — new client won!
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('activity_log').insert({
        user_id: user?.id || null,
        client_id: client.id,
        action: 'lead_converted',
        entity_type: 'client',
        entity_id: client.id,
        title: `Lead converted: ${selectedLead.name}`,
        description: `${selectedLead.name} converted to active client at ₹${Number(convertForm.monthly_retainer || 0).toLocaleString('en-IN')}/mo.`,
      });

      const { data: admins } = await supabase.from('profiles').select('id').eq('role', 'admin');
      if (admins && admins.length > 0) {
        const notifs = admins.map((a) => ({
          user_id: a.id,
          type: 'lead_converted',
          title: `🎉 New client won — ${selectedLead.name}`,
          message: `${selectedLead.name} converted at ₹${Number(convertForm.monthly_retainer || 0).toLocaleString('en-IN')}/mo. Check their profile!`,
          link: `/dashboard/clients/${client.id}`,
          is_read: false,
          priority: 'normal',
        }));
        await supabase.from('notifications').insert(notifs);
      }

      toast.success(`${selectedLead.name} successfully converted to client.`);
      setModalOpen((prev) => ({ ...prev, convert: false }));
      onLeadUpdated();
      
      // Navigate to clients page or profile
      window.location.href = `/dashboard/clients/${client.id}`;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Conversion failed.';
      toast.error(errorMessage);
    }
  };

  // Mark Lead as Lost Submission
  const handleMarkLost = async () => {
    if (!selectedLead) return;
    if (!lostForm.lost_reason.trim()) {
      toast.error('Lost reason is required.');
      return;
    }

    try {
      const { error: leadErr } = await supabase
        .from('leads')
        .update({
          status: 'lost',
          lost_reason: lostForm.lost_reason,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedLead.id);

      if (leadErr) throw leadErr;

      // Log lost activity
      await supabase.from('lead_activities').insert({
        lead_id: selectedLead.id,
        type: 'note',
        description: `Lead marked as lost. Reason: ${lostForm.lost_reason}`,
        outcome: 'lost',
        created_at: new Date().toISOString(),
      });

      toast.success('Lead marked as lost.');
      setModalOpen((prev) => ({ ...prev, lost: false }));
      setLostForm({ lost_reason: '' });
      onLeadUpdated();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update lead status.';
      toast.error(errorMessage);
    }
  };

  return (
    <div className="space-y-6">
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        {/* Kanban Board columns wrapper */}
        <div className="flex gap-4 items-start select-none overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-[#1E3352] scrollbar-track-transparent">
          {COLUMNS.map((col) => {
            const colLeads = localLeads.filter((l) => col.status.includes(l.status));

            return (
              <DroppableColumn key={col.id} id={col.id} label={col.label} count={colLeads.length}>
                {colLeads.map((lead) => {
                  const assignee = profiles.find((p) => p.id === lead.assigned_to);

                  return (
                    <DraggableLeadCard
                      key={lead.id}
                      id={lead.id}
                      lead={lead}
                      assignee={assignee}
                      currentTimestamp={now}
                      onLogActivity={() => {
                        setSelectedLead(lead);
                        setActivityForm({ type: 'call', description: '', outcome: '', duration_min: '' });
                        setModalOpen((prev) => ({ ...prev, activity: true }));
                      }}
                      onConvert={() => {
                        setSelectedLead(lead);
                        setConvertForm({
                          monthly_retainer: String(lead.estimated_value || 0),
                          services: [],
                          notes: lead.notes || '',
                        });
                        setModalOpen((prev) => ({ ...prev, convert: true }));
                      }}
                      onMarkLost={() => {
                        setSelectedLead(lead);
                        setLostForm({ lost_reason: '' });
                        setModalOpen((prev) => ({ ...prev, lost: true }));
                      }}
                    />
                  );
                })}

                {colLeads.length === 0 && (
                  <div className="flex-1 flex items-center justify-center border border-dashed border-[#1E3352]/20 rounded-[8px] p-6 text-center text-[10px] text-[#4A6480] select-none min-h-[120px]">
                    No leads in stage
                  </div>
                )}
              </DroppableColumn>
            );
          })}
        </div>
      </DndContext>

      {/* ━━━ MODAL: LOG ACTIVITY ━━━ */}
      <Dialog
        open={modalOpen.activity}
        onOpenChange={(open) => setModalOpen((prev) => ({ ...prev, activity: open }))}
      >
        <DialogContent className="bg-[#0D1829] border border-[#1E3352] text-[#F0F4FF] max-w-md select-none">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-[#F0F4FF]">
              Log Activity — {selectedLead?.name}
            </DialogTitle>
            <DialogDescription className="text-xs text-[#8BA3C7]">
              Log outreach notes, phone calls, WhatsApp messages, or meetings for this lead.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 my-2 text-xs">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="label">Activity Type</label>
                <select
                  value={activityForm.type}
                  onChange={(e) => setActivityForm((p) => ({ ...p, type: e.target.value }))}
                  className="input h-9"
                >
                  <option value="call">Phone Call</option>
                  <option value="whatsapp">WhatsApp Message</option>
                  <option value="email">Email Outreach</option>
                  <option value="meeting">Discovery Meeting</option>
                  <option value="note">Internal Note</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="label">Duration (minutes)</label>
                <input
                  type="number"
                  placeholder="e.g. 15"
                  value={activityForm.duration_min}
                  onChange={(e) => setActivityForm((p) => ({ ...p, duration_min: e.target.value }))}
                  className="input h-9"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="label">Observation / Description *</label>
              <textarea
                placeholder="Log exactly what was discussed..."
                value={activityForm.description}
                onChange={(e) => setActivityForm((p) => ({ ...p, description: e.target.value }))}
                rows={3}
                className="input resize-none"
              />
            </div>

            <div className="space-y-1">
              <label className="label">Outcome / Response</label>
              <input
                type="text"
                placeholder="e.g. positive, no response, requested proposal"
                value={activityForm.outcome}
                onChange={(e) => setActivityForm((p) => ({ ...p, outcome: e.target.value }))}
                className="input h-9"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setModalOpen((prev) => ({ ...prev, activity: false }))}
              className="bg-transparent border-[#1E3352] text-[#8BA3C7] hover:bg-[#132035] hover:text-[#F0F4FF] cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              onClick={handleLogActivity}
              className="bg-[#1B4FD8] hover:bg-[#2563EB] text-white cursor-pointer"
            >
              Log Activity
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ━━━ MODAL: CONVERT TO CLIENT ━━━ */}
      <Dialog
        open={modalOpen.convert}
        onOpenChange={(open) => setModalOpen((prev) => ({ ...prev, convert: open }))}
      >
        <DialogContent className="bg-[#0D1829] border border-[#1E3352] text-[#F0F4FF] max-w-md select-none">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-[#F0F4FF]">
              Convert to Client — {selectedLead?.name}
            </DialogTitle>
            <DialogDescription className="text-xs text-[#8BA3C7]">
              Mark this lead as won and create a paying client profile in the database.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 my-2 text-xs">
            <div className="space-y-1">
              <label className="label">Monthly Retainer (₹) *</label>
              <input
                type="number"
                placeholder="Enter monthly retainer amount"
                value={convertForm.monthly_retainer}
                onChange={(e) => setConvertForm((p) => ({ ...p, monthly_retainer: e.target.value }))}
                className="input h-9"
              />
            </div>

            <div className="space-y-1">
              <label className="label">Services Subscribed</label>
              <div className="grid grid-cols-2 gap-2 border border-[#1E3352] rounded-[7px] bg-[#060D1A] p-2.5 max-h-[140px] overflow-y-auto">
                {SERVICE_OPTIONS.map((opt) => (
                  <label key={opt.id} className="flex items-center gap-2 cursor-pointer text-[11px] text-[#8BA3C7] hover:text-[#F0F4FF] select-none">
                    <input
                      type="checkbox"
                      checked={convertForm.services.includes(opt.id)}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setConvertForm((p) => ({
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

            <div className="space-y-1">
              <label className="label">Integration & Retainer Notes</label>
              <textarea
                placeholder="e.g. retainer starts next Monday, Google Search Console pre-auth pending"
                value={convertForm.notes}
                onChange={(e) => setConvertForm((p) => ({ ...p, notes: e.target.value }))}
                rows={2}
                className="input resize-none"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setModalOpen((prev) => ({ ...prev, convert: false }))}
              className="bg-transparent border-[#1E3352] text-[#8BA3C7] hover:bg-[#132035] hover:text-[#F0F4FF] cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConvertLead}
              className="bg-[#22C55E] hover:bg-[#22C55E]/90 text-white cursor-pointer"
            >
              Convert to Client
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ━━━ MODAL: MARK LOST ━━━ */}
      <Dialog
        open={modalOpen.lost}
        onOpenChange={(open) => setModalOpen((prev) => ({ ...prev, lost: open }))}
      >
        <DialogContent className="bg-[#0D1829] border border-[#1E3352] text-[#F0F4FF] max-w-sm select-none">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-[#F0F4FF]">
              Mark Lead as Lost
            </DialogTitle>
            <DialogDescription className="text-xs text-[#8BA3C7]">
              Mark {selectedLead?.name} as lost. Please enter the reason for future analytics.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 my-2 text-xs">
            <div className="space-y-1">
              <label className="label">Reason Lost *</label>
              <textarea
                placeholder="e.g. Budget too low, chose competitor, unresponsive..."
                value={lostForm.lost_reason}
                onChange={(e) => setLostForm((p) => ({ ...p, lost_reason: e.target.value }))}
                rows={3}
                className="input resize-none"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setModalOpen((prev) => ({ ...prev, lost: false }))}
              className="bg-transparent border-[#1E3352] text-[#8BA3C7] hover:bg-[#132035] hover:text-[#F0F4FF] cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              onClick={handleMarkLost}
              className="bg-[#EF4444] hover:bg-[#EF4444]/90 text-white cursor-pointer"
            >
              Mark Lost
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
