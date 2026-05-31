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
      <DialogContent className="bg-[#0D1829] border border-[#1E3352] text-[#F0F4FF] max-w-md select-none max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-[#F0F4FF]">
            {taskToEdit ? 'Edit Task Deliverable' : 'Add Task Deliverable'}
          </DialogTitle>
          <DialogDescription className="text-xs text-[#8BA3C7]">
            {taskToEdit
              ? `Update details for task in ${taskToEdit.month_year}.`
              : `Create a new monthly deliverable for ${selectedMonth}.`}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 my-2 text-xs">
          <div className="col-span-2 space-y-1">
            <label className="text-[11px] font-semibold text-[#8BA3C7] tracking-wider uppercase">Client *</label>
            <select
              value={form.client_id}
              onChange={(e) => setForm((p) => ({ ...p, client_id: e.target.value }))}
              className="input h-9 w-full bg-[#060D1A] border-[#1E3352] text-[#F0F4FF] rounded px-3"
              disabled={!!taskToEdit}
            >
              <option value="" disabled>Select client</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id} className="bg-[#0D1829]">
                  {client.name}
                </option>
              ))}
            </select>
          </div>

          <div className="col-span-2 space-y-1">
            <label className="text-[11px] font-semibold text-[#8BA3C7] tracking-wider uppercase">Task Title *</label>
            <input
              type="text"
              placeholder="e.g. Conduct SEO Audit reports"
              value={form.title}
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              className="input h-9 w-full bg-[#060D1A] border-[#1E3352] text-[#F0F4FF] rounded px-3"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-[#8BA3C7] tracking-wider uppercase">Department</label>
            <select
              value={form.department}
              onChange={(e) => setForm((p) => ({ ...p, department: e.target.value }))}
              className="input h-9 w-full bg-[#060D1A] border-[#1E3352] text-[#F0F4FF] rounded px-3"
            >
              {DEPARTMENTS.map((d) => (
                <option key={d.id} value={d.id} className="bg-[#0D1829]">
                  {d.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-[#8BA3C7] tracking-wider uppercase">Priority</label>
            <select
              value={form.priority}
              onChange={(e) => setForm((p) => ({ ...p, priority: e.target.value as TaskPriority }))}
              className="input h-9 w-full bg-[#060D1A] border-[#1E3352] text-[#F0F4FF] rounded px-3"
            >
              {PRIORITIES.map((p) => (
                <option key={p.id} value={p.id} className="bg-[#0D1829]">
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-[#8BA3C7] tracking-wider uppercase">Status</label>
            <select
              value={form.status}
              onChange={(e) => setForm((p) => ({ ...p, status: e.target.value as TaskStatus }))}
              className="input h-9 w-full bg-[#060D1A] border-[#1E3352] text-[#F0F4FF] rounded px-3"
            >
              {STATUSES.map((s) => (
                <option key={s.id} value={s.id} className="bg-[#0D1829]">
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-[#8BA3C7] tracking-wider uppercase">Assign To</label>
            <select
              value={form.assigned_to}
              onChange={(e) => setForm((p) => ({ ...p, assigned_to: e.target.value }))}
              className="input h-9 w-full bg-[#060D1A] border-[#1E3352] text-[#F0F4FF] rounded px-3"
            >
              <option value="" className="bg-[#0D1829]">Unassigned</option>
              {profiles.map((p) => (
                <option key={p.id} value={p.id} className="bg-[#0D1829]">
                  {p.full_name} ({p.role})
                </option>
              ))}
            </select>
          </div>

          <div className="col-span-2 space-y-1">
            <label className="text-[11px] font-semibold text-[#8BA3C7] tracking-wider uppercase">Due Date</label>
            <input
              type="date"
              value={form.due_date}
              onChange={(e) => setForm((p) => ({ ...p, due_date: e.target.value }))}
              className="input h-9 w-full bg-[#060D1A] border-[#1E3352] text-[#F0F4FF] rounded px-3"
            />
          </div>

          <div className="col-span-2 space-y-1">
            <label className="text-[11px] font-semibold text-[#8BA3C7] tracking-wider uppercase">Scope / Requirements</label>
            <textarea
              placeholder="Write description here..."
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              rows={2}
              className="input w-full bg-[#060D1A] border-[#1E3352] text-[#F0F4FF] rounded p-2 resize-none"
            />
          </div>

          <div className="col-span-2 space-y-1">
            <label className="text-[11px] font-semibold text-[#8BA3C7] tracking-wider uppercase">Detailed Instructions for Team Member</label>
            <textarea
              placeholder="List SOP parameters, file structures, checklist instructions..."
              value={form.instructions}
              onChange={(e) => setForm((p) => ({ ...p, instructions: e.target.value }))}
              rows={3}
              className="input w-full bg-[#060D1A] border-[#1E3352] text-[#F0F4FF] rounded p-2 resize-none"
            />
          </div>
        </div>

        <DialogFooter className="mt-4 gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="bg-transparent border-[#1E3352] text-[#8BA3C7] hover:bg-[#132035] hover:text-[#F0F4FF] cursor-pointer"
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            className="bg-[#1B4FD8] hover:bg-[#2563EB] text-white cursor-pointer"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving...' : taskToEdit ? 'Save Changes' : 'Add Deliverable'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
