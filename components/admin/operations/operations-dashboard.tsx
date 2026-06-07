'use client';

/* eslint-disable */

import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import {
  FileText,
  Calendar as CalendarIcon,
  CheckSquare,
  Search,
  Upload,
  Plus,
  Trash2,
  Download,
  BookOpen,
  ArrowRight,
  User,
  Users,
  Settings,
  Grid,
  FileDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { FileUpload } from '@/components/shared/file-upload';
import { DataTable } from '@/components/shared/data-table';
import { Client, Profile } from '@/types';

interface OperationsDashboardProps {
  clients: Client[] | null;
  employees: Profile[] | null;
  initialSops: any[] | null;
  initialMilestones?: any[] | null;
  initialTemplates?: any[] | null;
}

export function OperationsDashboard({
  clients,
  employees,
  initialSops,
  initialMilestones,
  initialTemplates,
}: OperationsDashboardProps) {
  const supabase = createClient();
  const [activeTab, setActiveTab] = useState<'sops' | 'timeline' | 'templates'>('sops');
  const [sops, setSops] = useState<any[]>(initialSops || []);
  const [searchTerm, setSearchTerm] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // SOP State
  const [uploadSopOpen, setUploadSopOpen] = useState(false);

  // Timeline / Calendar State (loaded from DB if available, else fallback)
  const [customEvents, setCustomEvents] = useState<any[]>(
    initialMilestones && initialMilestones.length > 0
      ? initialMilestones
      : [
          { id: 1, day: 1, title: 'Invoice Auto-Generation', description: 'n8n fires invoice runs for all active retainers', type: 'system' },
          { id: 2, day: 5, title: 'Intern Stipend Disbursements', description: 'Confirm student stipends HR review payroll tasks', type: 'hr' },
          { id: 3, day: 15, title: 'Mid-Month Alignment Calls', description: 'Strategic progress calls with all key stakeholders', type: 'client' },
          { id: 4, day: 25, title: 'Monthly Delivery Reporting', description: 'Compile GA4, GSC and Meta Ads deliverables', type: 'delivery' },
        ]
  );
  const [addEventOpen, setAddEventOpen] = useState(false);
  const [newEvent, setNewEvent] = useState({ day: '', title: '', description: '', type: 'delivery' });

  // Process Templates State
  const [templates, setTemplates] = useState<any[]>(initialTemplates || []);
  const [selectedClient, setSelectedClient] = useState('');
  const [selectedPreset, setSelectedPreset] = useState(
    initialTemplates && initialTemplates.length > 0 ? initialTemplates[0].id : 'onboarding'
  );
  const [selectedAssignee, setSelectedAssignee] = useState('');
  const [isApplyingTemplate, setIsApplyingTemplate] = useState(false);

  // Presets definition (for fallback)
  const presets = {
    onboarding: {
      name: 'New Client SEO & Social Onboarding',
      description: 'Comprehensive setup checklist to bootstrap a new client account.',
      tasks: [
        { title: 'Send Welcome Kit & Client Questionnaire', description: 'Email client questionnaire and capture branding info.', dept: 'marketing', hours: 1 },
        { title: 'Set up Client Slack Channel & Google Drive Folders', description: 'Configure communications hubs and structure asset folders.', dept: 'web', hours: 0.5 },
        { title: 'Create Client Portal User Profile & Credentials', description: 'Configure auth login, role permission, and invite client.', dept: 'web', hours: 1 },
        { title: 'Perform Competitor SEO & Organic Keyword Audit', description: 'Audit competitor rankings and keywords targeting Kanpur/region.', dept: 'seo', hours: 3 },
      ]
    },
    seo_audit: {
      name: 'Monthly Deep SEO Audit & Execution',
      description: 'Technical and on-page auditing with immediate fixes.',
      tasks: [
        { title: 'Run Full Technical Crawl & Fix 404/Redirects', description: 'Use crawl software to identify errors and patch immediately.', dept: 'seo', hours: 2 },
        { title: 'Analyze Google Search Console CTR Opportunities', description: 'Find queries with high impressions but low CTR to optimize titles.', dept: 'seo', hours: 1.5 },
        { title: 'Competitor Backlink Acquisition Audit', description: 'Map competitor linking profiles and fetch target domains.', dept: 'seo', hours: 2 },
        { title: 'On-Page Optimization for Top 5 Target Landing Pages', description: 'Improve heading hierarchies, schema markup and copy keywords.', dept: 'seo', hours: 3 },
      ]
    },
    social_setup: {
      name: 'Social Media Campaign Brief & Production',
      description: 'Asset generation, caption drafting, and calendar scheduling.',
      tasks: [
        { title: 'Draft 15 Content Angles, Creative Ideas & Hooks', description: 'Build cohesive content ideas aligned to monthly campaign goals.', dept: 'social', hours: 2 },
        { title: 'Design Social Post Visual Assets in Figma/Canva', description: 'Deliver modern templates, carousels, and high-quality reels.', dept: 'social', hours: 4 },
        { title: 'Compose Post Captions & Target Hashtag Buckets', description: 'Write engaging copy and curate platform hashtag bundles.', dept: 'social', hours: 1.5 },
        { title: 'Upload & Schedule Creative Posts in CRM Calendar', description: 'Queue approved creative drafts in social dashboard calendar.', dept: 'social', hours: 1 },
      ]
    }
  };

  // SOP Document Functions
  const fetchSops = async () => {
    try {
      const { data, error } = await supabase
        .from('files')
        .select('*')
        .eq('bucket', 'agency')
        .like('storage_path', 'sops/%')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSops(data || []);
    } catch (err) {
      toast.error('Failed to load SOP files.');
    }
  };

  const handleUploadComplete = async (fileData: any) => {
    setIsUploading(true);
    try {
      // Ingest metadata into the files table
      const { error } = await supabase
        .from('files')
        .insert({
          name: fileData.name,
          original_name: fileData.name,
          mime_type: 'application/pdf',
          size_bytes: fileData.size,
          bucket: 'agency',
          storage_path: `sops/${fileData.name}`,
          public_url: fileData.url,
          department: 'operations',
          tags: ['sop', 'pdf'],
          uploaded_by: (await supabase.auth.getUser()).data.user?.id || null,
        });

      if (error) throw error;
      toast.success(`SOP '${fileData.name}' uploaded and registered.`);
      setUploadSopOpen(false);
      fetchSops();
    } catch (err) {
      toast.error('Failed to register SOP metadata.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteSop = async (sopId: string, storagePath: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this SOP?')) return;

    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('agency')
        .remove([storagePath]);

      if (storageError) throw storageError;

      // Delete from files table
      const { error: dbError } = await supabase
        .from('files')
        .delete()
        .eq('id', sopId);

      if (dbError) throw dbError;

      toast.success('SOP deleted successfully.');
      fetchSops();
    } catch (err) {
      toast.error('Failed to delete SOP.');
    }
  };

  const handleOpenSop = async (sop: any) => {
    try {
      const { data, error } = await supabase.storage
        .from('agency')
        .createSignedUrl(sop.storage_path, 3600); // 1 hour link
      if (error) throw error;
      window.open(data.signedUrl, '_blank');
    } catch {
      toast.error('Failed to load secure PDF link.');
    }
  };

  const getActiveTemplate = () => {
    const dbTemplate = templates.find((t) => t.id === selectedPreset);
    if (dbTemplate) {
      return {
        name: dbTemplate.name,
        description: dbTemplate.description,
        tasks: dbTemplate.tasks || [],
      };
    }

    const fallback = presets[selectedPreset as keyof typeof presets];
    if (fallback) return fallback;

    if (templates && templates.length > 0) {
      return {
        name: templates[0].name,
        description: templates[0].description,
        tasks: templates[0].tasks || [],
      };
    }

    return presets.onboarding;
  };

  // Calendar Event Functions
  const handleAddEvent = async () => {
    const dayNum = parseInt(newEvent.day);
    if (!newEvent.title.trim() || isNaN(dayNum) || dayNum < 1 || dayNum > 31) {
      toast.error('Provide a valid event title and day (1-31).');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('operations_milestones')
        .insert({
          day: dayNum,
          title: newEvent.title.trim(),
          description: newEvent.description.trim() || null,
          type: newEvent.type
        })
        .select()
        .single();

      if (error) throw error;

      setCustomEvents((prev) => [
        ...prev,
        data
      ].sort((a, b) => a.day - b.day));

      setNewEvent({ day: '', title: '', description: '', type: 'delivery' });
      setAddEventOpen(false);
      toast.success('Milestone event saved to database.');
    } catch (err) {
      console.error('Failed to save to DB, adding locally:', err);
      setCustomEvents((prev) => [
        ...prev,
        {
          id: Date.now(),
          day: dayNum,
          title: newEvent.title.trim(),
          description: newEvent.description.trim(),
          type: newEvent.type
        }
      ].sort((a, b) => a.day - b.day));

      setNewEvent({ day: '', title: '', description: '', type: 'delivery' });
      setAddEventOpen(false);
      toast.success('Milestone event added locally.');
    }
  };

  const handleDeleteEvent = async (id: any) => {
    if (!confirm('Are you sure you want to delete this operational milestone?')) return;

    if (typeof id === 'number') {
      setCustomEvents((prev) => prev.filter((e) => e.id !== id));
      toast.success('Milestone removed.');
      return;
    }

    try {
      const { error } = await supabase
        .from('operations_milestones')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setCustomEvents((prev) => prev.filter((e) => e.id !== id));
      toast.success('Milestone deleted from database.');
    } catch (err) {
      toast.error('Failed to delete milestone.');
    }
  };

  // Preset Template application
  const handleApplyTemplate = async () => {
    if (!selectedClient) {
      toast.error('Select a target client.');
      return;
    }
    if (!selectedAssignee) {
      toast.error('Select an assigned student/intern.');
      return;
    }

    setIsApplyingTemplate(true);
    const toastId = toast.loading('Applying template and adding deliverables...');

    try {
      const activeTemplate = getActiveTemplate();
      const monthYear = new Date().toLocaleString('default', { month: 'short', year: 'numeric' }); // e.g. "Jun 2026"

      // Check if client has projects, if not, we can default project_id to null.
      const { data: clientProjects } = await supabase
        .from('projects')
        .select('id')
        .eq('client_id', selectedClient)
        .limit(1);

      const projectId = clientProjects && clientProjects.length > 0 ? clientProjects[0].id : null;

      const tasksToInsert = activeTemplate.tasks.map((task: any) => ({
        client_id: selectedClient,
        project_id: projectId,
        title: task.title,
        description: task.description,
        instructions: `Apply standard processes outlined in operations SOPs. Reevaluate results as required by deliverables pipeline. Estimate hours: ${task.hours || task.estimated_hours}.`,
        status: 'todo',
        priority: 'medium',
        due_date: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().split('T')[0], // 7 days from now
        month_year: monthYear,
        assigned_to: selectedAssignee,
        estimated_hours: task.hours || task.estimated_hours,
        department: task.dept || task.department,
      }));

      const { error } = await supabase
        .from('tasks')
        .insert(tasksToInsert);

      if (error) throw error;

      toast.success(`Applied template! Added ${tasksToInsert.length} deliverables for client.`, { id: toastId });
      setSelectedClient('');
      setSelectedAssignee('');
    } catch (err: any) {
      toast.error(`Failed to apply template: ${err.message}`, { id: toastId });
    } finally {
      setIsApplyingTemplate(false);
    }
  };

  // Filtered SOPs list
  const filteredSops = sops.filter((sop) =>
    sop.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sopColumns = [
    {
      key: 'name',
      header: 'Document Name',
      render: (val: any, row: any) => (
        <div className="flex items-center gap-2.5 select-none font-semibold text-text-primary text-xs sm:text-sm">
          <BookOpen size={15} className="text-primary shrink-0" />
          <span>{row.name}</span>
        </div>
      )
    },
    {
      key: 'size_bytes',
      header: 'File Size',
      render: (val: any) => {
        const size = Number(val || 0);
        if (size >= 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
        return `${(size / 1024).toFixed(0)} KB`;
      }
    },
    {
      key: 'created_at',
      header: 'Uploaded Date',
      render: (val: any) => new Date(val).toLocaleDateString()
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (val: any, row: any) => (
        <div className="flex items-center gap-2 select-none">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => handleOpenSop(row)}
            className="text-[11px] h-7 px-2 cursor-pointer"
          >
            <Download size={11} className="mr-1" />
            <span>Open PDF</span>
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => handleDeleteSop(row.id, row.storage_path, e)}
            className="text-[11px] h-7 px-2 cursor-pointer"
          >
            <Trash2 size={11} />
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6 select-none">
      {/* ━━━ TAB NAVIGATION ━━━ */}
      <div className="flex items-center gap-2 overflow-x-auto border-b border-border/20 pb-2 select-none">
        {(['sops', 'timeline', 'templates'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider border-b-2 cursor-pointer transition-all ${
              activeTab === tab
                ? 'border-primary text-text-primary'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            {tab === 'sops' ? 'SOP Library' : tab === 'timeline' ? 'Monthly Calendar Timeline' : 'Process Templates'}
          </button>
        ))}
      </div>

      {/* ━━━ TAB 1: SOP LIBRARY ━━━ */}
      {activeTab === 'sops' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
              <Input
                type="text"
                placeholder="Search SOP PDF documents..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>

            <Button
              onClick={() => setUploadSopOpen(true)}
              size="sm"
              variant="default"
              className="text-xs h-9 gap-1.5 font-semibold self-end sm:self-auto cursor-pointer"
            >
              <Upload size={13} />
              <span>Upload SOP Document</span>
            </Button>
          </div>

          <div className="w-full">
            <DataTable
              columns={sopColumns}
              data={filteredSops as any}
              onRowClick={handleOpenSop}
              emptyState={{
                icon: FileText,
                title: 'No SOP Documents Found',
                description: 'Manage standard operating procedures by uploading guides, checklists, or handbook PDFs.',
                actionLabel: 'Upload First SOP',
                onAction: () => setUploadSopOpen(true)
              }}
            />
          </div>
        </div>
      )}

      {/* ━━━ TAB 2: MONTHLY TIMELINE ━━━ */}
      {activeTab === 'timeline' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-border/20 pb-2">
            <div>
              <h2 className="text-base font-semibold text-text-primary flex items-center gap-1.5">
                <CalendarIcon size={16} className="text-primary" />
                <span>Standard Monthly Operations Checklist</span>
              </h2>
              <p className="text-xs text-text-secondary">Recurring calendar milestones executed automatically or manually each month.</p>
            </div>
            <Button
              onClick={() => setAddEventOpen(true)}
              size="sm"
              variant="secondary"
              className="text-xs h-8 gap-1.5 cursor-pointer font-semibold"
            >
              <Plus size={13} />
              <span>Add Custom Milestone</span>
            </Button>
          </div>

          {/* Timeline visualization */}
          <div className="relative border-l border-border/30 ml-4 pl-8 space-y-6 py-2">
            {customEvents.map((evt) => {
              let typeColor = 'bg-bg-card-hover border-border/30 text-text-secondary';
              if (evt.type === 'system') typeColor = 'bg-accent/10 border-accent/25 text-accent';
              else if (evt.type === 'hr') typeColor = 'bg-error/10 border-error/25 text-error';
              else if (evt.type === 'client') typeColor = 'bg-primary/10 border-primary/25 text-primary';
              else if (evt.type === 'delivery') typeColor = 'bg-success/10 border-success/25 text-success';

              return (
                <div key={evt.id} className="relative group flex items-start">
                  {/* Circular day indicator on timeline */}
                  <span className="absolute -left-[48px] top-2.5 flex items-center justify-center w-8 h-8 rounded-full border border-border/30 bg-bg-card/90 font-bold text-xs text-text-primary shadow-sm select-none z-10">
                    {evt.day}
                  </span>

                  <Card variant="compact" className="p-4 space-y-1 hover:border-border/60 transition-all flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-xs sm:text-sm text-text-primary">{evt.title}</h3>
                      <div className="flex items-center gap-2 select-none">
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold border uppercase tracking-wider ${typeColor}`}>
                          {evt.type}
                        </span>
                        <button
                          onClick={() => handleDeleteEvent(evt.id)}
                          className="text-error hover:text-error/80 opacity-0 group-hover:opacity-100 transition-opacity p-1 cursor-pointer"
                          title="Delete Milestone"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-text-secondary mt-1 leading-relaxed">{evt.description}</p>
                  </Card>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ━━━ TAB 3: PROCESS TEMPLATES ━━━ */}
      {activeTab === 'templates' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Form Side */}
          <Card variant="default" className="md:col-span-1 p-4 h-fit space-y-4">
            <h3 className="font-semibold text-sm text-text-primary flex items-center gap-1.5">
              <Settings size={15} className="text-primary" />
              <span>Apply Operational Template</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-text-secondary tracking-wider uppercase">Target Client Retainer *</label>
                <select
                  value={selectedClient}
                  onChange={(e) => setSelectedClient(e.target.value)}
                  className="h-9 w-full bg-bg-card/50 border border-border/30 text-text-primary rounded px-3 hover:border-border/60 focus:border-primary/50 focus:shadow-[0_0_16px_rgba(37,99,235,0.15)] transition-all outline-none text-xs"
                >
                  <option value="" className="bg-bg-card text-text-primary">Select a Client...</option>
                  {clients?.map((c) => (
                    <option key={c.id} value={c.id} className="bg-bg-card text-text-primary">
                      {c.company ? `${c.company} (${c.name})` : c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-text-secondary tracking-wider uppercase">Choose Preset Checklist *</label>
                <select
                  value={selectedPreset}
                  onChange={(e) => setSelectedPreset(e.target.value)}
                  className="h-9 w-full bg-bg-card/50 border border-border/30 text-text-primary rounded px-3 hover:border-border/60 focus:border-primary/50 focus:shadow-[0_0_16px_rgba(37,99,235,0.15)] transition-all outline-none text-xs"
                >
                  {templates && templates.length > 0 ? (
                    templates.map((t) => (
                      <option key={t.id} value={t.id} className="bg-bg-card text-text-primary">
                        {t.name}
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="onboarding" className="bg-bg-card text-text-primary">Client Onboarding Checklist</option>
                      <option value="seo_audit" className="bg-bg-card text-text-primary">Monthly SEO Execution Audit</option>
                      <option value="social_setup" className="bg-bg-card text-text-primary">Social Media Production setup</option>
                    </>
                  )}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-text-secondary tracking-wider uppercase">Assign Checklist Deliverables *</label>
                <select
                  value={selectedAssignee}
                  onChange={(e) => setSelectedAssignee(e.target.value)}
                  className="h-9 w-full bg-bg-card/50 border border-border/30 text-text-primary rounded px-3 hover:border-border/60 focus:border-primary/50 focus:shadow-[0_0_16px_rgba(37,99,235,0.15)] transition-all outline-none text-xs"
                >
                  <option value="" className="bg-bg-card text-text-primary">Choose Assigned Intern...</option>
                  {employees?.map((emp) => (
                    <option key={emp.id} value={emp.id} className="bg-bg-card text-text-primary">
                      {emp.full_name} ({(emp as any).designation || 'Intern'})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <Button
              onClick={handleApplyTemplate}
              disabled={isApplyingTemplate}
              variant="default"
              className="w-full text-xs h-9 font-semibold gap-1.5 cursor-pointer select-none"
            >
              <span>{isApplyingTemplate ? 'Creating tasks...' : 'Apply & Generate Tasks'}</span>
              <ArrowRight size={12} />
            </Button>
          </Card>

          {/* Preview Side */}
          <div className="md:col-span-2 space-y-4">
            <div className="border border-border/30 bg-bg-card/70 backdrop-blur-[12px] rounded-xl p-5 space-y-4 shadow-elevated">
              <div>
                <span className="text-[10px] text-accent uppercase font-bold tracking-wider">Template Preview</span>
                <h2 className="text-base font-semibold text-text-primary mt-0.5">
                  {getActiveTemplate().name}
                </h2>
                <p className="text-xs text-text-secondary mt-1 leading-relaxed">
                  {getActiveTemplate().description}
                </p>
              </div>

              <div className="border-t border-border/20 pt-3 space-y-3">
                {getActiveTemplate().tasks.map((task: any, index: number) => (
                  <div key={index} className="flex items-start gap-3 bg-bg-card-hover/20 border border-border/20 rounded-lg p-3">
                    <span className="flex items-center justify-center w-5 h-5 rounded bg-primary/10 text-primary text-[10px] font-bold shrink-0 border border-primary/20">
                      {index + 1}
                    </span>
                    <div className="space-y-0.5 flex-1 text-xs">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-text-primary">{task.title}</h4>
                        <span className="text-[10px] font-mono text-accent font-semibold bg-accent/10 px-1.5 rounded uppercase border border-accent/20">
                          {(task.dept || task.department || '').toUpperCase()} ({task.hours || task.estimated_hours}h)
                        </span>
                      </div>
                      <p className="text-xs text-text-secondary leading-relaxed mt-1">{task.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <Dialog open={uploadSopOpen} onOpenChange={setUploadSopOpen}>
        <DialogContent className="sm:max-w-[550px] select-none">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">Upload SOP Document</DialogTitle>
            <DialogDescription className="text-xs">
              Select a PDF document containing templates, handbooks, guidelines or checklists for student reference.
            </DialogDescription>
          </DialogHeader>

          <div className="my-4">
            <FileUpload
              bucket="agency"
              storagePath="sops"
              accept="application/pdf"
              onUpload={handleUploadComplete}
            />
          </div>

          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setUploadSopOpen(false)}
              className="cursor-pointer"
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ━━━ MODAL: ADD CUSTOM TIMELINE MILESTONE ━━━ */}
      <Dialog open={addEventOpen} onOpenChange={setAddEventOpen}>
        <DialogContent className="sm:max-w-[400px] select-none">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">Add Timeline Milestone</DialogTitle>
            <DialogDescription className="text-xs">
              Insert a standard recurring checklist item to the operational timeline.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 my-2 text-xs">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-text-secondary tracking-wider uppercase">Day of Month (1-31) *</label>
              <Input
                type="number"
                min="1"
                max="31"
                placeholder="e.g. 10"
                value={newEvent.day}
                onChange={(e) => setNewEvent((p) => ({ ...p, day: e.target.value }))}
                className="h-9"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-text-secondary tracking-wider uppercase">Milestone Title *</label>
              <Input
                type="text"
                placeholder="e.g. Backlink Verification Runs"
                value={newEvent.title}
                onChange={(e) => setNewEvent((p) => ({ ...p, title: e.target.value }))}
                className="h-9"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-text-secondary tracking-wider uppercase">Milestone Category *</label>
              <select
                value={newEvent.type}
                onChange={(e) => setNewEvent((p) => ({ ...p, type: e.target.value }))}
                className="h-9 w-full bg-bg-card/50 border border-border/30 text-text-primary rounded px-3 hover:border-border/60 focus:border-primary/50 focus:shadow-[0_0_16px_rgba(37,99,235,0.15)] transition-all outline-none text-xs"
              >
                <option value="delivery" className="bg-bg-card text-text-primary">Delivery Execution</option>
                <option value="client" className="bg-bg-card text-text-primary">Client Strategic Call</option>
                <option value="system" className="bg-bg-card text-text-primary">System / n8n Triggered</option>
                <option value="hr" className="bg-bg-card text-text-primary">HR Stipend / Payroll</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-text-secondary tracking-wider uppercase">Brief Description</label>
              <textarea
                placeholder="Explain the recurring checklist milestone detail..."
                value={newEvent.description}
                onChange={(e) => setNewEvent((p) => ({ ...p, description: e.target.value }))}
                rows={2}
                className="w-full bg-bg-card/50 border border-border/30 text-text-primary rounded p-2 resize-none hover:border-border/60 focus:border-primary/50 focus:shadow-[0_0_16px_rgba(37,99,235,0.15)] transition-all outline-none text-xs"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setAddEventOpen(false)}
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddEvent}
              variant="default"
              className="cursor-pointer"
            >
              Add Milestone
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
export default OperationsDashboard;
