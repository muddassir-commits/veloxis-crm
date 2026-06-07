/* eslint-disable */
'use client';

import React, { useState } from 'react';
import { PageContainer } from '@/components/shared/page-container';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import {
  Search,
  Plus,
  RefreshCw,
  Layout,
  PlayCircle,
  CheckCircle,
  FileCode2,
  Calendar,
  User,
  ChevronDown,
  ChevronUp,
  FileText,
  DollarSign,
  AlertCircle,
  CheckSquare,
  Square,
  Sparkles,
  Link
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Client, WebProject } from '@/types';
import { toast } from 'sonner';
import { NewWebProjectModal } from './new-web-project-modal';
import { EditWebProjectModal } from './edit-web-project-modal';
import { Progress } from '@/components/ui/progress';

interface WebDesignDashboardProps {
  initialClients: Client[];
  initialProjects: WebProject[];
}

const STAGES = [
  { id: 'scope', label: 'Scope' },
  { id: 'design', label: 'Design' },
  { id: 'development', label: 'Dev' },
  { id: 'review', label: 'Review' },
  { id: 'live', label: 'Live' }
];

const MILESTONES_META = [
  { key: 'discovery_complete', label: 'Discovery Complete' },
  { key: 'wireframes_approved', label: 'Wireframes Approved' },
  { key: 'design_mockup_done', label: 'Design Mockup Done' },
  { key: 'development_done', label: 'Development Done' },
  { key: 'client_review', label: 'Client Review' },
  { key: 'go_live', label: 'Go Live' }
] as const;

