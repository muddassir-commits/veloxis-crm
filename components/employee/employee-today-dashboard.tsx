'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowRight,
  Calendar,
  CheckSquare,
  Loader2,
  Play,
  Send,
} from 'lucide-react';
import { toast } from 'sonner';
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
  clients: { name: string; is_agency_self?: boolean } | null;
}

interface EmployeeTodayDashboardProps {
  profile: {
    full_name: string;
    email: string;
  };
  todayTasks: TaskWithClient[];
  upcomingTasks: TaskWithClient[];
  stats: {
    doneToday: number;
    doneWeek: number;
    pending: number;
    overdue: number;
  };
}

const PRIORITY_COLORS: Record<string, string> = {
  urgent: 'bg-[#EF444420] text-[#EF4444] border border-[#EF444430]',
  high: 'bg-[#F9731620] text-[#F97316] border border-[#F9731630]',
  medium: 'bg-[#EAB30820] text-[#EAB308] border border-[#EAB30830]',
  low: 'bg-[#22C55E20] text-[#22C55E] border border-[#22C55E30]',
};

const STATUS_COLORS: Record<string, string> = {
  todo: 'bg-[#4A648020] text-[#8BA3C7]',
  in_progress: 'bg-[#1B4FD820] text-[#4D90FE]',
  review: 'bg-[#A78BFA20] text-[#A78BFA]',
  done: 'bg-[#22C55E20] text-[#22C55E]',
};

