'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Client, Task, TaskStatus, Profile } from '@/types';
import { toast } from 'sonner';
import { formatDate, getMonthYear, cn } from '@/lib/utils';
import {
  Plus,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  User,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Check,
  MoreHorizontal,
  Edit3,
  Trash2,
  CheckSquare,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatCard } from '@/components/shared/stat-card';
import { EmptyState } from '@/components/shared/empty-state';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { AddTaskModal } from '@/components/deliverables/add-task-modal';

// Custom priority badge helper
const PriorityBadge = ({ priority }: { priority: string }) => {
  let badgeStyle = "bg-[#1E335215] text-[#64748B]";
  if (priority === 'high' || priority === 'urgent') {
    badgeStyle = "bg-[#EF444415] text-[#EF4444]";
  } else if (priority === 'medium') {
    badgeStyle = "bg-[#F59E0B15] text-[#F59E0B]";
  } else if (priority === 'low') {
    badgeStyle = "bg-[#22C55E15] text-[#22C55E]";
  }
  return (
    <span className={cn("inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider select-none shrink-0 border border-transparent", badgeStyle)}>
      {priority}
    </span>
  );
};

// Custom confetti animation particles
function Confetti() {
  const [particles, setParticles] = useState<{ id: number; left: string; top: string; size: string; color: string; delay: string; duration: string; rotate: string }[]>([]);

  useEffect(() => {
    const colors = ['#22C55E', '#4ADE80', '#86EFAC', '#15803D', '#166534'];
    const newParticles = Array.from({ length: 50 }).map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 20 + 80}%`,
      size: `${Math.random() * 8 + 4}px`,
      color: colors[Math.floor(Math.random() * colors.length)],
      delay: `${Math.random() * 0.4}s`,
      duration: `${Math.random() * 1.5 + 1.2}s`,
      rotate: `${Math.random() * 360}deg`,
    }));
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setParticles(newParticles);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-50">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-sm animate-confetti-burst"
          style={{
            left: p.left,
            top: p.top,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            animationDelay: p.delay,
            animationDuration: p.duration,
            transform: `rotate(${p.rotate})`,
            opacity: 0.9,
          }}
        />
      ))}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes confettiBurst {
          0% {
            transform: translateY(0) rotate(0deg) scale(1);
            opacity: 1;
          }
          50% {
            opacity: 0.9;
          }
          100% {
            transform: translateY(-250px) rotate(720deg) scale(0.5);
            opacity: 0;
          }
        }
        .animate-confetti-burst {
          animation: confettiBurst cubic-bezier(0.1, 0.8, 0.3, 1) forwards;
        }
      `}} />
    </div>
  );
}

interface DeliverablesDashboardProps {
  initialClients: Client[];
  profiles: Profile[];
}

