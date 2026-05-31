'use client';

import React from 'react';
import {
  User,
  Briefcase,
  Calendar,
  Star,
  CheckCircle2,
  Clock,
  IndianRupee,
  Users,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface StipendPayment {
  id: string;
  month_year: string;
  base_amount: number | null;
  total_amount: number | null;
  status: string;
  paid_date: string | null;
  notes: string | null;
}

interface TaskWithClient {
  status: string;
  clients: { name: string } | { name: string }[] | null;
}

interface EmployeeProfilePageProps {
  profile: {
    full_name: string;
    email: string;
    phone: string | null;
    avatar_url: string | null;
    created_at: string;
  };
  employee: {
    designation: string | null;
    skills: string[] | null;
    join_date: string | null;
    stipend_amount: number | null;
    bank_details: Record<string, unknown> | null;
    notes: string | null;
  } | null;
  stipends: StipendPayment[];
  tasksThisMonth: TaskWithClient[];
  clientNames: string[];
}

export function EmployeeProfilePage({
  profile,
  employee,
  stipends,
  tasksThisMonth,
  clientNames,
}: EmployeeProfilePageProps) {
  const initials = profile.full_name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const totalTasks = tasksThisMonth.length;
  const doneTasks = tasksThisMonth.filter((t) => t.status === 'done').length;
  const completionRate = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  const currentMonthYear = new Date().toLocaleString('en-US', { month: 'short', year: 'numeric' });
  const currentStipend = stipends.find((s) => s.month_year === currentMonthYear);

  return (
    <div className="space-y-5 py-3">
      {/* Profile Card */}
      <div className="bg-[#0D1829] border border-[#1E3352] rounded-[12px] p-5">
        <div className="flex items-center gap-4">
          {/* Avatar */}
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#1B4FD8] to-[#7C3AED] flex items-center justify-center text-white font-black text-xl shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-black text-[#F0F4FF]">{profile.full_name}</h2>
            {employee?.designation && (
              <p className="text-xs text-[#8BA3C7] mt-0.5">{employee.designation}</p>
            )}
            <p className="text-[10px] text-[#4A6480] truncate mt-0.5">{profile.email}</p>
          </div>
        </div>

        {/* Details grid */}
        <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
          {profile.phone && (
            <div className="flex items-center gap-2 text-[#8BA3C7]">
              <User size={11} className="text-[#4A6480]" />
              <span>{profile.phone}</span>
            </div>
          )}
          {employee?.join_date && (
            <div className="flex items-center gap-2 text-[#8BA3C7]">
              <Calendar size={11} className="text-[#4A6480]" />
              <span>Joined {formatDate(employee.join_date)}</span>
            </div>
          )}
          {employee?.designation && (
            <div className="flex items-center gap-2 text-[#8BA3C7]">
              <Briefcase size={11} className="text-[#4A6480]" />
              <span>{employee.designation}</span>
            </div>
          )}
          {employee?.stipend_amount && (
            <div className="flex items-center gap-2 text-[#8BA3C7]">
              <IndianRupee size={11} className="text-[#4A6480]" />
              <span>₹{employee.stipend_amount.toLocaleString('en-IN')}/mo</span>
            </div>
          )}
        </div>

        {/* Skills chips */}
        {employee?.skills && employee.skills.length > 0 && (
          <div className="mt-4">
            <p className="text-[10px] uppercase font-bold text-[#4A6480] tracking-wider mb-2 flex items-center gap-1">
              <Star size={10} /> Skills
            </p>
            <div className="flex flex-wrap gap-1.5">
              {employee.skills.map((skill, i) => (
                <span
                  key={i}
                  className="text-[10px] px-2 py-0.5 rounded-full bg-[#1B4FD8]/15 text-[#4D90FE] border border-[#1B4FD8]/20 font-semibold"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* This Month Stats */}
      <div>
        <h3 className="text-sm font-bold text-[#F0F4FF] mb-3 flex items-center gap-2">
          <CheckCircle2 size={14} className="text-[#22C55E]" />
          This Month&apos;s Performance
        </h3>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-[#0D1829] border border-[#1E3352] rounded-[8px] p-3 text-center">
            <div className="text-lg font-black text-[#4D90FE] font-mono">{totalTasks}</div>
            <div className="text-[9px] text-[#4A6480] uppercase tracking-wider font-bold mt-0.5">Total Tasks</div>
          </div>
          <div className="bg-[#0D1829] border border-[#1E3352] rounded-[8px] p-3 text-center">
            <div className="text-lg font-black text-[#22C55E] font-mono">{doneTasks}</div>
            <div className="text-[9px] text-[#4A6480] uppercase tracking-wider font-bold mt-0.5">Completed</div>
          </div>
          <div className="bg-[#0D1829] border border-[#1E3352] rounded-[8px] p-3 text-center">
            <div className={`text-lg font-black font-mono ${completionRate === 100 ? 'text-[#22C55E]' : completionRate >= 70 ? 'text-[#4D90FE]' : 'text-[#F97316]'}`}>
              {completionRate}%
            </div>
            <div className="text-[9px] text-[#4A6480] uppercase tracking-wider font-bold mt-0.5">Rate</div>
          </div>
        </div>

        {/* Progress bar */}
        {totalTasks > 0 && (
          <div className="mt-3 h-1.5 bg-[#132035] rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${completionRate === 100 ? 'bg-[#22C55E]' : 'bg-[#1B4FD8]'}`}
              style={{ width: `${completionRate}%` }}
            />
          </div>
        )}
      </div>

      {/* Current Month Stipend */}
      {currentStipend && (
        <div className="bg-[#0D1829] border border-[#1E3352] rounded-[10px] p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-[7px] flex items-center justify-center ${currentStipend.status === 'paid' ? 'bg-[#22C55E]/20' : 'bg-[#F97316]/20'}`}>
              <IndianRupee size={15} className={currentStipend.status === 'paid' ? 'text-[#22C55E]' : 'text-[#F97316]'} />
            </div>
            <div>
              <p className="text-xs font-bold text-[#F0F4FF]">{currentMonthYear} Stipend</p>
              <p className={`text-[10px] font-semibold ${currentStipend.status === 'paid' ? 'text-[#22C55E]' : 'text-[#F97316]'}`}>
                {currentStipend.status === 'paid' ? `Paid on ${currentStipend.paid_date ? formatDate(currentStipend.paid_date) : '-'}` : 'Pending'}
              </p>
            </div>
          </div>
          <div className="text-sm font-black text-[#F0F4FF] font-mono">
            ₹{(currentStipend.total_amount || currentStipend.base_amount || 0).toLocaleString('en-IN')}
          </div>
        </div>
      )}

      {/* Stipend History */}
      <div>
        <h3 className="text-sm font-bold text-[#F0F4FF] mb-3 flex items-center gap-2">
          <Clock size={14} className="text-[#4D90FE]" />
          Stipend History
        </h3>
        {stipends.length === 0 ? (
          <div className="bg-[#0D1829] border border-[#1E3352] border-dashed rounded-[10px] p-6 text-center">
            <p className="text-xs text-[#4A6480]">No stipend history yet.</p>
          </div>
        ) : (
          <div className="bg-[#0D1829] border border-[#1E3352] rounded-[10px] overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[#1E3352] bg-[#132035]/30 text-[9px] font-bold text-[#4A6480] uppercase tracking-wider">
                  <th className="p-3">Month</th>
                  <th className="p-3">Amount</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Paid Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E3352]/30">
                {stipends.map((s) => (
                  <tr key={s.id} className="text-xs text-[#8BA3C7]">
                    <td className="p-3 font-semibold text-[#F0F4FF]">{s.month_year}</td>
                    <td className="p-3 font-mono font-bold text-[#F0F4FF]">₹{(s.total_amount || s.base_amount || 0).toLocaleString('en-IN')}</td>
                    <td className="p-3">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase ${
                        s.status === 'paid'
                          ? 'bg-[#22C55E]/15 text-[#22C55E]'
                          : 'bg-[#F97316]/15 text-[#F97316]'
                      }`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-[10px]">
                      {s.paid_date ? formatDate(s.paid_date) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* My Clients */}
      {clientNames.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-[#F0F4FF] mb-3 flex items-center gap-2">
            <Users size={14} className="text-[#A78BFA]" />
            My Clients This Month
          </h3>
          <div className="flex flex-wrap gap-2">
            {clientNames.map((name, i) => (
              <span
                key={i}
                className="text-[11px] px-3 py-1.5 rounded-full bg-[#0D1829] border border-[#1E3352] text-[#8BA3C7] font-semibold"
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