export function EmployeeTodayDashboard({
  profile,
  todayTasks,
  upcomingTasks,
  stats,
}: EmployeeTodayDashboardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const todayFormatted = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const handleMarkInProgress = async (taskId: string) => {
    setUpdatingTaskId(taskId);
    try {
      const res = await fetch(`/api/tasks/${taskId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'in_progress' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update');
      toast.success('Task marked as In Progress');
      startTransition(() => router.refresh());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setUpdatingTaskId(null);
    }
  };

  return (
    <div className="space-y-5 py-3">
      {/* Greeting */}
      <div>
        <h1 className="text-xl font-bold text-[#F0F4FF]">
          {greeting()},{' '}
          <span className="text-[#1B4FD8]">{profile.full_name.split(' ')[0]}</span>! 👋
        </h1>
        <p className="text-xs text-[#4A6480] mt-0.5">{todayFormatted}</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-[#0D1829] border border-[#1E3352] rounded-[8px] p-3 text-center">
          <div className="text-lg font-black text-[#22C55E] font-mono">{stats.doneToday}</div>
          <div className="text-[9px] text-[#4A6480] uppercase tracking-wider font-bold mt-0.5">Done Today</div>
        </div>
        <div className="bg-[#0D1829] border border-[#1E3352] rounded-[8px] p-3 text-center">
          <div className="text-lg font-black text-[#4D90FE] font-mono">{stats.doneWeek}</div>
          <div className="text-[9px] text-[#4A6480] uppercase tracking-wider font-bold mt-0.5">This Week</div>
        </div>
        <div className="bg-[#0D1829] border border-[#1E3352] rounded-[8px] p-3 text-center">
          <div className="text-lg font-black text-[#F0F4FF] font-mono">{stats.pending}</div>
          <div className="text-[9px] text-[#4A6480] uppercase tracking-wider font-bold mt-0.5">Pending</div>
        </div>
        <div className="bg-[#0D1829] border border-[#1E3352] rounded-[8px] p-3 text-center">
          <div className={`text-lg font-black font-mono ${stats.overdue > 0 ? 'text-[#EF4444]' : 'text-[#F0F4FF]'}`}>
            {stats.overdue}
          </div>
          <div className="text-[9px] text-[#4A6480] uppercase tracking-wider font-bold mt-0.5">Overdue</div>
        </div>
      </div>

      {/* Due Today */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-[#F0F4FF] flex items-center gap-2">
            <Clock size={14} className="text-[#F97316]" />
            Due Today
            {todayTasks.length > 0 && (
              <span className="text-[10px] bg-[#F97316]/20 text-[#F97316] border border-[#F97316]/30 px-1.5 py-0.5 rounded-full font-bold">
                {todayTasks.length}
              </span>
            )}
          </h2>
          <Link href="/team/tasks" className="text-[10px] text-[#4D90FE] hover:text-[#60A5FA] font-semibold flex items-center gap-1">
            View All <ArrowRight size={10} />
          </Link>
        </div>

        {todayTasks.length === 0 ? (
          <div className="bg-[#0D1829] border border-[#1E3352] border-dashed rounded-[10px] p-8 text-center">
            <CheckCircle2 size={24} className="text-[#22C55E] mx-auto mb-2" />
            <p className="text-sm font-semibold text-[#F0F4FF]">All caught up! 🎉</p>
            <p className="text-xs text-[#4A6480] mt-1">No tasks due today. Great work!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {todayTasks.map((task) => (
              <div
                key={task.id}
                className="bg-[#0D1829] border border-[#1E3352] rounded-[10px] p-4 hover:border-[#1A2D47] transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      {task.clients && (
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${task.clients.is_agency_self ? 'bg-[#F97316]/20 text-[#F97316]' : 'bg-[#1B4FD8]/20 text-[#4D90FE]'}`}>
                          {task.clients.name}
                        </span>
                      )}
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase ${PRIORITY_COLORS[task.priority] || ''}`}>
                        {task.priority}
                      </span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold ${STATUS_COLORS[task.status] || ''}`}>
                        {task.status.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-[#F0F4FF] leading-snug">{task.title}</p>
                    {task.description && (
                      <p className="text-[10px] text-[#8BA3C7] mt-0.5 line-clamp-1 italic">{task.description}</p>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {task.status === 'todo' && (
                      <button
                        onClick={() => handleMarkInProgress(task.id)}
                        disabled={updatingTaskId === task.id || isPending}
                        className="flex items-center gap-1 px-2 py-1 rounded text-[10px] bg-[#1B4FD8]/20 text-[#4D90FE] hover:bg-[#1B4FD8]/40 transition-colors font-semibold cursor-pointer disabled:opacity-50"
                      >
                        {updatingTaskId === task.id ? <Loader2 size={10} className="animate-spin" /> : <Play size={10} />}
                        Start
                      </button>
                    )}
                    <Link
                      href={`/team/tasks?submit=${task.id}`}
                      className="flex items-center gap-1 px-2 py-1 rounded text-[10px] bg-[#22C55E]/15 text-[#22C55E] hover:bg-[#22C55E]/30 transition-colors font-semibold"
                    >
                      <Send size={10} />
                      Submit
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Coming Up This Week */}
      {upcomingTasks.length > 0 && (
        <div>
          <h2 className="text-sm font-bold text-[#F0F4FF] flex items-center gap-2 mb-3">
            <Calendar size={14} className="text-[#4D90FE]" />
            Coming Up This Week
          </h2>
          <div className="space-y-2">
            {upcomingTasks.slice(0, 5).map((task) => (
              <div
                key={task.id}
                className="bg-[#0D1829] border border-[#1E3352] rounded-[8px] px-4 py-3 flex items-center justify-between gap-3 hover:border-[#1A2D47] transition-all"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {task.clients && (
                      <span className="text-[9px] text-[#8BA3C7] font-semibold">{task.clients.name}</span>
                    )}
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${PRIORITY_COLORS[task.priority] || ''}`}>
                      {task.priority}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-[#F0F4FF] truncate">{task.title}</p>
                </div>
                <div className="text-[10px] font-mono text-[#8BA3C7] shrink-0">
                  {task.due_date ? formatDate(task.due_date) : '-'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick links */}
      <div className="grid grid-cols-2 gap-3 pt-2">
        <Link
          href="/team/tasks"
          className="bg-[#0D1829] border border-[#1E3352] rounded-[10px] p-4 flex items-center gap-3 hover:border-[#1B4FD8]/40 hover:bg-[#132035]/40 transition-all group"
        >
          <div className="w-9 h-9 rounded-[7px] bg-[#1B4FD8]/20 flex items-center justify-center">
            <CheckSquare size={16} className="text-[#4D90FE] group-hover:scale-110 transition-transform" />
          </div>
          <div>
            <p className="text-xs font-bold text-[#F0F4FF]">All Tasks</p>
            <p className="text-[10px] text-[#4A6480]">View your full list</p>
          </div>
        </Link>
        <Link
          href="/team/profile"
          className="bg-[#0D1829] border border-[#1E3352] rounded-[10px] p-4 flex items-center gap-3 hover:border-[#1B4FD8]/40 hover:bg-[#132035]/40 transition-all group"
        >
          <div className="w-9 h-9 rounded-[7px] bg-[#A78BFA]/20 flex items-center justify-center">
            <AlertTriangle size={16} className="text-[#A78BFA] group-hover:scale-110 transition-transform" />
          </div>
          <div>
            <p className="text-xs font-bold text-[#F0F4FF]">My Profile</p>
            <p className="text-[10px] text-[#4A6480]">Stipend + details</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