export function WebDesignDashboard({
  initialClients,
  initialProjects,
}: WebDesignDashboardProps) {
  const supabase = createClient();
  const [clients] = useState<Client[]>(initialClients);
  const [projects, setProjects] = useState<WebProject[]>(initialProjects);
  const [loading, setLoading] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClient, setSelectedClient] = useState('all');
  const [selectedStage, setSelectedStage] = useState('all');

  // Modals
  const [newModalOpen, setNewModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<WebProject | null>(null);
  const [expandedProjects, setExpandedProjects] = useState<Record<string, boolean>>({});

  const refreshData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('web_projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProjects(data || []);
    } catch (err: any) {
      toast.error('Failed to reload web projects');
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedProjects((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleMilestone = async (project: WebProject, milestoneKey: typeof MILESTONES_META[number]['key']) => {
    const currentMilestones = { ...project.milestones };
    const nextVal = !currentMilestones[milestoneKey];
    const updatedMilestones = { ...currentMilestones, [milestoneKey]: nextVal };

    // Optimistic update
    setProjects((prev) =>
      prev.map((p) => (p.id === project.id ? { ...p, milestones: updatedMilestones } : p))
    );

    try {
      const { error } = await supabase
        .from('web_projects')
        .update({
          milestones: updatedMilestones,
          updated_at: new Date().toISOString(),
        })
        .eq('id', project.id);

      if (error) throw error;
      toast.success('Milestone updated');
    } catch (err: any) {
      // Rollback
      setProjects((prev) =>
        prev.map((p) => (p.id === project.id ? { ...p, milestones: currentMilestones } : p))
      );
      toast.error('Failed to update milestone');
    }
  };

  const handleEditClick = (project: WebProject) => {
    setSelectedProject(project);
    setEditModalOpen(true);
  };

  // Filtering Logic
  const filteredProjects = projects.filter((project) => {
    const matchesSearch =
      project.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.scope?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.notes?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesClient = selectedClient === 'all' || project.client_id === selectedClient;
    const matchesStage = selectedStage === 'all' || project.status === selectedStage;

    return matchesSearch && matchesClient && matchesStage;
  });

  // Calculate project completion progress (out of 6 milestones)
  const getCompletionStats = (project: WebProject) => {
    const total = MILESTONES_META.length;
    const completed = MILESTONES_META.reduce(
      (acc, curr) => acc + (project.milestones?.[curr.key] ? 1 : 0),
      0
    );
    return {
      completed,
      total,
      percentage: Math.round((completed / total) * 100),
    };
  };

  // Dashboard Stats
  const activeCount = filteredProjects.filter((p) => p.status !== 'live').length;
  const liveCount = filteredProjects.filter((p) => p.status === 'live').length;
  const totalPipelineValue = filteredProjects
    .filter((p) => p.status !== 'live')
    .reduce((acc, curr) => acc + (curr.budget || 0), 0);

  const avgProgress =
    filteredProjects.length > 0
      ? Math.round(
          filteredProjects.reduce((acc, curr) => acc + getCompletionStats(curr).percentage, 0) /
            filteredProjects.length
        )
      : 0;

  return (
    <PageContainer
      title="Web Design Department"
      description="Monitor active site builds, track staging milestone pipelines, toggle go-live checklists, and manage budgets."
    >
      <div className="space-y-6 select-none">
        {/* 1. Stats strip */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-bg-card border border-border/30 p-3.5 rounded-lg flex items-center justify-between shadow-sm">
            <div className="space-y-0.5">
              <span className="text-[10px] uppercase font-bold text-text-tertiary tracking-wider block">Active Site Builds</span>
              <span className="text-xl font-bold font-mono text-text-primary">{activeCount}</span>
            </div>
            <Layout size={20} className="text-primary opacity-75" />
          </div>

          <div className="bg-bg-card border border-border/30 p-3.5 rounded-lg flex items-center justify-between shadow-sm">
            <div className="space-y-0.5">
              <span className="text-[10px] uppercase font-bold text-text-tertiary tracking-wider block">Websites Launched</span>
              <span className="text-xl font-bold font-mono text-online">{liveCount}</span>
            </div>
            <PlayCircle size={20} className="text-online opacity-75" />
          </div>

          <div className="bg-bg-card border border-border/30 p-3.5 rounded-lg flex items-center justify-between shadow-sm">
            <div className="space-y-0.5">
              <span className="text-[10px] uppercase font-bold text-text-tertiary tracking-wider block">Pipeline Value</span>
              <span className="text-xl font-bold font-mono text-purple-400">
                ₹{totalPipelineValue.toLocaleString('en-IN')}
              </span>
            </div>
            <DollarSign size={20} className="text-purple-500 opacity-75" />
          </div>

          <div className="bg-bg-card border border-border/30 p-3.5 rounded-lg flex items-center justify-between shadow-sm">
            <div className="space-y-0.5">
              <span className="text-[10px] uppercase font-bold text-text-tertiary tracking-wider block">Avg Progress</span>
              <span className="text-xl font-bold font-mono text-amber-400">{avgProgress}%</span>
            </div>
            <CheckCircle size={20} className="text-amber-500 opacity-75" />
          </div>
        </div>

        {/* 2. Filters toolbar */}
        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 bg-bg-card border border-border/30 p-4 rounded-lg">
          <div className="flex flex-wrap items-center gap-3 flex-1">
            <div className="relative min-w-[200px] flex-1 max-w-xs">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-text-secondary pointer-events-none" />
              <Input
                type="text"
                placeholder="Search project name, scope..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-bg-dark border-border/30 text-text-primary text-xs h-9"
              />
            </div>

            {/* Client Filter */}
            <Select value={selectedClient} onValueChange={(val) => setSelectedClient(val || 'all')}>
              <SelectTrigger className="w-[160px] bg-bg-dark border-border/30 text-text-primary text-xs h-9">
                <SelectValue placeholder="All Clients" />
              </SelectTrigger>
              <SelectContent className="bg-bg-card border-border/30 text-text-primary">
                <SelectItem value="all" className="text-xs">All Clients</SelectItem>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id} className="text-xs">
                    {c.name} {c.is_agency_self && '🏢'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Stage Filter */}
            <Select value={selectedStage} onValueChange={(val) => setSelectedStage(val || 'all')}>
              <SelectTrigger className="w-[150px] bg-bg-dark border-border/30 text-text-primary text-xs h-9">
                <SelectValue placeholder="All Stages" />
              </SelectTrigger>
              <SelectContent className="bg-bg-card border-border/30 text-text-primary">
                <SelectItem value="all" className="text-xs">All Stages</SelectItem>
                {STAGES.map((s) => (
                  <SelectItem key={s.id} value={s.id} className="text-xs">
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Button
              variant="outline"
              size="icon"
              onClick={refreshData}
              disabled={loading}
              className="border-border/30 hover:bg-bg-card-hover/20 text-text-secondary h-9 w-9 cursor-pointer"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </Button>
            <Button
              onClick={() => setNewModalOpen(true)}
              className="bg-primary hover:bg-primary-light text-white text-xs h-9 cursor-pointer"
            >
              <Plus size={14} className="mr-1" /> New Project
            </Button>
          </div>
        </div>

        {/* 3. Projects list grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredProjects.map((project) => {
            const client = clients.find((c) => c.id === project.client_id);
            const clientName = client?.name || 'Unknown Client';
            const { completed, total, percentage } = getCompletionStats(project);
            const isExpanded = expandedProjects[project.id] || false;

            const isDeadlineOverdue =
              project.deadline && new Date(project.deadline) < new Date() && project.status !== 'live';

            const activeStageIndex = STAGES.findIndex((s) => s.id === project.status);

            return (
              <div
                key={project.id}
                className="bg-bg-card border border-border/30 rounded-xl flex flex-col shadow-lg hover:border-border/30/70 transition-all overflow-hidden"
              >
                {/* Card Header */}
                <div className="p-4 border-b border-border/30/30 bg-bg-dark flex justify-between items-start gap-4">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold text-primary-light uppercase tracking-wider block">
                      {clientName} {client?.is_agency_self && '🏢'}
                    </span>
                    <h3 className="text-sm font-bold text-text-primary line-clamp-1">{project.name}</h3>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-border-subtle/30 text-text-secondary capitalize border border-border/30/50">
                      {project.project_type?.replace('_', ' ') || 'Web Dev'}
                    </span>
                    <Button
                      variant="ghost"
                      onClick={() => handleEditClick(project)}
                      className="h-6 text-[10px] text-primary-light hover:bg-primary/15 px-2 rounded border border-primary/25"
                    >
                      Manage
                    </Button>
                  </div>
                </div>

                {/* Pipeline visual stepper */}
                <div className="p-4 bg-bg-dark/40 border-b border-border/30/20 flex items-center justify-between select-none">
                  {STAGES.map((stage, idx) => {
                    const isDone = idx < activeStageIndex;
                    const isActive = idx === activeStageIndex;

                    return (
                      <React.Fragment key={stage.id}>
                        {/* Connecting line */}
                        {idx > 0 && (
                          <div
                            className={`h-[2px] flex-1 mx-2 rounded ${
                              idx <= activeStageIndex ? 'bg-primary' : 'bg-border-subtle/30'
                            }`}
                          />
                        )}

                        <div className="flex flex-col items-center space-y-1 relative">
                          <div
                            className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold font-mono border transition-all ${
                              isActive
                                ? 'bg-primary text-white border-primary-light shadow-[0_0_10px_rgba(37,99,235,0.5)] animate-pulse'
                                : isDone
                                ? 'bg-primary/10 text-primary-light border-primary'
                                : 'bg-bg-dark text-text-tertiary border-border/30'
                            }`}
                          >
                            {idx + 1}
                          </div>
                          <span
                            className={`text-[9px] font-medium tracking-wider ${
                              isActive
                                ? 'text-text-primary font-bold'
                                : isDone
                                ? 'text-primary-light'
                                : 'text-text-tertiary'
                            }`}
                          >
                            {stage.label}
                          </span>
                        </div>
                      </React.Fragment>
                    );
                  })}
                </div>

                {/* Main section: Milestones & Progress */}
                <div className="p-4 flex-1 space-y-3.5">
                  {/* Progress Ring / Percentage */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-[10px] text-text-secondary">
                      <span className="font-semibold">Milestone Checklist Completion</span>
                      <span className="font-mono text-text-primary font-bold">
                        {completed}/{total} Completed ({percentage}%)
                      </span>
                    </div>
                    <Progress value={percentage} className="h-1.5 bg-bg-dark" indicatorClassName="bg-primary" />
                  </div>

                  {/* Checklist Grid */}
                  <div className="grid grid-cols-2 gap-2 bg-bg-dark border border-border/30/40 rounded-lg p-3">
                    {MILESTONES_META.map((m) => {
                      const isCompleted = project.milestones?.[m.key] || false;

                      return (
                        <div
                          key={m.key}
                          onClick={() => toggleMilestone(project, m.key)}
                          className={`flex items-center gap-2 p-1.5 rounded cursor-pointer transition-colors ${
                            isCompleted
                              ? 'bg-primary/5 hover:bg-primary/10 text-text-primary'
                              : 'hover:bg-bg-card-hover/20/30 text-text-secondary'
                          }`}
                        >
                          {isCompleted ? (
                            <CheckSquare size={13} className="text-primary-light shrink-0" />
                          ) : (
                            <Square size={13} className="text-text-tertiary shrink-0" />
                          )}
                          <span
                            className={`text-[10px] font-medium leading-none ${
                              isCompleted ? 'text-text-primary font-semibold' : ''
                            }`}
                          >
                            {m.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Dates & Budget */}
                  <div className="flex items-center justify-between text-[10px] border-t border-border/30/20 pt-3">
                    <div className="flex items-center gap-1 text-text-secondary">
                      <Calendar size={11} />
                      <span>
                        Deadline:{' '}
                        <strong
                          className={
                            isDeadlineOverdue
                              ? 'text-red-400 underline decoration-wavy decoration-red-500/50'
                              : 'text-text-primary'
                          }
                        >
                          {project.deadline
                            ? new Date(project.deadline).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })
                            : 'Not set'}
                        </strong>
                      </span>
                    </div>

                    <div className="font-bold text-text-primary bg-primary/15 border border-primary/30 px-2 py-0.5 rounded">
                      Budget: ₹{project.budget?.toLocaleString('en-IN') || 0}
                    </div>
                  </div>
                </div>

                {/* Expand/Collapse Toggle */}
                <div className="border-t border-border/30/25 bg-bg-dark/50">
                  <button
                    onClick={() => toggleExpand(project.id)}
                    className="w-full py-2 px-4 flex items-center justify-between text-[10px] font-bold text-text-secondary hover:text-text-primary transition-colors"
                  >
                    <span>{isExpanded ? 'Hide Details' : 'View Scope, Notes & Contacts'}</span>
                    {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </button>

                  {/* Collapsible Panel */}
                  {isExpanded && (
                    <div className="px-4 pb-4 space-y-3.5 border-t border-border/30/20 pt-3 text-[10px] leading-relaxed select-text">
                      {/* Contacts */}
                      {project.key_contacts && (
                        <div className="space-y-1">
                          <span className="font-bold text-text-secondary uppercase tracking-wider block">
                            Key Contacts
                          </span>
                          <div className="bg-bg-dark border border-border/30/40 rounded p-2 text-text-primary">
                            {project.key_contacts}
                          </div>
                        </div>
                      )}

                      {/* Scope */}
                      {project.scope && (
                        <div className="space-y-1">
                          <span className="font-bold text-text-secondary uppercase tracking-wider block">
                            Scope of Work
                          </span>
                          <div className="bg-bg-dark border border-border/30/40 rounded p-2 text-text-primary whitespace-pre-wrap">
                            {project.scope}
                          </div>
                        </div>
                      )}

                      {/* Notes */}
                      {project.notes && (
                        <div className="space-y-1">
                          <span className="font-bold text-text-secondary uppercase tracking-wider block">
                            Internal Notes
                          </span>
                          <div className="bg-bg-dark border border-border/30/40 rounded p-2 text-text-primary whitespace-pre-wrap">
                            {project.notes}
                          </div>
                        </div>
                      )}

                      {/* Fallback if empty */}
                      {!project.scope && !project.notes && !project.key_contacts && (
                        <p className="text-center text-text-tertiary italic py-2">
                          No additional scope details or internal notes recorded.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {filteredProjects.length === 0 && (
            <div className="col-span-2 rounded-lg border border-dashed border-border/30/30 bg-bg-card p-12 text-center text-text-secondary select-none">
              <FileCode2 size={24} className="mx-auto mb-2 opacity-50 text-text-secondary" />
              No web design projects tracked matching these filter parameters.
            </div>
          )}
        </div>
      </div>

      <NewWebProjectModal
        open={newModalOpen}
        onOpenChange={setNewModalOpen}
        onSuccess={refreshData}
        clients={clients}
      />

      <EditWebProjectModal
        project={selectedProject}
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        onSuccess={refreshData}
        clients={clients}
      />
    </PageContainer>
  );
}

export default WebDesignDashboard;
