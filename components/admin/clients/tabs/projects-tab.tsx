'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Client, Project, ProjectType, ProjectStatus } from '@/types';
import { toast } from 'sonner';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Plus, Briefcase, RefreshCw, Trash2, Edit2, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/shared/data-table';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ProjectsTabProps {
  client: Client;
}

const PROJECT_TYPES: { id: ProjectType; label: string }[] = [
  { id: 'seo', label: 'SEO' },
  { id: 'meta_ads', label: 'Meta Ads' },
  { id: 'google_ads', label: 'Google Ads' },
  { id: 'smm', label: 'Social Media' },
  { id: 'website', label: 'Web Design' },
  { id: 'content', label: 'Content' },
  { id: 'email', label: 'Email' },
  { id: 'whatsapp', label: 'WhatsApp' },
  { id: 'gbp', label: 'GBP Management' },
  { id: 'other', label: 'Other' },
];

export function ProjectsTab({ client }: ProjectsTabProps) {
  const supabase = createClient();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Dialog States
  const [modalOpen, setModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Form State
  const [form, setForm] = useState({
    name: '',
    type: 'seo' as ProjectType,
    status: 'active' as ProjectStatus,
    monthly_value: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    description: '',
  });

  const fetchProjects = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('client_id', client.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProjects(data || []);
    } catch {
      toast.error('Failed to load client projects.');
    } finally {
      setIsLoading(false);
    }
  }, [client.id, supabase]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProjects();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchProjects]);

  const handleOpenAddModal = () => {
    setIsEditMode(false);
    setForm({
      name: '',
      type: 'seo',
      status: 'active',
      monthly_value: client.is_agency_self ? '0' : '',
      start_date: new Date().toISOString().split('T')[0],
      end_date: '',
      description: '',
    });
    setModalOpen(true);
  };

  const handleOpenEditModal = (project: Project) => {
    setSelectedProject(project);
    setIsEditMode(true);
    setForm({
      name: project.name,
      type: project.type || 'other',
      status: project.status,
      monthly_value: String(project.monthly_value || 0),
      start_date: project.start_date || new Date().toISOString().split('T')[0],
      end_date: project.end_date || '',
      description: project.description || '',
    });
    setModalOpen(true);
  };

  // Submit Handler: Add/Edit Project
  const handleSubmitProject = async () => {
    if (!form.name.trim()) {
      toast.error('Project name is required.');
      return;
    }

    try {
      const projectPayload = {
        client_id: client.id,
        name: form.name,
        type: form.type,
        status: form.status,
        monthly_value: Number(form.monthly_value || 0),
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        description: form.description || null,
      };

      if (isEditMode && selectedProject) {
        const { error } = await supabase
          .from('projects')
          .update({ ...projectPayload, updated_at: new Date().toISOString() })
          .eq('id', selectedProject.id);

        if (error) throw error;
        toast.success('Project updated successfully.');
      } else {
        const { error } = await supabase.from('projects').insert(projectPayload);
        if (error) throw error;
        toast.success('Project created successfully.');
      }

      setModalOpen(false);
      fetchProjects();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Operation failed.';
      toast.error(errorMessage);
    }
  };

  // Inline Status Change handler
  const handleStatusChange = async (projectId: string, newStatus: ProjectStatus) => {
    try {
      const { error } = await supabase
        .from('projects')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', projectId);

      if (error) throw error;
      toast.success('Project status updated.');
      setProjects((prev) =>
        prev.map((p) => (p.id === projectId ? { ...p, status: newStatus } : p))
      );
    } catch {
      toast.error('Failed to update project status.');
    }
  };

  // Submit Handler: Delete Project
  const handleDeleteProject = async () => {
    if (!selectedProject) return;

    try {
      const { error } = await supabase.from('projects').delete().eq('id', selectedProject.id);
      if (error) throw error;

      toast.success('Project deleted successfully.');
      setDeleteDialogOpen(false);
      setSelectedProject(null);
      fetchProjects();
    } catch {
      toast.error('Failed to delete project.');
    }
  };

  // Columns for Projects Table
  const columns = [
    {
      key: 'name',
      header: 'Project Name',
      width: '30%',
      render: (val: unknown, row: Record<string, unknown>) => (
        <div className="flex flex-col gap-0.5">
          <span className="font-semibold text-xs text-text-primary">{String(val)}</span>
          {Boolean(row.description) && (
            <span className="text-[10px] text-text-tertiary line-clamp-1 truncate max-w-[200px]" title={String(row.description)}>
              {String(row.description)}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      width: '18%',
      render: (val: unknown) => {
        const t = String(val || '');
        const opt = PROJECT_TYPES.find((o) => o.id === t);
        return (
          <span className="text-[9px] font-bold bg-primary/10 text-primary-light border border-primary/20 px-2 py-0.5 rounded uppercase tracking-wider select-none">
            {opt ? opt.label : t.toUpperCase()}
          </span>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      width: '15%',
      render: (val: unknown, row: Record<string, unknown>) => {
        const status = String(val) as ProjectStatus;
        const projectId = String(row.id);
        return (
          <select
            value={status}
            onChange={(e) => handleStatusChange(projectId, e.target.value as ProjectStatus)}
            className="bg-bg-card border border-border/30 text-[11px] rounded px-2 py-1 focus:outline-none focus:border-primary font-semibold text-text-secondary cursor-pointer"
          >
            <option value="planning">Planning</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="completed">Completed</option>
          </select>
        );
      },
    },
    {
      key: 'monthly_value',
      header: 'Monthly Retainer',
      width: '15%',
      render: (val: unknown) => {
        const valNum = Number(val || 0);
        if (client.is_agency_self) return <span className="text-text-tertiary text-xs italic">-</span>;
        return (
          <span className="font-semibold font-mono text-xs text-accent">
            {formatCurrency(valNum)}
          </span>
        );
      },
    },
    {
      key: 'start_date',
      header: 'Start Date',
      width: '12%',
      render: (val: unknown) => (
        <span className="text-xs text-text-tertiary font-mono">
          {val ? formatDate(String(val)) : '-'}
        </span>
      ),
    },
  ];

  // Actions dropdown generator per row
  const rowActions = (row: Record<string, unknown>) => {
    const project = row as unknown as Project;

    return (
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <button className="text-text-tertiary hover:text-text-primary p-0.5 rounded hover:bg-bg-card-hover/20 transition-all cursor-pointer">
              <MoreHorizontal size={14} />
            </button>
          }
        />
        <DropdownMenuContent
          align="end"
          className="bg-bg-card border-border/30 text-text-primary shadow-xl p-1 w-36 z-30"
        >
          <DropdownMenuItem
            onClick={() => handleOpenEditModal(project)}
            className="text-xs hover:bg-bg-card-hover/20 cursor-pointer text-text-secondary hover:text-text-primary gap-2 py-1.5"
          >
            <Edit2 size={12} />
            <span>Edit Project</span>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => {
              setSelectedProject(project);
              setDeleteDialogOpen(true);
            }}
            className="text-xs hover:bg-bg-card-hover/20 cursor-pointer text-error hover:text-error gap-2 py-1.5"
          >
            <Trash2 size={12} />
            <span>Delete Project</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header controls strip */}
      <div className="flex items-center justify-between select-none">
        <h3 className="text-xs font-bold uppercase tracking-wider text-text-tertiary">
          Active Projects ({projects.length})
        </h3>

        <div className="flex items-center gap-2">
          <Button
            onClick={handleOpenAddModal}
            size="sm"
            className="bg-primary hover:bg-primary-light text-white text-xs h-8 gap-1.5 cursor-pointer font-semibold"
          >
            <Plus size={13} />
            <span>Add Project</span>
          </Button>

          <Button
            onClick={fetchProjects}
            disabled={isLoading}
            size="sm"
            className="bg-bg-card-hover/20 hover:bg-bg-card-hover/40 border border-border/30 text-text-secondary hover:text-text-primary text-xs h-8 gap-1.5 cursor-pointer"
          >
            <RefreshCw size={13} className={`stroke-[1.5] ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Projects DataTable */}
      <DataTable
        columns={columns}
        data={projects as unknown as Record<string, unknown>[]}
        rowActions={rowActions}
        loading={isLoading}
        emptyState={{
          icon: Briefcase,
          title: 'No Active Projects',
          description: 'Create a campaign design, SEO tracking project, or website build to associate tasks.',
          actionLabel: 'Add Project',
          onAction: handleOpenAddModal,
        }}
      />

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-[600px] select-none">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-text-primary">
              {isEditMode ? 'Edit Project Details' : 'Create New Campaign Project'}
            </DialogTitle>
            <DialogDescription className="text-xs text-text-secondary">
              Specify retainer details, target channel services, and timeframe constraints.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4 my-2 text-xs">
            <div className="col-span-2 space-y-1">
              <label className="label">Project Title Name *</label>
              <input
                type="text"
                placeholder="e.g. Q3 SEO Audit Campaign"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                className="input h-9"
              />
            </div>

            <div className="space-y-1">
              <label className="label">Campaign Type</label>
              <select
                value={form.type}
                onChange={(e) => setForm((p) => ({ ...p, type: e.target.value as ProjectType }))}
                className="input h-9"
              >
                {PROJECT_TYPES.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="label">Project Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm((p) => ({ ...p, status: e.target.value as ProjectStatus }))}
                className="input h-9"
              >
                <option value="planning">Planning</option>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="label">Monthly value (₹)</label>
              <input
                type="number"
                placeholder="e.g. 15000"
                disabled={client.is_agency_self}
                value={form.monthly_value}
                onChange={(e) => setForm((p) => ({ ...p, monthly_value: e.target.value }))}
                className="input h-9"
              />
            </div>

            <div className="space-y-1">
              <label className="label">Start Date</label>
              <input
                type="date"
                value={form.start_date}
                onChange={(e) => setForm((p) => ({ ...p, start_date: e.target.value }))}
                className="input h-9"
              />
            </div>

            <div className="space-y-1 col-span-2">
              <label className="label">End Date (Optional)</label>
              <input
                type="date"
                value={form.end_date}
                onChange={(e) => setForm((p) => ({ ...p, end_date: e.target.value }))}
                className="input h-9"
              />
            </div>

            <div className="col-span-2 space-y-1">
              <label className="label">Brief Campaign Details</label>
              <textarea
                placeholder="Campaign scope, targeted keyword ideas, special requirements..."
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                rows={2}
                className="input resize-none"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setModalOpen(false)}
              className="bg-transparent border-border/30 text-text-secondary hover:bg-bg-card-hover/20 hover:text-text-primary cursor-pointer"
            >
              Cancel
            </Button>
            <Button onClick={handleSubmitProject} className="bg-primary hover:bg-primary-light text-white cursor-pointer">
              {isEditMode ? 'Save Changes' : 'Create Project'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ━━━ CONFIRM DIALOG: DELETE PROJECT ━━━ */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onClose={() => { setDeleteDialogOpen(false); setSelectedProject(null); }}
        onConfirm={handleDeleteProject}
        title="Delete Campaign Project"
        description={`Are you sure you want to permanently delete the project "${selectedProject?.name}"? All associated task deliverables will be removed from this profile tab. This action cannot be undone.`}
        confirmLabel="Delete Project"
        variant="danger"
      />
    </div>
  );
}

export default ProjectsTab;
