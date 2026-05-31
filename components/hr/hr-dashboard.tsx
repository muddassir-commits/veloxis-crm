'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Profile, Employee, Task, StipendPayment } from '@/types';
import { toast } from 'sonner';
import { getMonthYear, formatCurrency, cn } from '@/lib/utils';
import {
  Plus,
  RefreshCw,
  MoreHorizontal,
  Key,
  Power,
  Check,
  Award,
  ListTodo,
  ExternalLink,
  Users,
  Search,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { AddEmployeeModal } from './add-employee-modal';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

// Define the shape of profiles joined with employees table
type EmployeeWithProfile = Profile & {
  employees: Employee | Employee[] | null;
};

interface HRDashboardProps {
  employees: EmployeeWithProfile[];
  tasks: Task[];
  stipends: StipendPayment[];
}

export function HRDashboard({ employees, tasks, stipends }: HRDashboardProps) {
  const supabase = createClient();
  const router = useRouter();
  const currentMonthStr = getMonthYear(new Date());

  // Search & Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [localScores, setLocalScores] = useState<Record<string, string>>({});

  // Modals state
  const [addModalOpen, setAddModalOpen] = useState(false);

  // Mark Stipend Paid Dialog
  const [stipendConfirmOpen, setStipendConfirmOpen] = useState(false);
  const [selectedStipend, setSelectedStipend] = useState<{
    employeeId: string;
    name: string;
    amount: number;
  } | null>(null);
  const [isStipendLoading, setIsStipendLoading] = useState(false);

  // Status Action Dialog
  const [statusConfirmOpen, setStatusConfirmOpen] = useState(false);
  const [selectedStatusAction, setSelectedStatusAction] = useState<{
    employeeId: string;
    name: string;
    isActive: boolean;
  } | null>(null);
  const [isStatusLoading, setIsStatusLoading] = useState(false);

  // Password Reset Dialog
  const [passwordConfirmOpen, setPasswordConfirmOpen] = useState(false);
  const [selectedPasswordReset, setSelectedPasswordReset] = useState<{
    employeeId: string;
    name: string;
  } | null>(null);
  const [isPasswordLoading, setIsPasswordLoading] = useState(false);

  // Temp Password display modal after password reset
  const [resetCredentials, setResetCredentials] = useState<{
    name: string;
    email: string;
    pass: string;
  } | null>(null);

  // Menu toggles for employee cards
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Helper to extract nested employee row
  const getEmployeeDetails = (empProfile: EmployeeWithProfile): Employee | null => {
    if (!empProfile.employees) return null;
    return Array.isArray(empProfile.employees) ? empProfile.employees[0] : empProfile.employees;
  };

  // Computations
  const stats = useMemo(() => {
    const total = employees.length;
    const active = employees.filter((e) => e.is_active).length;
    const interns = employees.filter((e) => {
      const details = getEmployeeDetails(e);
      return (details?.designation || '').toLowerCase().includes('intern');
    }).length;

    return { total, active, interns };
  }, [employees]);

  // Filtered employees
  const filteredEmployees = useMemo(() => {
    return employees.filter((e) => {
      const matchName = e.full_name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchEmail = e.email.toLowerCase().includes(searchQuery.toLowerCase());
      const details = getEmployeeDetails(e);
      const matchDes = (details?.designation || '').toLowerCase().includes(searchQuery.toLowerCase());
      return matchName || matchEmail || matchDes;
    });
  }, [employees, searchQuery]);

  // Refresh data helper
  const handleRefresh = () => {
    router.refresh();
  };

  // Mark Stipend Paid Logic
  const handleMarkStipendPaid = async () => {
    if (!selectedStipend) return;
    setIsStipendLoading(true);

    try {
      // 1. Upsert stipend_payments table
      const { error: stipendErr } = await supabase
        .from('stipend_payments')
        .upsert({
          employee_id: selectedStipend.employeeId,
          month_year: currentMonthStr,
          base_amount: selectedStipend.amount,
          bonus_amount: 0,
          total_amount: selectedStipend.amount,
          status: 'paid',
          paid_date: new Date().toISOString().split('T')[0],
          payment_method: 'Bank Transfer',
        }, { onConflict: 'employee_id,month_year' });

      if (stipendErr) throw stipendErr;

      // 2. Log in expenses table
      const { error: expenseErr } = await supabase
        .from('expenses')
        .insert({
          category: 'student_stipend',
          description: `Stipend stipend payment to ${selectedStipend.name}`,
          amount: selectedStipend.amount,
          date: new Date().toISOString().split('T')[0],
          month_year: currentMonthStr,
          notes: 'Auto-logged upon marking stipend paid from HR module.',
        });

      if (expenseErr) {
        console.error('Error logging expense:', expenseErr);
      }

      // 3. Log to activity_log
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      await supabase.from('activity_log').insert({
        user_id: currentUser?.id || null,
        action: 'stipend_paid',
        entity_type: 'stipend',
        title: 'Stipend Marked Paid',
        description: `Stipend of ₹${selectedStipend.amount.toLocaleString('en-IN')} marked paid for ${selectedStipend.name} (${currentMonthStr}).`,
      });

      toast.success(`Stipend marked paid for ${selectedStipend.name}`);
      setStipendConfirmOpen(false);
      setSelectedStipend(null);
      handleRefresh();
    } catch (err) {
      console.error(err);
      toast.error('Failed to mark stipend paid.');
    } finally {
      setIsStipendLoading(false);
    }
  };

  // Password Reset Action
  const handlePasswordReset = async () => {
    if (!selectedPasswordReset) return;
    setIsPasswordLoading(true);

    try {
      const response = await fetch('/api/hr/employee/action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'reset-password',
          employeeId: selectedPasswordReset.employeeId,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to reset password');
      }

      // Open temp password display modal
      const empEmail = employees.find((e) => e.id === selectedPasswordReset.employeeId)?.email || '';
      setResetCredentials({
        name: selectedPasswordReset.name,
        email: empEmail,
        pass: data.tempPassword,
      });

      setPasswordConfirmOpen(false);
      setSelectedPasswordReset(null);
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : 'Failed to reset password');
    } finally {
      setIsPasswordLoading(false);
    }
  };

  // Toggle Employee Status (Activate/Deactivate)
  const handleToggleStatus = async () => {
    if (!selectedStatusAction) return;
    setIsStatusLoading(true);

    try {
      const response = await fetch('/api/hr/employee/action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'toggle-status',
          employeeId: selectedStatusAction.employeeId,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to toggle employee status');
      }

      toast.success(
        `Employee ${selectedStatusAction.name} has been ${data.is_active ? 'activated' : 'deactivated'}.`
      );
      setStatusConfirmOpen(false);
      setSelectedStatusAction(null);
      handleRefresh();
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : 'Failed to update employee status.');
    } finally {
      setIsStatusLoading(false);
    }
  };

  // Quality Score updates (save to DB on blur or enter)
  const handleSaveScore = async (employeeId: string, valStr: string) => {
    const rawVal = parseInt(valStr, 10);
    if (isNaN(rawVal)) return;

    // Constrain score to 1-10
    const score = Math.max(1, Math.min(10, rawVal));

    try {
      const { error } = await supabase
        .from('employees')
        .update({ performance_score: score })
        .eq('id', employeeId);

      if (error) throw error;

      toast.success('Quality Score saved');
      handleRefresh();
    } catch (err) {
      console.error(err);
      toast.error('Failed to update quality score.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Control bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 select-none bg-[#0D1829] border border-[#1E3352] p-4 rounded-lg">
        <div className="flex items-center gap-4 flex-1">
          <div className="flex items-center gap-2 text-sm font-bold text-[#F0F4FF]">
            <Users className="text-[#F97316] h-5 w-5" />
            <span>Team Console</span>
          </div>

          {/* Stats Badges */}
          <div className="flex items-center gap-2 select-none">
            <span className="text-[10px] bg-[#132035] border border-[#1E3352] text-[#8BA3C7] px-2 py-0.5 rounded font-semibold">
              Total: {stats.total}
            </span>
            <span className="text-[10px] bg-[#22C55E15] border border-[#22C55E]/30 text-[#22C55E] px-2 py-0.5 rounded font-semibold">
              Active: {stats.active}
            </span>
            <span className="text-[10px] bg-[#8B5CF615] border border-[#8B5CF6]/30 text-[#8B5CF6] px-2 py-0.5 rounded font-semibold">
              Interns: {stats.interns}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-[#4A6480]" />
            <input
              type="text"
              placeholder="Search team..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-[#060D1A] border border-[#1E3352] text-[#F0F4FF] text-xs pl-8 pr-3 py-2 rounded w-44 placeholder-[#4A6480] focus:outline-none focus:border-[#1B4FD8]"
            />
          </div>

          <Button
            onClick={() => setAddModalOpen(true)}
            className="bg-[#1B4FD8] hover:bg-[#2563EB] text-white text-xs h-9 gap-1.5 font-semibold cursor-pointer"
          >
            <Plus size={15} />
            <span>Add Employee</span>
          </Button>

          <Button
            onClick={handleRefresh}
            variant="outline"
            className="bg-[#132035] hover:bg-[#1A2D47] border border-[#1E3352] text-[#8BA3C7] hover:text-[#F0F4FF] text-xs h-9 gap-1.5 cursor-pointer"
          >
            <RefreshCw size={14} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Grid: Employee Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredEmployees.map((emp) => {
          const details = getEmployeeDetails(emp);
          const designation = details?.designation || 'Digital Marketing Intern';
          const joinDate = details?.join_date ? new Date(details.join_date).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' }) : 'Unknown';
          const skills = details?.skills || [];
          const stipendVal = details?.stipend_amount || 3000;
          const score = details?.performance_score || 10;
          const initialDisplayScore = score > 10 ? Math.round(score / 10) : score;

          // Compute Tasks stats
          const empTasks = tasks.filter((t) => t.assigned_to === emp.id);
          const totalTasks = empTasks.length;
          const doneTasks = empTasks.filter((t) => t.status === 'done' || t.status === 'approved').length;
          const completionPct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

          // Compute Stipend Status
          const stipendPayment = stipends.find((s) => s.employee_id === emp.id);
          const isPaid = stipendPayment?.status === 'paid';

          // Avatar Initials
          const initials = emp.full_name
            .split(' ')
            .map((n) => n[0])
            .slice(0, 2)
            .join('')
            .toUpperCase();

          // Performance Score Color
          let scoreBadgeColor = 'bg-[#EF444415] text-[#EF4444] border-[#EF4444]/20';
          if (initialDisplayScore >= 8) {
            scoreBadgeColor = 'bg-[#22C55E15] text-[#22C55E] border-[#22C55E]/20';
          } else if (initialDisplayScore >= 5) {
            scoreBadgeColor = 'bg-[#F59E0B15] text-[#F59E0B] border-[#F59E0B]/20';
          }

          return (
            <div
              key={emp.id}
              className={cn(
                "bg-[#0D1829] border border-[#1E3352] rounded-[10px] p-[20px] relative transition-all duration-200 hover:border-[#1A2D47] flex flex-col justify-between shadow-sm",
                !emp.is_active && "opacity-60 border-dashed"
              )}
            >
              {/* Top row */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-[#1B4FD8]/10 text-[#1B4FD8] flex items-center justify-center font-bold text-xs select-none">
                    {initials}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#F0F4FF] text-sm">{emp.full_name}</span>
                      {!emp.is_active && (
                        <span className="text-[9px] bg-[#EF444415] text-[#EF4444] px-1.5 py-0.5 rounded font-semibold select-none">
                          Inactive
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-[#8BA3C7] opacity-80">{designation}</span>
                  </div>
                </div>

                {/* Settings dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setActiveMenuId(activeMenuId === emp.id ? null : emp.id)}
                    className="p-1.5 hover:bg-[#132035] rounded-full text-[#8BA3C7] hover:text-[#F0F4FF] transition-all cursor-pointer"
                  >
                    <MoreHorizontal size={16} />
                  </button>

                  {activeMenuId === emp.id && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setActiveMenuId(null)}
                      />
                      <div className="absolute right-0 mt-1 w-40 rounded-md bg-[#0D1829] border border-[#1E3352] shadow-2xl z-20 py-1 text-xs select-none animate-in fade-in slide-in-from-top-1 duration-100">
                        <button
                          onClick={() => {
                            setSelectedPasswordReset({ employeeId: emp.id, name: emp.full_name });
                            setPasswordConfirmOpen(true);
                            setActiveMenuId(null);
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-[#132035] text-[#8BA3C7] hover:text-[#F0F4FF] flex items-center gap-1.5 cursor-pointer"
                        >
                          <Key size={13} />
                          <span>Reset Password</span>
                        </button>
                        <button
                          onClick={() => {
                            setSelectedStatusAction({
                              employeeId: emp.id,
                              name: emp.full_name,
                              isActive: emp.is_active,
                            });
                            setStatusConfirmOpen(true);
                            setActiveMenuId(null);
                          }}
                          className={cn(
                            "w-full text-left px-3 py-2 hover:bg-[#132035] flex items-center gap-1.5 cursor-pointer",
                            emp.is_active ? "text-[#EF4444] hover:text-[#EF4444]" : "text-[#22C55E] hover:text-[#22C55E]"
                          )}
                        >
                          <Power size={13} />
                          <span>{emp.is_active ? 'Deactivate' : 'Activate'}</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Sub headers */}
              <div className="mt-3 flex items-center gap-2 text-[10px] text-[#8BA3C7] opacity-60 select-none">
                <span>Joined {joinDate}</span>
                <span>•</span>
                <div className="flex flex-wrap gap-1">
                  {skills.slice(0, 3).map((skill) => (
                    <span key={skill} className="bg-[#132035] border border-[#1E3352]/50 px-1.5 py-0.2 rounded text-[9px]">
                      {skill}
                    </span>
                  ))}
                  {skills.length > 3 && (
                    <span className="bg-[#132035] px-1.5 py-0.2 rounded text-[9px]">
                      +{skills.length - 3}
                    </span>
                  )}
                </div>
              </div>

              {/* Performance Section */}
              <div className="mt-4 border-t border-[#1E3352]/20 pt-4 space-y-2 select-none">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#8BA3C7] font-semibold flex items-center gap-1">
                    <ListTodo size={13} className="text-[#8BA3C7]" />
                    <span>Tasks This Month</span>
                  </span>
                  <span className="text-[#F0F4FF] font-semibold">{doneTasks} / {totalTasks} done</span>
                </div>
                
                {/* Thin progress bar */}
                <div className="h-1 w-full bg-[#132035] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#22C55E] transition-all duration-300"
                    style={{ width: `${completionPct}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-[#8BA3C7] opacity-65">Completion Rate:</span>
                  <span className={cn(
                    "font-bold px-1.5 py-0.2 rounded",
                    completionPct >= 80 ? "text-[#22C55E] bg-[#22C55E10]" :
                    completionPct >= 55 ? "text-[#F59E0B] bg-[#F59E0B10]" :
                    "text-[#EF4444] bg-[#EF444410]"
                  )}>
                    {completionPct}%
                  </span>
                </div>
              </div>

              {/* Stipend Section */}
              <div className="mt-4 border-t border-[#1E3352]/20 pt-4 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-[#8BA3C7] uppercase font-bold tracking-wider select-none">Monthly Stipend</span>
                  <div className="text-sm font-bold text-[#F0F4FF] font-mono mt-0.5">
                    {formatCurrency(stipendVal)}
                  </div>
                </div>

                <div className="flex items-center gap-2 select-none">
                  {isPaid ? (
                    <span className="inline-flex items-center gap-1 text-xs text-[#22C55E] bg-[#22C55E15] px-2.5 py-1 rounded-md font-semibold">
                      <Check size={12} />
                      <span>Paid</span>
                    </span>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-[#F59E0B] bg-[#F59E0B15] px-2 py-0.8 rounded font-semibold">
                        ⏳ Pending {currentMonthStr}
                      </span>
                      {emp.is_active && (
                        <button
                          onClick={() => {
                            setSelectedStipend({
                              employeeId: emp.id,
                              name: emp.full_name,
                              amount: stipendVal,
                            });
                            setStipendConfirmOpen(true);
                          }}
                          className="bg-[#1B4FD8] hover:bg-[#2563EB] text-white text-[10px] px-2.5 py-1 rounded font-semibold cursor-pointer transition-colors"
                        >
                          Mark Paid
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Footer row */}
              <div className="mt-4 border-t border-[#1E3352]/20 pt-3 flex items-center justify-between select-none">
                <Link
                  href={`/dashboard/deliverables?assignee=${emp.id}`}
                  className="text-[11px] text-[#1B4FD8] hover:text-[#2563EB] font-bold inline-flex items-center gap-1 group"
                >
                  <span>View Tasks</span>
                  <ExternalLink size={10} className="group-hover:translate-x-0.5 transition-transform" />
                </Link>
                
                <span className={cn(
                  "border text-[10px] px-2 py-0.5 rounded font-bold tracking-wide",
                  scoreBadgeColor
                )}>
                  Quality: {initialDisplayScore}/10
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Section: Performance Table */}
      <div className="bg-[#0D1829] border border-[#1E3352] rounded-[10px] p-5 space-y-4">
        <div className="flex items-center justify-between select-none">
          <div className="flex items-center gap-2">
            <Award className="text-[#22C55E] h-4 w-4" />
            <h3 className="text-sm font-bold text-[#F0F4FF]">Performance Leaderboard</h3>
          </div>
          <span className="text-[10px] text-[#8BA3C7] opacity-60 font-semibold">
            Quality scores scale 1-10 (editable inline)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#1E3352]/30 text-[10px] uppercase font-bold text-[#8BA3C7] tracking-wider h-9 select-none">
                <th className="px-4">Employee</th>
                <th className="px-4 text-center">Tasks Assigned</th>
                <th className="px-4 text-center">Tasks Done</th>
                <th className="px-4">Completion %</th>
                <th className="px-4 text-center w-32">Quality Score</th>
                <th className="px-4 text-right">Stipend Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E3352]/10">
              {filteredEmployees.map((emp) => {
                const details = getEmployeeDetails(emp);
                const designation = details?.designation || 'Intern';
                const score = details?.performance_score || 10;
                const displayScore = score > 10 ? Math.round(score / 10) : score;

                // local input text tracking
                const inputVal = localScores[emp.id] !== undefined ? localScores[emp.id] : String(displayScore);

                // calculate stats
                const empTasks = tasks.filter((t) => t.assigned_to === emp.id);
                const totalTasks = empTasks.length;
                const doneTasks = empTasks.filter((t) => t.status === 'done' || t.status === 'approved').length;
                const completionPct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

                const stipendPayment = stipends.find((s) => s.employee_id === emp.id);
                const isPaid = stipendPayment?.status === 'paid';

                return (
                  <tr
                    key={emp.id}
                    className={cn(
                      'group h-12 text-xs hover:bg-[#132035]/30 transition-all',
                      !emp.is_active && 'opacity-65'
                    )}
                  >
                    {/* Employee Profile details */}
                    <td className="px-4 py-2">
                      <div className="flex flex-col">
                        <span className="font-bold text-[#F0F4FF]">{emp.full_name}</span>
                        <span className="text-[10px] text-[#8BA3C7] opacity-75">{designation}</span>
                      </div>
                    </td>

                    {/* Tasks assigned */}
                    <td className="px-4 py-2 text-center text-[#F0F4FF] font-mono">
                      {totalTasks}
                    </td>

                    {/* Tasks done */}
                    <td className="px-4 py-2 text-center text-[#22C55E] font-mono">
                      {doneTasks}
                    </td>

                    {/* Completion bar */}
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-3">
                        <div className="w-16 h-2 bg-[#132035] rounded-full overflow-hidden shrink-0 select-none">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all duration-300",
                              completionPct >= 80 ? "bg-[#22C55E]" :
                              completionPct >= 55 ? "bg-[#F59E0B]" :
                              "bg-[#EF4444]"
                            )}
                            style={{ width: `${completionPct}%` }}
                          />
                        </div>
                        <span className="font-bold font-mono">{completionPct}%</span>
                      </div>
                    </td>

                    {/* Quality score (1-10) edit field */}
                    <td className="px-4 py-2 text-center">
                      <div className="flex items-center justify-center">
                        <input
                          type="number"
                          min="1"
                          max="10"
                          value={inputVal}
                          onChange={(e) => setLocalScores({ ...localScores, [emp.id]: e.target.value })}
                          onBlur={() => handleSaveScore(emp.id, inputVal)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleSaveScore(emp.id, inputVal);
                            }
                          }}
                          className="w-12 h-7 bg-[#060D1A] border border-[#1E3352] text-[#F0F4FF] font-mono font-bold rounded text-center focus:outline-none focus:border-[#22C55E]"
                        />
                        <span className="text-[10px] text-[#8BA3C7] ml-1">/10</span>
                      </div>
                    </td>

                    {/* Stipend Status column */}
                    <td className="px-4 py-2 text-right">
                      {isPaid ? (
                        <span className="text-xs text-[#22C55E] font-semibold">✓ Paid</span>
                      ) : (
                        <span className="text-xs text-[#F59E0B] font-semibold">⏳ Pending</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filteredEmployees.length === 0 && (
                <tr className="h-20 select-none">
                  <td colSpan={6} className="text-center text-xs text-[#8BA3C7]">
                    No employee profiles matched.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Employee Modal */}
      <AddEmployeeModal
        open={addModalOpen}
        onOpenChange={setAddModalOpen}
        onSuccess={handleRefresh}
      />

      {/* Confirm: Mark Stipend Paid */}
      <ConfirmDialog
        open={stipendConfirmOpen}
        onClose={() => {
          setStipendConfirmOpen(false);
          setSelectedStipend(null);
        }}
        onConfirm={handleMarkStipendPaid}
        title="Record Stipend Payment"
        description={
          selectedStipend
            ? `Mark stipend of ₹${selectedStipend.amount.toLocaleString('en-IN')} paid to ${selectedStipend.name} for the month of ${currentMonthStr}? This will also auto-log a stipend expense in the financial ledger.`
            : ''
        }
        confirmLabel="Mark Paid"
        loading={isStipendLoading}
      />

      {/* Confirm: Toggle Status */}
      <ConfirmDialog
        open={statusConfirmOpen}
        onClose={() => {
          setStatusConfirmOpen(false);
          setSelectedStatusAction(null);
        }}
        onConfirm={handleToggleStatus}
        title={selectedStatusAction?.isActive ? 'Deactivate Account' : 'Activate Account'}
        description={
          selectedStatusAction
            ? `Are you sure you want to ${selectedStatusAction.isActive ? 'deactivate' : 'activate'} ${selectedStatusAction.name}? Deactivation restricts CRM access and sets an end date of today on their contract.`
            : ''
        }
        confirmLabel={selectedStatusAction?.isActive ? 'Deactivate' : 'Activate'}
        variant={selectedStatusAction?.isActive ? 'danger' : 'default'}
        loading={isStatusLoading}
      />

      {/* Confirm: Reset Password */}
      <ConfirmDialog
        open={passwordConfirmOpen}
        onClose={() => {
          setPasswordConfirmOpen(false);
          setSelectedPasswordReset(null);
        }}
        onConfirm={handlePasswordReset}
        title="Reset Password"
        description={
          selectedPasswordReset
            ? `Generate a new login password for employee ${selectedPasswordReset.name}? This will instantly revoke their current password.`
            : ''
        }
        confirmLabel="Reset Password"
        loading={isPasswordLoading}
      />

      {/* Password Reset Credentials Dialog */}
      <Dialog open={!!resetCredentials} onOpenChange={(isOpen) => { if (!isOpen) setResetCredentials(null); }}>
        <DialogContent className="bg-[#0D1829] border border-[#1E3352] text-[#F0F4FF] max-w-sm select-none">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#F0F4FF]">Password Reset Successful</DialogTitle>
            <DialogDescription className="text-xs text-[#8BA3C7]">
              Copy the new credentials and share them with the employee securely.
            </DialogDescription>
          </DialogHeader>

          {resetCredentials && (
            <div className="bg-[#132035] border border-[#1E3352] rounded p-4 space-y-3 font-mono text-xs select-all my-2">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-[#8BA3C7] uppercase font-bold tracking-wider">Employee</span>
                <span className="text-[#F0F4FF] font-semibold">{resetCredentials.name}</span>
              </div>
              <div className="flex flex-col gap-1 border-t border-[#1E3352]/50 pt-2">
                <span className="text-[10px] text-[#8BA3C7] uppercase font-bold tracking-wider">Login Email</span>
                <span className="text-[#F0F4FF] font-semibold">{resetCredentials.email}</span>
              </div>
              <div className="flex flex-col gap-1 border-t border-[#1E3352]/50 pt-2">
                <span className="text-[10px] text-[#8BA3C7] uppercase font-bold tracking-wider">New Temporary Password</span>
                <span className="text-[#F97316] font-bold text-sm tracking-widest">{resetCredentials.pass}</span>
              </div>
            </div>
          )}

          <div className="bg-[#F59E0B]/10 border border-[#F59E0B]/20 rounded p-2.5 text-[10px] text-[#F59E0B] leading-relaxed select-none">
            Please ask the employee to change their password once they login.
          </div>

          <DialogFooter className="mt-3">
            <Button
              onClick={() => {
                if (resetCredentials) {
                  navigator.clipboard.writeText(
                    `Email: ${resetCredentials.email}\nNew Password: ${resetCredentials.pass}`
                  );
                  toast.success('Credentials copied!');
                }
              }}
              variant="outline"
              className="bg-transparent border-[#1E3352] text-[#8BA3C7] hover:bg-[#132035] hover:text-[#F0F4FF] text-xs h-9 cursor-pointer"
            >
              Copy Details
            </Button>
            <Button
              onClick={() => setResetCredentials(null)}
              className="bg-[#1B4FD8] hover:bg-[#2563EB] text-white text-xs h-9 cursor-pointer"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
