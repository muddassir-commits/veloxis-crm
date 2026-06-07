'use client';

import React, { useState, useTransition, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ChevronLeft,
  ChevronRight,
  X,
  Send,
  Loader2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Info,
  Paperclip,
  FileText,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { FileUpload } from '@/components/shared/file-upload';
import { formatDate } from '@/lib/utils';

interface TaskWithClient {
  id: string;
  title: string;
  description: string | null;
  instructions: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  month_year: string | null;
  client_id: string;
  clients: { name: string; is_agency_self?: boolean } | null;
}

interface EmployeeTasksPageProps {
  tasks: TaskWithClient[];
  clients: { id: string; name: string }[];
  selectedMonth: string;
  openSubmitTaskId?: string;
  employeeId: string;
}

const STATUS_TABS = ['all', 'todo', 'in_progress', 'review', 'done'];
const STATUS_LABELS: Record<string, string> = {
  all: 'All',
  todo: 'To Do',
  in_progress: 'In Progress',
  review: 'Review',
  done: 'Done',
};
const STATUS_COLORS: Record<string, string> = {
  todo: 'text-text-secondary bg-text-muted/10',
  in_progress: 'text-primary-light bg-primary/15',
  review: 'text-purple-400 bg-purple-500/15',
  approved: 'text-emerald-400 bg-emerald-400/15',
  done: 'text-online bg-online/15',
};
const PRIORITY_COLORS: Record<string, string> = {
  urgent: 'bg-error/15 text-error border border-error/20',
  high: 'bg-accent/15 text-accent border border-accent/20',
  medium: 'bg-warning/15 text-warning border border-warning/20',
  low: 'bg-success/15 text-online border border-success/20',
};

function parseMonthYear(monthYear: string) {
  const [month, year] = monthYear.split(' ');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return new Date(parseInt(year), months.indexOf(month));
}

function formatMonthYear(date: Date) {
  return date.toLocaleString('en-US', { month: 'short', year: 'numeric' });
}

export function EmployeeTasksPage({
  tasks,
  selectedMonth,
  openSubmitTaskId,
  employeeId,
}: EmployeeTasksPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [activeStatus, setActiveStatus] = useState('all');
  const [selectedTask, setSelectedTask] = useState<TaskWithClient | null>(null);
  const [submitMode, setSubmitMode] = useState(false);
  const [workNotes, setWorkNotes] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<{ id: string; name: string; public_url: string; storage_path: string }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);

  // Open submit drawer from URL param (coming from Today page)
  useEffect(() => {
    if (openSubmitTaskId) {
      const task = tasks.find((t) => t.id === openSubmitTaskId);
      if (task) {
        const timer = setTimeout(() => {
          setSelectedTask(task);
          setSubmitMode(true);
        }, 0);
        return () => clearTimeout(timer);
      }
    }
  }, [openSubmitTaskId, tasks]);

  // Month navigation
  const currentMonthDate = parseMonthYear(selectedMonth);

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentMonthDate);
    newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
    const newMonth = formatMonthYear(newDate);
    const params = new URLSearchParams(searchParams.toString());
    params.set('month', newMonth);
    startTransition(() => router.push(`/team/tasks?${params.toString()}`));
  };

  // Filter tasks by status
  const filteredTasks = tasks.filter((t) => activeStatus === 'all' || t.status === activeStatus);

  const today = new Date().toISOString().split('T')[0];

  const handleUpdateStatus = async (taskId: string, status: string) => {
    setUpdatingTaskId(taskId);
    try {
      const res = await fetch(`/api/tasks/${taskId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update');
      toast.success(`Task status updated to "${STATUS_LABELS[status] || status}"`);
      startTransition(() => router.refresh());
      if (selectedTask?.id === taskId) {
        setSelectedTask((prev) => prev ? { ...prev, status } : null);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setUpdatingTaskId(null);
    }
  };

  const handleSubmitForReview = async () => {
    if (!selectedTask) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/tasks/${selectedTask.id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notes: workNotes,
          file_ids: uploadedFiles.map((f) => f.id),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit');
      toast.success('Task submitted for review! ✓');
      setSubmitMode(false);
      setSelectedTask(null);
      setWorkNotes('');
      setUploadedFiles([]);
      startTransition(() => router.refresh());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Submission failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 py-3">
      {/* Month Navigator */}
      <div className="flex items-center justify-between">
        <h1 className="text-base font-bold text-text-primary">My Tasks</h1>
        <div className="flex items-center gap-2 bg-bg-card border border-border/30 rounded-[8px] p-1">
          <button
            onClick={() => navigateMonth('prev')}
            disabled={isPending}
            className="p-1 rounded hover:bg-bg-card-hover/20 text-text-secondary hover:text-text-primary cursor-pointer disabled:opacity-50"
          >
            <ChevronLeft size={14} />
          </button>
          <span className="text-xs font-bold text-text-primary px-2 min-w-[80px] text-center">{selectedMonth}</span>
          <button
            onClick={() => navigateMonth('next')}
            disabled={isPending}
            className="p-1 rounded hover:bg-bg-card-hover/20 text-text-secondary hover:text-text-primary cursor-pointer disabled:opacity-50"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
        {STATUS_TABS.map((status) => {
          const count = status === 'all' ? tasks.length : tasks.filter((t) => t.status === status).length;
          return (
            <button
              key={status}
              onClick={() => setActiveStatus(status)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider whitespace-nowrap transition-all cursor-pointer ${
                activeStatus === status
                  ? 'bg-primary text-white'
                  : 'bg-bg-card border border-border/30 text-text-tertiary hover:text-text-secondary'
              }`}
            >
              {STATUS_LABELS[status]}
              <span className={`text-[9px] px-1 py-0.5 rounded-full font-black ${activeStatus === status ? 'bg-bg-light/20 text-white' : 'bg-bg-card-hover/20 text-text-tertiary'}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Tasks List */}
      {filteredTasks.length === 0 ? (
        <div className="bg-bg-card border border-border/30 border-dashed rounded-[10px] p-8 text-center">
          <CheckCircle2 size={24} className="text-online mx-auto mb-2" />
          <p className="text-sm font-semibold text-text-primary">No tasks found</p>
          <p className="text-xs text-text-tertiary mt-1">No tasks match this filter for {selectedMonth}.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredTasks.map((task) => {
            const isOverdue = task.due_date && task.due_date < today && task.status !== 'done';
            return (
              <button
                key={task.id}
                onClick={() => { setSelectedTask(task); setSubmitMode(false); }}
                className="w-full text-left bg-bg-card border border-border/30 rounded-[10px] p-4 hover:border-primary/40 hover:bg-bg-card-hover/20/30 transition-all cursor-pointer"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5 mb-1">
                      {task.clients && (
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${task.clients.is_agency_self ? 'bg-accent/20 text-accent' : 'bg-primary/15 text-primary-light'}`}>
                          {task.clients.name}
                        </span>
                      )}
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${PRIORITY_COLORS[task.priority] || ''}`}>
                        {task.priority}
                      </span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold ${STATUS_COLORS[task.status] || ''}`}>
                        {STATUS_LABELS[task.status] || task.status}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-text-primary leading-snug">{task.title}</p>
                  </div>
                  <div className={`text-[10px] font-mono shrink-0 ${isOverdue ? 'text-error' : 'text-text-tertiary'}`}>
                    {task.due_date ? formatDate(task.due_date) : '-'}
                    {isOverdue && <AlertTriangle size={10} className="inline ml-1" />}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Task Detail Drawer */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="flex-1 bg-black/60 backdrop-blur-sm"
            onClick={() => { setSelectedTask(null); setSubmitMode(false); }}
          />

          {/* Drawer Panel */}
          <div className="w-full max-w-md bg-bg-card border-l border-border/30 flex flex-col overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border/30 sticky top-0 bg-bg-card z-10">
              <div>
                <p className="text-[10px] text-text-tertiary uppercase font-bold tracking-wider">
                  {selectedTask.clients?.name || 'Task Details'}
                </p>
                <h3 className="text-sm font-bold text-text-primary leading-snug mt-0.5 line-clamp-2">
                  {selectedTask.title}
                </h3>
              </div>
              <button
                onClick={() => { setSelectedTask(null); setSubmitMode(false); }}
                className="p-1.5 rounded hover:bg-bg-card-hover/20 text-text-secondary hover:text-text-primary cursor-pointer shrink-0 ml-3"
              >
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 p-4 space-y-4">
              {/* Metadata badges */}
              <div className="flex flex-wrap gap-2">
                <span className={`text-[10px] px-2 py-1 rounded-full font-bold ${PRIORITY_COLORS[selectedTask.priority] || ''}`}>
                  {selectedTask.priority} priority
                </span>
                <span className={`text-[10px] px-2 py-1 rounded-full font-semibold ${STATUS_COLORS[selectedTask.status] || ''}`}>
                  {STATUS_LABELS[selectedTask.status] || selectedTask.status}
                </span>
                {selectedTask.due_date && (
                  <span className={`text-[10px] px-2 py-1 rounded-full font-mono font-semibold ${
                    selectedTask.due_date < today && selectedTask.status !== 'done'
                      ? 'bg-error/15 text-error'
                      : 'bg-bg-card-hover/20 text-text-secondary'
                  }`}>
                    <Clock size={10} className="inline mr-1" />
                    Due {formatDate(selectedTask.due_date)}
                  </span>
                )}
                {selectedTask.month_year && (
                  <span className="text-[10px] px-2 py-1 rounded-full font-semibold bg-bg-card-hover/20 text-text-tertiary">
                    {selectedTask.month_year}
                  </span>
                )}
              </div>

              {/* Description */}
              {selectedTask.description && (
                <div>
                  <p className="text-[10px] uppercase font-bold text-text-tertiary tracking-wider mb-1.5 flex items-center gap-1">
                    <Info size={10} /> Description
                  </p>
                  <p className="text-xs text-text-secondary leading-relaxed">{selectedTask.description}</p>
                </div>
              )}

              {/* Instructions */}
              {selectedTask.instructions && (
                <div>
                  <p className="text-[10px] uppercase font-bold text-text-tertiary tracking-wider mb-1.5 flex items-center gap-1">
                    <FileText size={10} /> Instructions
                  </p>
                  <div className="bg-bg-dark border border-border/30 rounded-[7px] p-3">
                    <p className="text-xs text-text-primary leading-relaxed whitespace-pre-wrap">
                      {selectedTask.instructions}
                    </p>
                  </div>
                </div>
              )}

              {/* Status Update (not done tasks) */}
              {selectedTask.status !== 'done' && !submitMode && (
                <div>
                  <p className="text-[10px] uppercase font-bold text-text-tertiary tracking-wider mb-2">Update Status</p>
                  <div className="flex flex-wrap gap-2">
                    {['todo', 'in_progress'].map((s) => (
                      <button
                        key={s}
                        onClick={() => handleUpdateStatus(selectedTask.id, s)}
                        disabled={selectedTask.status === s || updatingTaskId === selectedTask.id}
                        className={`px-3 py-1.5 rounded text-[10px] font-bold uppercase cursor-pointer transition-all disabled:opacity-50 ${
                          selectedTask.status === s
                            ? 'bg-primary text-white'
                            : 'bg-bg-card-hover/20 border border-border/30 text-text-secondary hover:text-text-primary'
                        }`}
                      >
                        {updatingTaskId === selectedTask.id ? (
                          <Loader2 size={10} className="inline animate-spin" />
                        ) : (
                          STATUS_LABELS[s]
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Submit for Review */}
              {!submitMode && selectedTask.status !== 'done' && (
                <button
                  onClick={() => setSubmitMode(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-online/15 border border-online/30 text-online rounded-[7px] text-xs font-bold hover:bg-online/25 transition-colors cursor-pointer"
                >
                  <Send size={13} /> Submit for Review
                </button>
              )}

              {/* Submission Form */}
              {submitMode && (
                <div className="space-y-3 border border-border/30 rounded-[10px] p-4 bg-bg-dark">
                  <p className="text-xs font-bold text-text-primary flex items-center gap-2">
                    <Paperclip size={12} className="text-online" />
                    Submit Work for Review
                  </p>

                  <div className="space-y-1">
                    <label className="text-[10px] text-text-tertiary font-bold uppercase tracking-wider">Work Notes</label>
                    <textarea
                      value={workNotes}
                      onChange={(e) => setWorkNotes(e.target.value)}
                      placeholder="Describe what you did, any comments, links, etc."
                      rows={4}
                      className="w-full bg-bg-card border border-border/30 rounded-[7px] px-3 py-2 text-xs text-text-primary placeholder-[#4A6480] resize-none focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-text-tertiary font-bold uppercase tracking-wider">
                      Attach Files (optional)
                    </label>
                    <FileUpload
                      bucket="employees"
                      storagePath={`employees/${employeeId}/work`}
                      department="general"
                      onUpload={(meta) => setUploadedFiles((prev) => [...prev, meta])}
                    />
                    {uploadedFiles.length > 0 && (
                      <div className="space-y-1 mt-2">
                        {uploadedFiles.map((f, i) => (
                          <div key={i} className="flex items-center gap-2 text-[10px] text-online bg-online/10 border border-online/20 rounded px-2 py-1">
                            <CheckCircle2 size={10} />
                            <span className="truncate">{f.name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 pt-1">
                    <Button
                      onClick={() => setSubmitMode(false)}
                      variant="outline"
                      size="sm"
                      className="flex-1 bg-transparent border-border/30 text-text-secondary hover:bg-bg-card-hover/20 hover:text-text-primary text-xs cursor-pointer"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSubmitForReview}
                      disabled={isSubmitting}
                      size="sm"
                      className="flex-1 bg-online hover:bg-online/80 text-white text-xs font-bold cursor-pointer"
                    >
                      {isSubmitting ? (
                        <><Loader2 size={11} className="animate-spin mr-1" /> Submitting...</>
                      ) : (
                        <><Send size={11} className="mr-1" /> Submit</>
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {/* Done state */}
              {selectedTask.status === 'done' && (
                <div className="flex items-center gap-2 p-3 bg-online/10 border border-online/20 rounded-[7px]">
                  <CheckCircle2 size={14} className="text-online" />
                  <p className="text-xs text-online font-semibold">This task is complete! 🎉</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
