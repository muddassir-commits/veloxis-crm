'use client';

import React, { useEffect, useState } from 'react';
import { Client, Task, TaskStatus, TaskPriority, Profile } from '@/types';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface AddTaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clients: Client[];
  profiles: Profile[];
  selectedMonth: string;
  taskToEdit?: Task | null;
  onSuccess: () => void;
  preFilledClientId?: string | null;
}

const DEPARTMENTS = [
  { id: 'seo', label: 'SEO' },
  { id: 'social', label: 'Social Media' },
  { id: 'ads', label: 'Paid Ads' },
  { id: 'content', label: 'Content Writing' },
  { id: 'web', label: 'Web Development' },
  { id: 'email', label: 'Email Marketing' },
];

const PRIORITIES: { id: TaskPriority; label: string }[] = [
  { id: 'low', label: 'Low' },
  { id: 'medium', label: 'Medium' },
  { id: 'high', label: 'High' },
  { id: 'urgent', label: 'Urgent' },
];

const STATUSES: { id: TaskStatus; label: string }[] = [
  { id: 'todo', label: 'Todo' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'review', label: 'Review' },
  { id: 'approved', label: 'Approved' },
  { id: 'done', label: 'Completed' },
];

export function AddTaskModal({
  open,
  onOpenChange,
  clients,
  profiles,
  selectedMonth,
  taskToEdit,
  onSuccess,
  preFilledClientId,
}: AddTaskModalProps) {
  const supabase = createClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [form, setForm] = useState({
    client_id: '',
    title: '',
    description: '',
    instructions: '',
    status: 'todo' as TaskStatus,
    priority: 'medium' as TaskPriority,
    due_date: '',
    assigned_to: '',
    department: 'seo',
  });

  // Load editing task data or set defaults
  useEffect(() => {
    if (open) {
      if (taskToEdit) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setForm({
          client_id: taskToEdit.client_id || '',
          title: taskToEdit.title || '',
          description: taskToEdit.description || '',
          instructions: taskToEdit.instructions || '',
          status: taskToEdit.status || 'todo',
          priority: taskToEdit.priority || 'medium',
          due_date: taskToEdit.due_date || '',
          assigned_to: taskToEdit.assigned_to || '',
          department: taskToEdit.department || 'seo',
        });
      } else {
        setForm({
          client_id: preFilledClientId || (clients.length > 0 ? clients[0].id : ''),
          title: '',
          description: '',
          instructions: '',
          status: 'todo',
          priority: 'medium',
          due_date: '',
          assigned_to: '',
          department: 'seo',
        });
      }
    }
  }, [open, taskToEdit, preFilledClientId, clients, selectedMonth]);

  const handleSubmit = async () => {
    if (!form.client_id) {
      toast.error('Please select a client.');
      return;
    }
    if (!form.title.trim()) {
      toast.error('Task title is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const taskData = {
        client_id: form.client_id,
        title: form.title.trim(),
        description: form.description.trim() || null,
        instructions: form.instructions.trim() || null,
        status: form.status,
        priority: form.priority,
        due_date: form.due_date || null,
        month_year: taskToEdit ? taskToEdit.month_year : selectedMonth,
        assigned_to: form.assigned_to || null,
        department: form.department,
        updated_at: new Date().toISOString(),
      };

      if (taskToEdit) {
        // UPDATE task
        const { error } = await supabase
          .from('tasks')
          .update(taskData)
          .eq('id', taskToEdit.id);

        if (error) throw error;
        toast.success('Task updated successfully.');
      } else {
        // INSERT task
        const { error } = await supabase.from('tasks').insert({
          ...taskData,
          created_at: new Date().toISOString(),
        });

        if (error) throw error;
        toast.success('Task deliverable created.');
      }

      onSuccess();
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      toast.error(taskToEdit ? 'Failed to update task.' : 'Failed to create task.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] select-none max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {taskToEdit ? 'Edit Task Deliverable' : 'Add Task Deliverable'}
          </DialogTitle>
          <DialogDescription>
            {taskToEdit
              ? `Update details for task in ${taskToEdit.month_year}.`
              : `Create a new monthly deliverable for ${selectedMonth}.`}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 my-2 text-xs">
          <div className="col-span-2 space-y-1 flex flex-col">
            <label className="text-xs font-semibold text-text-secondary select-none">Client *</label>
            <select
              value={form.client_id}
              onChange={(e) => setForm((p) => ({ ...p, client_id: e.target.value }))}
              className="h-9 w-full min-w-0 rounded-lg border border-border/30 bg-bg-card/50 px-3 py-1 text-sm text-text-primary backdrop-blur-[8px] outline-none transition-all duration-200 focus:border-primary/50 focus:bg-bg-card/70 focus:shadow-[0_0_16px_rgba(37,99,235,0.15)]"
              disabled={!!taskToEdit}
            >
              <option value="" disabled>Select client</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          </div>

          <div className="col-span-2 space-y-1 flex flex-col">
            <label className="text-xs font-semibold text-text-secondary select-none">Task Title *</label>
            <input
              type="text"
              placeholder="e.g. Conduct SEO Audit reports"
              value={form.title}
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              className="h-9 w-full min-w-0 rounded-lg border border-border/30 bg-bg-card/50 px-3 py-1 text-sm text-text-primary backdrop-blur-[8px] outline-none transition-all duration-200 focus:border-primary/50 focus:bg-bg-card/70 focus:shadow-[0_0_16px_rgba(37,99,235,0.15)] placeholder:text-text-tertiary"
            />
          </div>

          <div className="space-y-1 flex flex-col">
            <label className="text-xs font-semibold text-text-secondary select-none">Department</label>
            <select
              value={form.department}
              onChange={(e) => setForm((p) => ({ ...p, department: e.target.value }))}
              className="h-9 w-full min-w-0 rounded-lg border border-border/30 bg-bg-card/50 px-3 py-1 text-sm text-text-primary backdrop-blur-[8px] outline-none transition-all duration-200 focus:border-primary/50 focus:bg-bg-card/70 focus:shadow-[0_0_16px_rgba(37,99,235,0.15)]"
            >
              {DEPARTMENTS.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1 flex flex-col">
            <label className="text-xs font-semibold text-text-secondary select-none">Priority</label>
            <select
              value={form.priority}
              onChange={(e) => setForm((p) => ({ ...p, priority: e.target.value as TaskPriority }))}
              className="h-9 w-full min-w-0 rounded-lg border border-border/30 bg-bg-card/50 px-3 py-1 text-sm text-text-primary backdrop-blur-[8px] outline-none transition-all duration-200 focus:border-primary/50 focus:bg-bg-card/70 focus:shadow-[0_0_16px_rgba(37,99,235,0.15)]"
            >
              {PRIORITIES.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1 flex flex-col">
            <label className="text-xs font-semibold text-text-secondary select-none">Status</label>
            <select
              value={form.status}
              onChange={(e) => setForm((p) => ({ ...p, status: e.target.value as TaskStatus }))}
              className="h-9 w-full min-w-0 rounded-lg border border-border/30 bg-bg-card/50 px-3 py-1 text-sm text-text-primary backdrop-blur-[8px] outline-none transition-all duration-200 focus:border-primary/50 focus:bg-bg-card/70 focus:shadow-[0_0_16px_rgba(37,99,235,0.15)]"
            >
              {STATUSES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1 flex flex-col">
            <label className="text-xs font-semibold text-text-secondary select-none">Assign To</label>
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

          <div className="col-span-2 space-y-1 flex flex-col">
            <label className="text-xs font-semibold text-text-secondary select-none">Due Date</label>
            <input
              type="date"
              value={form.due_date}
              onChange={(e) => setForm((p) => ({ ...p, due_date: e.target.value }))}
              className="h-9 w-full min-w-0 rounded-lg border border-border/30 bg-bg-card/50 px-3 py-1 text-sm text-text-primary backdrop-blur-[8px] outline-none transition-all duration-200 focus:border-primary/50 focus:bg-bg-card/70 focus:shadow-[0_0_16px_rgba(37,99,235,0.15)]"
            />
          </div>

          <div className="col-span-2 space-y-1 flex flex-col">
            <label className="text-xs font-semibold text-text-secondary select-none">Scope / Requirements</label>
            <textarea
              placeholder="Write description here..."
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              rows={2}
              className="h-20 w-full rounded-lg border border-border/30 bg-bg-card/50 px-3 py-2 text-sm text-text-primary backdrop-blur-[8px] outline-none transition-all duration-200 focus:border-primary/50 focus:bg-bg-card/70 focus:shadow-[0_0_16px_rgba(37,99,235,0.15)] placeholder:text-text-tertiary resize-none"
            />
          </div>

          <div className="col-span-2 space-y-1 flex flex-col">
            <label className="text-xs font-semibold text-text-secondary select-none">Detailed Instructions for Team Member</label>
            <textarea
              placeholder="List SOP parameters, file structures, checklist instructions..."
              value={form.instructions}
              onChange={(e) => setForm((p) => ({ ...p, instructions: e.target.value }))}
              rows={3}
              className="h-24 w-full rounded-lg border border-border/30 bg-bg-card/50 px-3 py-2 text-sm text-text-primary backdrop-blur-[8px] outline-none transition-all duration-200 focus:border-primary/50 focus:bg-bg-card/70 focus:shadow-[0_0_16px_rgba(37,99,235,0.15)] placeholder:text-text-tertiary resize-none"
            />
          </div>
        </div>

        <DialogFooter className="mt-4 gap-2 sm:gap-0">
          <Button
            variant="secondary"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            loading={isSubmitting}
          >
            {taskToEdit ? 'Save Changes' : 'Add Deliverable'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