export function DeliverablesDashboard({ initialClients, profiles }: DeliverablesDashboardProps) {
  const supabase = createClient();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<{ id: string } | null>(null);

  // Month-Year state synchronized with URL parameter ?month=Jun+2026
  const monthYearString = useMemo(() => {
    const monthParam = searchParams.get('month');
    if (monthParam) return monthParam;
    return getMonthYear(new Date());
  }, [searchParams]);

  // Expanded groups state
  const [expandedClients, setExpandedClients] = useState<Record<string, boolean>>({});

  // Confetti trigger state
  const [confettiClientId, setConfettiClientId] = useState<string | null>(null);

  // Active menu dropdown task ID
  const [activeMenuTaskId, setActiveMenuTaskId] = useState<string | null>(null);

  // Modal / Dialog States
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [preFilledClientId, setPreFilledClientId] = useState<string | null>(null);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Helper to parse Month Year back to Date object for navigation
  const parseMonthYear = (str: string): Date => {
    const parts = str.split(' ');
    if (parts.length === 2) {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const mIdx = months.indexOf(parts[0]);
      const year = parseInt(parts[1], 10);
      if (mIdx !== -1 && !isNaN(year)) {
        return new Date(year, mIdx, 1);
      }
    }
    return new Date();
  };

  // Fetch current user on mount for activity logging
  useEffect(() => {
    async function fetchUser() {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
    }
    fetchUser();
  }, [supabase]);

  // Fetch tasks for the current month and clients
  const fetchTasks = useCallback(async () => {
    setIsLoading(true);
    try {
      const clientIds = initialClients.map((c) => c.id);
      if (clientIds.length === 0) {
        setTasks([]);
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('month_year', monthYearString)
        .in('client_id', clientIds)
        .order('due_date', { ascending: true });

      if (error) throw error;
      setTasks(data || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load tasks.');
    } finally {
      setIsLoading(false);
    }
  }, [monthYearString, initialClients, supabase]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchTasks();
  }, [fetchTasks]);

  // Month navigation updates URL param
  const handlePrevMonth = () => {
    const date = parseMonthYear(monthYearString);
    date.setMonth(date.getMonth() - 1);
    const nextMonthStr = getMonthYear(date);
    const params = new URLSearchParams(searchParams.toString());
    params.set('month', nextMonthStr);
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleNextMonth = () => {
    const date = parseMonthYear(monthYearString);
    date.setMonth(date.getMonth() + 1);
    const nextMonthStr = getMonthYear(date);
    const params = new URLSearchParams(searchParams.toString());
    params.set('month', nextMonthStr);
    router.push(`${pathname}?${params.toString()}`);
  };

  const toggleClientExpand = (clientId: string) => {
    setExpandedClients((prev) => ({
      ...prev,
      [clientId]: !prev[clientId],
    }));
  };

  // Handle task complete/incomplete checkbox with Optimistic Updates
  const handleToggleComplete = async (task: Task, isChecked: boolean) => {
    const originalStatus = task.status;
    const originalCompletedAt = task.completed_at;

    const newStatus: TaskStatus = isChecked ? 'done' : 'todo';
    const completedAt = isChecked ? new Date().toISOString() : null;

    // 1. Optimistic Update (instant UI response)
    setTasks((prev) =>
      prev.map((t) =>
        t.id === task.id ? { ...t, status: newStatus, completed_at: completedAt } : t
      )
    );

    // If client now has all tasks complete, trigger confetti!
    if (isChecked) {
      const clientTasks = tasks.filter((t) => t.client_id === task.client_id);
      const otherDoneCount = clientTasks.filter((t) => t.id !== task.id && t.status === 'done').length;
      const newDoneCount = otherDoneCount + 1;
      const totalTasksCount = clientTasks.length;

      if (newDoneCount === totalTasksCount && totalTasksCount > 0) {
        setConfettiClientId(task.client_id);
        setTimeout(() => {
          setConfettiClientId(null);
        }, 4000);
      }
    }

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

      // Find client name for activity log
      const client = initialClients.find((c) => c.id === task.client_id);
      const clientName = client ? client.name : 'Unknown Client';

      if (isChecked) {
        // Log to activity_log
        await supabase.from('activity_log').insert({
          user_id: currentUser?.id || null,
          client_id: task.client_id,
          action: 'UPDATE',
          entity_type: 'task',
          entity_id: task.id,
          title: 'Task Completed',
          description: `Task '${task.title}' completed for ${clientName}`,
        });

        // Insert notification
        await supabase.from('notifications').insert({
          user_id: currentUser?.id || null,
          type: 'task_done',
          title: 'Task Done',
          message: `Task done: ${task.title}`,
          is_read: false,
          priority: 'normal',
        });
      }

      toast.success(isChecked ? 'Task marked as done.' : 'Task marked as todo.');
      fetchTasks();
    } catch (err) {
      console.error(err);
      toast.error('Failed to update task.');
      // Revert optimistic update on error
      setTasks((prev) =>
        prev.map((t) =>
          t.id === task.id ? { ...t, status: originalStatus, completed_at: originalCompletedAt } : t
        )
      );
    }
  };

  // Handle task deletion
  const handleDeleteConfirm = async () => {
    if (!taskToDelete) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase.from('tasks').delete().eq('id', taskToDelete.id);
      if (error) throw error;

      toast.success('Task deleted successfully.');
      setDeleteDialogOpen(false);
      setTaskToDelete(null);
      fetchTasks();
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete task.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Computations
  const todayStr = new Date().toISOString().split('T')[0];
  const totalCount = tasks.length;
  const doneCount = tasks.filter((t) => t.status === 'done').length;
  const inProgressCount = tasks.filter((t) => t.status === 'in_progress' || t.status === 'review' || t.status === 'todo').length;
  const overdueCount = tasks.filter((t) => t.status !== 'done' && t.due_date && t.due_date < todayStr).length;

  // Sorting clients: incomplete tasks first
  const sortedClients = useMemo(() => {
    return [...initialClients].sort((a, b) => {
      const aTasks = tasks.filter((t) => t.client_id === a.id);
      const bTasks = tasks.filter((t) => t.client_id === b.id);

      const aIncomplete = aTasks.filter((t) => t.status !== 'done').length;
      const bIncomplete = bTasks.filter((t) => t.status !== 'done').length;

      // Sort descending by number of incomplete tasks
      if (aIncomplete !== bIncomplete) {
        return bIncomplete - aIncomplete;
      }

      // Secondary sort: client name
      return a.name.localeCompare(b.name);
    });
  }, [initialClients, tasks]);

  // Extract initials for assigned profile
  const getInitials = (name: string) => {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) {
      const p = parts[0];
      if (p.toLowerCase().startsWith('student') && p.length > 7) {
        const num = p.substring(7).trim();
        return 'S' + (num || '1');
      }
      return p.substring(0, 2).toUpperCase();
    }
    if (parts[0].toLowerCase() === 'student' && parts[1]) {
      return 'S' + parts[1].substring(0, 1).toUpperCase();
    }
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  // Avatar color generator based on initials
  const getAvatarColor = (initials: string) => {
    const colors: Record<string, string> = {
      'MA': 'bg-[#1B4FD8] text-white border-[#1B4FD8]', // blue
      'S1': 'bg-[#F97316] text-white border-[#F97316]', // orange
      'S2': 'bg-[#8B5CF6] text-white border-[#8B5CF6]', // purple
    };
    return colors[initials] || 'bg-[#0D1829] text-[#8BA3C7] border-[#1E3352]';
  };

  return (
    <div className="space-y-6">
      {/* Month & Control bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 select-none bg-[#0D1829] border border-[#1E3352] p-4 rounded-lg">
        <div className="flex items-center gap-3">
          <button
            onClick={handlePrevMonth}
            className="p-1.5 rounded bg-[#132035] border border-[#1E3352] text-[#8BA3C7] hover:text-[#F0F4FF] hover:bg-[#1E3352] cursor-pointer transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-semibold text-[#F0F4FF] min-w-[110px] text-center font-mono">
            {monthYearString}
          </span>
          <button
            onClick={handleNextMonth}
            className="p-1.5 rounded bg-[#132035] border border-[#1E3352] text-[#8BA3C7] hover:text-[#F0F4FF] hover:bg-[#1E3352] cursor-pointer transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={() => {
              setEditingTask(null);
              setPreFilledClientId(null);
              setTaskModalOpen(true);
            }}
            className="bg-[#1B4FD8] hover:bg-[#2563EB] text-white text-xs h-9 gap-1.5 font-semibold cursor-pointer"
          >
            <Plus size={15} />
            <span>Add Task</span>
          </Button>

          <Button
            onClick={fetchTasks}
            disabled={isLoading}
            variant="outline"
            className="bg-[#132035] hover:bg-[#1A2D47] border border-[#1E3352] text-[#8BA3C7] hover:text-[#F0F4FF] text-xs h-9 gap-1.5 cursor-pointer"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Deliverables" value={totalCount} loading={isLoading} icon={CheckSquare} />
        <StatCard
          title="Done"
          value={doneCount}
          loading={isLoading}
          icon={CheckCircle2}
          valueClassName="text-[#22C55E]"
        />
        <StatCard
          title="In Progress"
          value={inProgressCount}
          loading={isLoading}
          icon={Clock}
          valueClassName="text-[#F59E0B]"
        />
        <StatCard
          title="Overdue Tasks"
          value={overdueCount}
          loading={isLoading}
          icon={AlertTriangle}
          valueClassName={overdueCount > 0 ? 'text-[#EF4444]' : 'text-[#8BA3C7]'}
        />
      </div>

      {/* Main Content Grouped by client */}
      {isLoading ? (
        <div className="space-y-6">
          {[1, 2, 3].map((idx) => (
            <div key={idx} className="bg-[#0D1829] border border-[#1E3352] rounded-[10px] p-6 space-y-4 animate-pulse">
              <div className="h-6 w-48 bg-[#132035] rounded" />
              <div className="h-2 w-full bg-[#132035] rounded" />
              <div className="space-y-2 pt-2">
                {[1, 2].map((i) => (
                  <div key={i} className="h-10 bg-[#132035] rounded" />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : totalCount === 0 ? (
        <EmptyState
          icon={CheckSquare}
          title={`No tasks for ${monthYearString}`}
          description="Add tasks or go to a client to create tasks"
          actionLabel="+ Add Task"
          onAction={() => {
            setEditingTask(null);
            setPreFilledClientId(null);
            setTaskModalOpen(true);
          }}
        />
      ) : (
        <div className="space-y-6">
          {sortedClients.map((client) => {
            const clientTasks = tasks.filter((t) => t.client_id === client.id);
            const cTotal = clientTasks.length;
            const cDone = clientTasks.filter((t) => t.status === 'done').length;
            const progressPct = cTotal > 0 ? Math.round((cDone / cTotal) * 100) : 0;
            const isAllComplete = cTotal > 0 && cDone === cTotal;

            // Default: minimized if all complete / no tasks
            const isExpanded = expandedClients[client.id] ?? !isAllComplete;

            return (
              <div
                key={client.id}
                className="bg-[#0D1829] border border-[#1E3352] rounded-[10px] overflow-hidden transition-all duration-200 relative"
              >
                {/* Confetti container (local to client group) */}
                {confettiClientId === client.id && <Confetti />}

                {/* Client Group Header */}
                <div
                  onClick={() => toggleClientExpand(client.id)}
                  className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-[#132035]/40 select-none border-b border-[#1E3352]/30"
                >
                  <div className="flex items-center gap-3">
                    <button className="text-[#8BA3C7] p-0.5 hover:text-[#F0F4FF] transition-transform">
                      <ChevronDown
                        size={18}
                        className={cn('transition-transform duration-200', !isExpanded && '-rotate-90')}
                      />
                    </button>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-[15px] font-bold text-[#F0F4FF]">{client.name}</h3>
                      {isAllComplete && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-[#22C55E15] text-[#22C55E] px-2 py-0.5 rounded-full uppercase border border-[#22C55E]/10">
                          <Check size={10} className="stroke-[2.5]" />
                          ✓ All Complete
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Progress details */}
                  <div className="flex items-center gap-4 min-w-[240px]">
                    <div className="flex-1 space-y-1">
                      <div className="flex justify-between text-[11px] font-mono text-[#8BA3C7]">
                        <span className="text-[#8BA3C7]/60">Progress</span>
                        <span>
                          {cDone}/{cTotal} complete
                        </span>
                      </div>
                      <div className="h-1 w-full bg-[#132035] rounded-full overflow-hidden border border-[#1E3352]/30">
                        <div
                          style={{ width: `${progressPct}%` }}
                          className="h-full rounded-full transition-all duration-300 bg-[#22C55E]"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Task rows inside group */}
                {isExpanded && (
                  <div className="bg-[#0A111F]/30 divide-y divide-[#1E3352]/20">
                    {clientTasks.length > 0 ? (
                      clientTasks.map((task) => {
                        const isDone = task.status === 'done';
                        const isOverdue = task.due_date && task.due_date < todayStr && !isDone;
                        const assigneeProfile = profiles.find((p) => p.id === task.assigned_to);
                        const initials = assigneeProfile ? getInitials(assigneeProfile.full_name) : '';
                        const assigneeName = assigneeProfile ? assigneeProfile.full_name : 'Unassigned';

                        return (
                          <div
                            key={task.id}
                            className="group flex items-center justify-between gap-4 px-4 h-12 hover:bg-[#132035] transition-all duration-150 relative"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              {/* Checkbox */}
                              <input
                                type="checkbox"
                                checked={isDone}
                                onChange={(e) => handleToggleComplete(task, e.target.checked)}
                                className="rounded border-[#1E3352] bg-[#060D1A] text-[#1B4FD8] focus:ring-0 cursor-pointer h-4 w-4 shrink-0 transition-colors"
                              />

                              {/* Task Title */}
                              <span
                                className={cn(
                                  'text-xs font-semibold text-[#F0F4FF] transition-all truncate max-w-xs sm:max-w-md md:max-w-lg',
                                  isDone && 'opacity-40 line-through text-[#8BA3C7]'
                                )}
                              >
                                {task.title}
                              </span>
                            </div>

                            {/* Task Attributes & Action menu */}
                            <div className="flex items-center gap-3 shrink-0">
                              {task.department && (
                                <span className="text-[9px] bg-[#132035] border border-[#1E3352] text-[#8BA3C7] px-1.5 py-0.5 rounded font-mono uppercase font-bold tracking-wider select-none">
                                  {task.department}
                                </span>
                              )}

                              <PriorityBadge priority={task.priority} />

                              {task.due_date ? (
                                <span
                                  className={cn(
                                    'font-mono text-[10px] select-none',
                                    isOverdue ? 'text-[#EF4444] font-semibold' : 'text-[#8BA3C7]',
                                    isDone && 'text-[#4A6480]'
                                  )}
                                >
                                  {formatDate(task.due_date)}
                                </span>
                              ) : (
                                <span className="text-[#4A6480] text-[10px] font-mono">-</span>
                              )}

                              {initials ? (
                                <div
                                  title={assigneeName}
                                  className={cn(
                                    'h-6 w-6 rounded-full flex items-center justify-center font-bold text-[9px] select-none border shrink-0 uppercase',
                                    getAvatarColor(initials)
                                  )}
                                >
                                  {initials}
                                </div>
                              ) : (
                                <div
                                  title="Unassigned"
                                  className="h-6 w-6 rounded-full border border-dashed border-[#1E3352] flex items-center justify-center text-[#4A6480] shrink-0"
                                >
                                  <User size={11} />
                                </div>
                              )}

                              {/* Actions Dropdown on Row Hover */}
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center relative z-10">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveMenuTaskId(activeMenuTaskId === task.id ? null : task.id);
                                  }}
                                  className="p-1 rounded hover:bg-[#1E3352] text-[#8BA3C7] hover:text-[#F0F4FF] transition-colors cursor-pointer"
                                >
                                  <MoreHorizontal size={14} />
                                </button>
                                {activeMenuTaskId === task.id && (
                                  <>
                                    <div className="fixed inset-0 z-20 cursor-default" onClick={() => setActiveMenuTaskId(null)} />
                                    <div className="absolute right-0 top-6 bg-[#0D1829] border border-[#1E3352] rounded-md shadow-2xl py-1 w-24 z-30 text-[10px]">
                                      <button
                                        onClick={() => {
                                          setActiveMenuTaskId(null);
                                          setEditingTask(task);
                                          setTaskModalOpen(true);
                                        }}
                                        className="w-full text-left px-3 py-1.5 hover:bg-[#132035] text-[#F0F4FF] transition-colors flex items-center gap-1.5 cursor-pointer"
                                      >
                                        <Edit3 size={11} />
                                        <span>Edit</span>
                                      </button>
                                      <button
                                        onClick={() => {
                                          setActiveMenuTaskId(null);
                                          setTaskToDelete(task);
                                          setDeleteDialogOpen(true);
                                        }}
                                        className="w-full text-left px-3 py-1.5 hover:bg-[#132035] text-[#EF4444] hover:bg-[#EF444410] transition-colors flex items-center gap-1.5 cursor-pointer"
                                      >
                                        <Trash2 size={11} />
                                        <span>Delete</span>
                                      </button>
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="p-4 text-center text-xs text-[#8BA3C7]/60">
                        No tasks scheduled for this client in {monthYearString}.
                      </div>
                    )}

                    {/* Small link to add task for client */}
                    <div className="p-3 bg-[#0A111F]/10 flex justify-start">
                      <button
                        onClick={() => {
                          setEditingTask(null);
                          setPreFilledClientId(client.id);
                          setTaskModalOpen(true);
                        }}
                        className="text-xs font-semibold text-[#1B4FD8] hover:text-[#2563EB] flex items-center gap-1 hover:underline cursor-pointer"
                      >
                        <Plus size={13} />
                        <span>Add task for {client.name}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ━━━ MODAL: ADD/EDIT TASK ━━━ */}
      <AddTaskModal
        open={taskModalOpen}
        onOpenChange={setTaskModalOpen}
        clients={initialClients}
        profiles={profiles}
        selectedMonth={monthYearString}
        taskToEdit={editingTask}
        preFilledClientId={preFilledClientId}
        onSuccess={fetchTasks}
      />

      {/* ━━━ DIALOG: CONFIRM DELETE ━━━ */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
          setTaskToDelete(null);
        }}
        onConfirm={handleDeleteConfirm}
        title="Delete Task Deliverable"
        description={`Are you sure you want to delete the task "${taskToDelete?.title}"? This action is permanent.`}
        confirmLabel="Delete"
        loading={isDeleting}
        variant="danger"
      />
    </div>
  );
}
export default DeliverablesDashboard;
