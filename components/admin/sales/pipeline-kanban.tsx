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
import { Lead, Profile, LeadStatus, Project, ProjectType } from '@/types';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

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
      className={cn(
        "rounded-[10px] bg-bg-card/60 backdrop-blur-md border border-border/20 p-3 flex flex-col min-h-[400px] w-[280px] shrink-0 transition-all shadow-subtle",
        isOver && "border-primary/50 bg-bg-card-hover/20"
      )}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between mb-3 border-b border-border/10 pb-2">
        <span className="text-xs font-bold uppercase tracking-wider text-text-secondary select-none">
          {label}
        </span>
        <span className="text-[10px] font-mono bg-bg-card-hover/20 text-text-secondary px-2 py-0.5 rounded-full select-none font-bold border border-border/10">
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

      // 1.5. Create projects for the client per selected service
      const SERVICE_PROJECT_MAP: Record<string, { name: string; type: ProjectType }> = {
        seo: { name: 'SEO Onboarding', type: 'seo' },
        meta_ads: { name: 'Meta Ads Onboarding', type: 'meta_ads' },
        google_ads: { name: 'Google Ads Onboarding', type: 'google_ads' },
        smm: { name: 'Social Media Onboarding', type: 'smm' },
        website: { name: 'Web Design Onboarding', type: 'website' },
        content: { name: 'Content Onboarding', type: 'content' },
        email: { name: 'Email Onboarding', type: 'email' },
        whatsapp: { name: 'WhatsApp Onboarding', type: 'whatsapp' },
        gbp: { name: 'GBP Management Onboarding', type: 'gbp' },
        other: { name: 'Onboarding Project', type: 'other' },
      };

      const createdProjects: Pick<Project, 'id' | 'type'>[] = [];
      if (convertForm.services && convertForm.services.length > 0) {
        const valuePerProject = Math.round(Number(convertForm.monthly_retainer || 0) / convertForm.services.length);
        const projectsToInsert = convertForm.services.map((serviceKey) => {
          const mapping = SERVICE_PROJECT_MAP[serviceKey] || { name: `${serviceKey.toUpperCase()} Onboarding`, type: serviceKey };
          return {
            client_id: client.id,
            name: mapping.name,
            type: mapping.type,
            status: 'active',
            monthly_value: valuePerProject,
            start_date: new Date().toISOString().split('T')[0],
            description: `Auto-created onboarding project for ${mapping.name}.`,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
        });

        const { data: insertedProjects, error: projectsErr } = await supabase
          .from('projects')
          .insert(projectsToInsert)
          .select('id, type');

        if (projectsErr) throw projectsErr;
        if (insertedProjects) {
          createdProjects.push(...insertedProjects);
        }
      }

      // 1.6. Create default onboarding tasks
      const defaultOnboardingTasks = [
        {
          title: 'Send Welcome Kit & Client Questionnaire',
          description: 'Email client questionnaire and capture branding info.',
          department: 'marketing',
          estimated_hours: 1,
        },
        {
          title: 'Set up Client Slack Channel & Google Drive Folders',
          description: 'Configure communications hubs and structure asset folders.',
          department: 'web',
          estimated_hours: 0.5,
        },
        {
          title: 'Create Client Portal User Profile & Credentials',
          description: 'Configure auth login, role permission, and invite client.',
          department: 'web',
          estimated_hours: 1,
        },
        {
          title: 'Perform Competitor SEO & Organic Keyword Audit',
          description: 'Audit competitor rankings and keywords targeting Kanpur/region.',
          department: 'seo',
          estimated_hours: 3,
        },
      ];

      const monthYear = new Date().toLocaleString('default', { month: 'short', year: 'numeric' }); // e.g. "Jun 2026"
      const tasksToInsert = defaultOnboardingTasks.map((t) => {
        // Find matching project
        let projectId: string | null = null;
        if (createdProjects.length > 0) {
          let matchedProj = null;
          if (t.department === 'seo') {
            matchedProj = createdProjects.find((p) => p.type === 'seo');
          } else if (t.department === 'web') {
            matchedProj = createdProjects.find((p) => p.type === 'website');
          } else {
            matchedProj = createdProjects.find((p) => p.type === t.department);
          }
          projectId = matchedProj ? matchedProj.id : createdProjects[0].id;
        }

        return {
          client_id: client.id,
          project_id: projectId,
          title: t.title,
          description: t.description,
          instructions: `Apply standard processes outlined in operations SOPs. Reevaluate results as required by deliverables pipeline. Estimate hours: ${t.estimated_hours}.`,
          status: 'todo',
          priority: 'medium',
          due_date: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().split('T')[0], // 7 days from now
          month_year: monthYear,
          assigned_to: selectedLead.assigned_to || null,
          estimated_hours: t.estimated_hours,
          department: t.department,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
      });

      const { error: tasksErr } = await supabase.from('tasks').insert(tasksToInsert);
      if (tasksErr) throw tasksErr;

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
        <div className="flex gap-4 items-start select-none overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-border/20 scrollbar-track-transparent">
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
                  <div className="flex-1 flex items-center justify-center border border-dashed border-border/20 rounded-[8px] p-6 text-center text-[10px] text-text-tertiary select-none min-h-[120px]">
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
        <DialogContent className="sm:max-w-[500px] select-none">
          <DialogHeader>
            <DialogTitle>
              Log Activity — {selectedLead?.name}
            </DialogTitle>
            <DialogDescription>
              Log outreach notes, phone calls, WhatsApp messages, or meetings for this lead.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 my-2 text-xs">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-text-secondary font-semibold">Activity Type</label>
                <select
                  value={activityForm.type}
                  onChange={(e) => setActivityForm((p) => ({ ...p, type: e.target.value }))}
                  className="flex h-10 w-full rounded-lg border border-border/30 bg-bg-card/50 backdrop-blur-[8px] px-3 py-2 text-sm text-text-primary outline-none hover:border-border/60 focus:border-primary/50 focus:bg-bg-card/70 focus:shadow-[0_0_16px_rgba(37,99,235,0.15)] transition-all duration-200"
                >
                  <option value="call">Phone Call</option>
                  <option value="whatsapp">WhatsApp Message</option>
                  <option value="email">Email Outreach</option>
                  <option value="meeting">Discovery Meeting</option>
                  <option value="note">Internal Note</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-text-secondary font-semibold">Duration (minutes)</label>
                <Input
                  type="number"
                  placeholder="e.g. 15"
                  value={activityForm.duration_min}
                  onChange={(e) => setActivityForm((p) => ({ ...p, duration_min: e.target.value }))}
                  className="h-10"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-text-secondary font-semibold">Observation / Description *</label>
              <Textarea
                placeholder="Log exactly what was discussed..."
                value={activityForm.description}
                onChange={(e) => setActivityForm((p) => ({ ...p, description: e.target.value }))}
                rows={3}
                className="resize-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-text-secondary font-semibold">Outcome / Response</label>
              <Input
                type="text"
                placeholder="e.g. positive, no response, requested proposal"
                value={activityForm.outcome}
                onChange={(e) => setActivityForm((p) => ({ ...p, outcome: e.target.value }))}
                className="h-10"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setModalOpen((prev) => ({ ...prev, activity: false }))}
              className="text-text-secondary hover:text-text-primary cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              onClick={handleLogActivity}
              className="cursor-pointer"
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
        <DialogContent className="sm:max-w-[500px] select-none">
          <DialogHeader>
            <DialogTitle>
              Convert to Client — {selectedLead?.name}
            </DialogTitle>
            <DialogDescription>
              Mark this lead as won and create a paying client profile in the database.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 my-2 text-xs">
            <div className="space-y-1">
              <label className="text-text-secondary font-semibold">Monthly Retainer (₹) *</label>
              <Input
                type="number"
                placeholder="Enter monthly retainer amount"
                value={convertForm.monthly_retainer}
                onChange={(e) => setConvertForm((p) => ({ ...p, monthly_retainer: e.target.value }))}
                className="h-10"
              />
            </div>

            <div className="space-y-1">
              <label className="text-text-secondary font-semibold">Services Subscribed</label>
              <div className="grid grid-cols-2 gap-2 border border-border/20 rounded-[7px] bg-bg-card/50 p-2.5 max-h-[140px] overflow-y-auto">
                {SERVICE_OPTIONS.map((opt) => (
                  <label key={opt.id} className="flex items-center gap-2 cursor-pointer text-[11px] text-text-secondary hover:text-text-primary select-none">
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
                      className="rounded border-border/30 bg-bg-card/50 text-primary focus:ring-0 shrink-0"
                    />
                    <span>{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-text-secondary font-semibold">Integration & Retainer Notes</label>
              <Textarea
                placeholder="e.g. retainer starts next Monday, Google Search Console pre-auth pending"
                value={convertForm.notes}
                onChange={(e) => setConvertForm((p) => ({ ...p, notes: e.target.value }))}
                rows={2}
                className="resize-none"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setModalOpen((prev) => ({ ...prev, convert: false }))}
              className="text-text-secondary hover:text-text-primary cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConvertLead}
              className="bg-success hover:bg-success/90 text-white cursor-pointer"
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
        <DialogContent className="sm:max-w-[400px] select-none">
          <DialogHeader>
            <DialogTitle>
              Mark Lead as Lost
            </DialogTitle>
            <DialogDescription>
              Mark {selectedLead?.name} as lost. Please enter the reason for future analytics.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 my-2 text-xs">
            <div className="space-y-1">
              <label className="text-text-secondary font-semibold">Reason Lost *</label>
              <Textarea
                placeholder="e.g. Budget too low, chose competitor, unresponsive..."
                value={lostForm.lost_reason}
                onChange={(e) => setLostForm((p) => ({ ...p, lost_reason: e.target.value }))}
                rows={3}
                className="resize-none"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setModalOpen((prev) => ({ ...prev, lost: false }))}
              className="text-text-secondary hover:text-text-primary cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              onClick={handleMarkLost}
              className="bg-error hover:bg-error/90 text-white cursor-pointer"
            >
              Mark Lost
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
