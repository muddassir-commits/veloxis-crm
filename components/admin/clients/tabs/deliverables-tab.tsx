'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Client, Task, TaskStatus, TaskPriority, Profile } from '@/types';
import { toast } from 'sonner';
import { formatDate, getMonthYear } from '@/lib/utils';
import { Plus, ListTodo, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/shared/data-table';
import { StatusBadge } from '@/components/shared/status-badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';

interface DeliverablesTabProps {
  client: Client;
  profiles: Profile[];
}

export function DeliverablesTab({ client, profiles }: DeliverablesTabProps) {
  const supabase = createClient();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Month-Year state (defaults to current month, e.g. "Jun 2026")
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const monthYearString = getMonthYear(currentDate);

  // Dialog State
  const [addModalOpen, setAddModalOpen] = useState(false);

  // Form State
  const [form, setForm] = useState({
    title: '',
    description: '',
    instructions: '',
    status: 'todo' as TaskStatus,
    priority: 'medium' as TaskPriority,
    due_date: new Date().toISOString().split('T')[0],
    assigned_to: '',
    department: 'seo',
  });

  const DEPARTMENTS = [
    { id: 'seo', label: 'SEO' },
    { id: 'social', label: 'Social Media' },
    { id: 'ads', label: 'Paid Ads' },
    { id: 'content', label: 'Content Writing' },
    { id: 'web', label: 'Web Development' },
  ];

  const fetchTasks = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('client_id', client.id)
        .eq('month_year', monthYearString)
        .order('due_date', { ascending: true });

      if (error) throw error;
      setTasks(data || []);
    } catch {
      toast.error('Failed to load tasks.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client.id, monthYearString, supabase]);

  // Navigate Months
  const handlePrevMonth = () => {
    setCurrentDate((prev) => {
      const copy = new Date(prev);
      copy.setMonth(copy.getMonth() - 1);
      return copy;
    });
  };

  const handleNextMonth = () => {
    setCurrentDate((prev) => {
      const copy = new Date(prev);
      copy.setMonth(copy.getMonth() + 1);
      return copy;
    });
  };

  // Toggle Task Status Checkbox (Quick Mark Complete)
  const handleToggleComplete = async (task: Task, isChecked: boolean) => {
    const newStatus: TaskStatus = isChecked ? 'done' : 'todo';
    const completedAt = isChecked ? new Date().toISOString() : null;

    try {
      const { error } = await supabase
        .from('tasks')
        .update({
          status: newStatus,
          completed_at: completedAt,
          updated_at: new Date().toISOString(),
        })
        .eq('id', task.id);

      if (error) throw error;

      // Log activity automatically
      await supabase.from('activity_log').insert({
        client_id: client.id,
        action: 'UPDATE',
        entity_type: 'task',
        entity_id: task.id,
        title: `Task marked as ${newStatus}`,
        description: `Task "${task.title}" updated for client ${client.name}.`,
      });

      toast.success(isChecked ? 'Task completed.' : 'Task reopened.');
      fetchTasks();
    } catch {
      toast.error('Failed to update task status.');
    }
  };

  // Submit Handler: Add Task
  const handleAddTask = async () => {
    if (!form.title.trim()) {
      toast.error('Task title is required.');
      return;
    }

    try {
      const { error } = await supabase.from('tasks').insert({
        client_id: client.id,
        title: form.title,
        description: form.description || null,
        instructions: form.instructions || null,
        status: form.status,
        priority: form.priority,
        due_date: form.due_date || null,
        month_year: monthYearString,
        assigned_to: form.assigned_to || null,
        department: form.department,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      if (error) throw error;

      toast.success('Task created successfully.');
      setAddModalOpen(false);
      setForm({
        title: '',
        description: '',
        instructions: '',
        status: 'todo',
        priority: 'medium',
        due_date: new Date().toISOString().split('T')[0],
        assigned_to: '',
        department: 'seo',
      });
      fetchTasks();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create task.';
      toast.error(errorMessage);
    }
  };

  // Columns for Tasks Table
  const columns = [
    {
      key: 'status_checkbox',
      header: '',
      width: '5%',
      render: (_val: unknown, row: Record<string, unknown>) => {
        const task = row as unknown as Task;
        const isDone = task.status === 'done';

        return (
          <input
            type="checkbox"
            checked={isDone}
            onChange={(e) => handleToggleComplete(task, e.target.checked)}
            className="rounded border-[#1E3352] bg-[#060D1A] text-[#1B4FD8] focus:ring-0 cursor-pointer h-4 w-4"
          />
        );
      },
    },
    {
      key: 'title',
      header: 'Task Deliverable',
      width: '45%',
      render: (val: unknown, row: Record<string, unknown>) => {
        const task = row as unknown as Task;
        const isDone = task.status === 'done';
        return (
          <div className="flex flex-col gap-0.5">
            <span className={`font-semibold text-xs transition-all ${isDone ? 'line-through text-[#4A6480]' : 'text-[#F0F4FF]'}`}>
              {String(val)}
            </span>
            {task.description && (
              <span className={`text-[10px] truncate max-w-[250px] ${isDone ? 'text-[#4A6480]/50' : 'text-[#8BA3C7]'}`}>
                {task.description}
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'department',
      header: 'Dept',
      width: '10%',
      render: (val: unknown) => (
        <span className="text-[10px] bg-[#132035] border border-[#1E3352] text-[#8BA3C7] px-1.5 py-0.5 rounded uppercase font-medium select-none">
          {String(val || '')}
        </span>
      ),
    },
    {
      key: 'priority',
      header: 'Priority',
      width: '12%',
      render: (val: unknown) => <StatusBadge status={String(val)} />,
    },
    {
      key: 'status',
      header: 'Status',
      width: '12%',
      render: (val: unknown) => <StatusBadge status={String(val)} />,
    },
    {
      key: 'due_date',
      header: 'Due Date',
      width: '12%',
      render: (val: unknown, row: Record<string, unknown>) => {
        const dateStr = String(val || '');
        const isOverdue = dateStr && dateStr < new Date().toISOString().split('T')[0] && row.status !== 'done';
        return (
          <span className={`font-mono text-xs ${isOverdue ? 'text-[#EF4444] font-semibold' : 'text-[#4A6480]'}`}>
            {val ? formatDate(dateStr) : '-'}
          </span>
        );
      },
    },
    {
      key: 'assigned_to',
      header: 'Assignee',
      width: '10%',
      render: (val: unknown) => {
        const assignee = profiles.find((p) => p.id === val);
        if (!assignee) {
          return <span className="text-[#4A6480] text-xs font-mono">-</span>;
        }
        return (
          <div
            title={`Assigned to ${assignee.full_name}`}
            className="h-5 w-5 rounded-full bg-[#1B4FD8] text-white flex items-center justify-center font-bold text-[9px] uppercase select-none border border-[#1E3352]"
          >
            {assignee.full_name.charAt(0)}
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      {/* Header controls strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 select-none">
        {/* Month Selector */}
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrevMonth}
            className="p-1 rounded bg-[#132035] border border-[#1E3352] text-[#8BA3C7] hover:text-[#F0F4FF] cursor-pointer"
          >
            <ChevronLeft size={14} />
          </button>
          <span className="text-xs font-semibold text-[#F0F4FF] min-w-[80px] text-center font-mono">
            {monthYearString}
          </span>
          <button
            onClick={handleNextMonth}
            className="p-1 rounded bg-[#132035] border border-[#1E3352] text-[#8BA3C7] hover:text-[#F0F4FF] cursor-pointer"
          >
            <ChevronRight size={14} />
          </button>
        </div>

        {/* Action triggers */}
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setAddModalOpen(true)}
            size="sm"
            className="bg-[#1B4FD8] hover:bg-[#2563EB] text-white text-xs h-8 gap-1.5 cursor-pointer font-semibold"
          >
            <Plus size={13} />
            <span>Add Task</span>
          </Button>

          <Button
            onClick={fetchTasks}
            disabled={isLoading}
            size="sm"
            className="bg-[#132035] hover:bg-[#1A2D47] border border-[#1E3352] text-[#8BA3C7] hover:text-[#F0F4FF] text-xs h-8 gap-1.5 cursor-pointer"
          >
            <RefreshCw size={13} className={`stroke-[1.5] ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Tasks DataTable */}
      <DataTable
        columns={columns}
        data={tasks as unknown as Record<string, unknown>[]}
        loading={isLoading}
        emptyState={{
          icon: ListTodo,
          title: 'No Tasks Found',
          description: `No active tasks are scheduled for the client in ${monthYearString}.`,
          actionLabel: 'Add Task',
          onAction: () => setAddModalOpen(true),
        }}
      />

      {/* ━━━ MODAL: ADD TASK ━━━ */}
      <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
        <DialogContent className="bg-[#0D1829] border border-[#1E3352] text-[#F0F4FF] max-w-md select-none max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-[#F0F4FF]">Add Task Deliverable</DialogTitle>
            <DialogDescription className="text-xs text-[#8BA3C7]">
              Specify tasks due in {monthYearString} to assign to team members.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4 my-2 text-xs">
            <div className="col-span-2 space-y-1">
              <label className="label">Task Deliverable Title *</label>
              <input
                type="text"
                placeholder="e.g. Conduct SEO Audit reports"
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                className="input h-9"
              />
            </div>

            <div className="space-y-1">
              <label className="label">Department</label>
              <select
                value={form.department}
                onChange={(e) => setForm((p) => ({ ...p, department: e.target.value }))}
                className="input h-9"
              >
                {DEPARTMENTS.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="label">Priority</label>
              <select
                value={form.priority}
                onChange={(e) => setForm((p) => ({ ...p, priority: e.target.value as TaskPriority }))}
                className="input h-9"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="label">Task Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm((p) => ({ ...p, status: e.target.value as TaskStatus }))}
                className="input h-9"
              >
                <option value="todo">Todo</option>
                <option value="in_progress">In Progress</option>
                <option value="review">Review</option>
                <option value="done">Completed</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="label">Assign To</label>
              <select
                value={form.assigned_to}
                onChange={(e) => setForm((p) => ({ ...p, assigned_to: e.target.value }))}
                className="input h-9"
              >
                <option value="">Unassigned</option>
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.full_name} ({p.role})
                  </option>
                ))}
              </select>
            </div>

            <div className="col-span-2 space-y-1">
              <label className="label">Due Date</label>
              <input
                type="date"
                value={form.due_date}
                onChange={(e) => setForm((p) => ({ ...p, due_date: e.target.value }))}
                className="input h-9"
              />
            </div>

            <div className="col-span-2 space-y-1">
              <label className="label">Scope / Requirements</label>
              <textarea
                placeholder="Write description here..."
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                rows={2}
                className="input resize-none"
              />
            </div>

            <div className="col-span-2 space-y-1">
              <label className="label">Detailed Instructions for Assigned Member</label>
              <textarea
                placeholder="List SOP parameters, file structures, checklist instructions..."
                value={form.instructions}
                onChange={(e) => setForm((p) => ({ ...p, instructions: e.target.value }))}
                rows={3}
                className="input resize-none"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAddModalOpen(false)}
              className="bg-transparent border-[#1E3352] text-[#8BA3C7] hover:bg-[#132035] hover:text-[#F0F4FF] cursor-pointer"
            >
              Cancel
            </Button>
            <Button onClick={handleAddTask} className="bg-[#1B4FD8] hover:bg-[#2563EB] text-white cursor-pointer">
              Add Deliverable
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
export default DeliverablesTab;
