'use client';

/* eslint-disable react-hooks/set-state-in-effect */

import React, { useState, useMemo } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Client, Invoice, Expense, StipendPayment, Profile, Employee } from '@/types';
import { toast } from 'sonner';
import { formatCurrency, formatDate, getMonthYear, cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import {
  Plus,
  RefreshCw,
  MoreHorizontal,
  Edit3,
  Trash2,
  ChevronDown,
  FileText,
  DollarSign,
  Briefcase,
  AlertTriangle,
  TrendingUp,
  Receipt,
  UserCheck,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatCard } from '@/components/shared/stat-card';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { StatusBadge } from '@/components/shared/status-badge';
import { GenerateInvoiceModal } from './generate-invoice-modal';
import { MarkPaidModal } from './mark-paid-modal';
import { LogExpenseModal } from './log-expense-modal';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ResponsiveContainer,
} from 'recharts';

interface FinanceDashboardProps {
  clients: Client[];
  invoices: Invoice[];
  invoicesCount: number;
  expenses: Expense[];
  stipendPayments: StipendPayment[];
  employees: Employee[];
  profiles: Profile[];
  stats: {
    mrr: number;
    collectedThisMonth: number;
    collectedChangePct: number;
    outstanding: number;
    overdue: number;
  };
}

const CATEGORY_LABELS: Record<string, string> = {
  student_stipend: 'Student Stipend',
  tools: 'Tools / Subscriptions',
  travel: 'Travel & Conveyance',
  hosting: 'Hosting & Server',
  misc: 'Miscellaneous',
};

export function FinanceDashboard({
  clients,
  invoices,
  invoicesCount,
  expenses,
  stipendPayments,
  employees,
  profiles,
  stats,
}: FinanceDashboardProps) {
  const supabase = createClient();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // URL query params
  const currentPage = parseInt(searchParams.get('page') || '1', 10);
  const currentStatus = searchParams.get('status') || 'all';

  // State
  const [period, setPeriod] = useState<'3M' | '6M' | '12M'>('6M');
  const [expensesExpanded, setExpensesExpanded] = useState(false);
  const [stipendsExpanded, setStipendsExpanded] = useState(false);

  // Modals state
  const [generateOpen, setGenerateOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);

  const [markPaidOpen, setMarkPaidOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  const [logExpenseOpen, setLogExpenseOpen] = useState(false);

  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState<Invoice | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Active actions dropdown
  const [activeMenuInvoiceId, setActiveMenuInvoiceId] = useState<string | null>(null);

  // Generate 12 months array for chart
  const last12Months = useMemo(() => {
    const result = [];
    const d = new Date();
    for (let i = 11; i >= 0; i--) {
      const date = new Date(d.getFullYear(), d.getMonth() - i, 1);
      result.push(getMonthYear(date));
    }
    return result;
  }, []);

  // Client-side state for paid invoices to populate the chart
  const [paidInvoices, setPaidInvoices] = useState<Invoice[]>([]);
  const fetchPaidInvoices = React.useCallback(async () => {
    try {
      const { data } = await supabase
        .from('invoices')
        .select('*')
        .eq('status', 'paid');
      setPaidInvoices(data || []);
    } catch (err) {
      console.error('Error fetching paid invoices:', err);
    }
  }, [supabase]);

  React.useEffect(() => {
    fetchPaidInvoices();
  }, [fetchPaidInvoices]);

  const chartData = useMemo(() => {
    const allMonthsData = last12Months.map((month) => {
      const total = paidInvoices
        .filter((inv) => inv.month_year === month)
        .reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0);
      return {
        name: month,
        amount: total,
      };
    });

    const sliceSize = period === '3M' ? 3 : period === '6M' ? 6 : 12;
    return allMonthsData.slice(-sliceSize);
  }, [last12Months, paidInvoices, period]);

  const currentMonthStr = getMonthYear(new Date());

  // Expenses calculations
  const monthlyExpensesTotal = useMemo(() => {
    return expenses
      .filter((e) => e.month_year === currentMonthStr)
      .reduce((sum, e) => sum + Number(e.amount || 0), 0);
  }, [expenses, currentMonthStr]);

  // Stipends employee resolving in memory
  const stipendsList = useMemo(() => {
    return stipendPayments.map((sp) => {
      const emp = employees.find((e) => e.id === sp.employee_id);
      const prof = profiles.find((p) => p.id === sp.employee_id);
      return {
        ...sp,
        employee_name: prof?.full_name || 'Unknown Employee',
        designation: emp?.designation || 'Intern',
      };
    });
  }, [stipendPayments, employees, profiles]);

  // Navigation handlers
  const handleStatusFilterChange = (status: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('status', status);
    params.set('page', '1');
    router.push(`${pathname}?${params.toString()}`);
  };

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', String(page));
    router.push(`${pathname}?${params.toString()}`);
  };

  // Actions
  const handleRefresh = () => {
    router.refresh();
    fetchPaidInvoices();
  };

  const handleDeleteConfirm = async () => {
    if (!invoiceToDelete) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase.from('invoices').delete().eq('id', invoiceToDelete.id);
      if (error) throw error;

      // Log to activity_log
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('activity_log').insert({
        user_id: user?.id || null,
        client_id: invoiceToDelete.client_id,
        action: 'invoice_deleted',
        entity_type: 'invoice',
        title: `Invoice ${invoiceToDelete.invoice_number} deleted`,
        description: `Invoice ${invoiceToDelete.invoice_number} was permanently deleted by admin.`,
      });

      toast.success('Invoice deleted.');
      setConfirmDeleteOpen(false);
      setInvoiceToDelete(null);
      handleRefresh();
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete invoice.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleMarkStipendPaid = async (stipendId: string, employeeName: string, amount: number) => {
    try {
      const { error } = await supabase
        .from('stipend_payments')
        .update({
          status: 'paid',
          paid_date: new Date().toISOString().split('T')[0],
          payment_method: 'Bank Transfer',
        })
        .eq('id', stipendId);

      if (error) throw error;

      // Log activity
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('activity_log').insert({
        user_id: user?.id || null,
        action: 'stipend_paid',
        entity_type: 'stipend',
        entity_id: stipendId,
        title: 'Stipend Paid',
        description: `Stipend of ₹${amount.toLocaleString('en-IN')} marked paid for ${employeeName}.`,
      });

      // Also log as an expense in expenses table automatically!
      await supabase.from('expenses').insert({
        category: 'student_stipend',
        description: `Stipend stipend payment to ${employeeName}`,
        amount,
        date: new Date().toISOString().split('T')[0],
        month_year: currentMonthStr,
        notes: 'Auto-logged upon marking stipend paid.',
      });

      toast.success('Stipend payment recorded ✓');
      handleRefresh();
    } catch (err) {
      console.error(err);
      toast.error('Failed to update stipend status.');
    }
  };

  const handleGenerateStipends = async () => {
    try {
      // 1. Fetch active employees
      const { data: activeEmployees, error: empErr } = await supabase
        .from('employees')
        .select('id, stipend_amount')
        .is('end_date', null);

      if (empErr) throw empErr;

      if (!activeEmployees || activeEmployees.length === 0) {
        toast.info('No active employees found to generate stipends.');
        return;
      }

      // 2. Fetch existing payments for this month
      const { data: existingPayments, error: payErr } = await supabase
        .from('stipend_payments')
        .select('employee_id')
        .eq('month_year', currentMonthStr);

      if (payErr) throw payErr;

      const existingEmpIds = new Set(existingPayments?.map((p) => p.employee_id) || []);

      // 3. Filter employees who don't have stipend generated
      const newPayments = activeEmployees
        .filter((emp) => !existingEmpIds.has(emp.id))
        .map((emp) => ({
          employee_id: emp.id,
          month_year: currentMonthStr,
          base_amount: emp.stipend_amount || 3000,
          bonus_amount: 0,
          total_amount: emp.stipend_amount || 3000,
          status: 'pending',
        }));

      if (newPayments.length === 0) {
        toast.info('Stipends for all employees are already generated.');
        return;
      }

      const { error: insertErr } = await supabase.from('stipend_payments').insert(newPayments);
      if (insertErr) throw insertErr;

      toast.success(`Generated ${newPayments.length} stipends for ${currentMonthStr}`);
      handleRefresh();
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate monthly stipends.');
    }
  };

  // Recharts styling helpers
  const formatYAxis = (value: number) => {
    if (value >= 1000) return `₹${Math.round(value / 1000)}k`;
    return `₹${value}`;
  };

  const totalPages = Math.ceil(invoicesCount / 20);
  const filterStatuses = ['all', 'pending', 'paid', 'overdue', 'cancelled'];

  return (
    <div className="space-y-6">
      {/* Control bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 select-none bg-bg-card/70 backdrop-blur-[12px] border border-border/20 p-4 rounded-lg shadow-elevated">
        <div className="flex items-center gap-2">
          <DollarSign className="text-accent h-5 w-5" />
          <span className="text-sm font-bold text-text-primary">Financial Console</span>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={() => {
              setEditingInvoice(null);
              setGenerateOpen(true);
            }}
            className="text-xs h-9 gap-1.5 font-semibold cursor-pointer"
          >
            <Plus size={15} />
            <span>Generate Invoice</span>
          </Button>

          <Button
            onClick={handleRefresh}
            variant="outline"
            className="text-text-secondary hover:text-text-primary text-xs h-9 gap-1.5 cursor-pointer"
          >
            <RefreshCw size={14} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Row 1 — 4 StatCards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Monthly MRR"
          value={formatCurrency(stats.mrr)}
          icon={Briefcase}
          valueClassName="text-accent"
          subtext={`from ${clients.length} active clients`}
        />
        <StatCard
          title="Collected This Month"
          value={formatCurrency(stats.collectedThisMonth)}
          icon={TrendingUp}
          valueClassName="text-success"
          subtext={
            stats.collectedChangePct !== 0
              ? `${stats.collectedChangePct >= 0 ? '↑' : '↓'} ${Math.abs(stats.collectedChangePct)}% vs last month`
              : 'No change vs last month'
          }
        />
        <StatCard
          title="Outstanding"
          value={formatCurrency(stats.outstanding)}
          icon={Clock}
          valueClassName="text-warning"
        />
        <StatCard
          title="Overdue"
          value={formatCurrency(stats.overdue)}
          icon={AlertTriangle}
          valueClassName={stats.overdue > 0 ? 'text-error font-bold' : 'text-text-secondary'}
        />
      </div>

      {/* Row 2 — Revenue Bar Chart */}
      <div className="bg-bg-card/70 backdrop-blur-[12px] border border-border/30 rounded-xl p-5 space-y-4 shadow-elevated">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-text-primary">Revenue</h3>
          <div className="flex items-center bg-bg-card-hover/20 border border-border/10 rounded p-0.5 text-[10px] font-semibold text-text-secondary select-none">
            {(['3M', '6M', '12M'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={cn(
                  'px-3 py-1 rounded-sm cursor-pointer transition-all',
                  period === p ? 'bg-primary text-text-primary' : 'hover:text-text-primary'
                )}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <div className="h-[220px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.25} vertical={false} />
              <XAxis dataKey="name" stroke="var(--color-text-tertiary)" fontSize={10} tickLine={false} />
              <YAxis stroke="var(--color-text-tertiary)" fontSize={10} tickFormatter={formatYAxis} tickLine={false} />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-bg-card/95 border border-border/30 backdrop-blur-[4px] p-2.5 rounded shadow-xl text-xs">
                        <p className="font-semibold text-text-secondary">{payload[0].payload.name}</p>
                        <p className="font-mono font-bold text-accent mt-0.5">
                          ₹ {payload[0].value?.toLocaleString('en-IN')}
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="amount" fill="var(--color-primary)" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.name === currentMonthStr ? 'var(--color-accent)' : 'var(--color-primary)'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 3 — Invoice Table */}
      <div className="bg-bg-card/70 backdrop-blur-[12px] border border-border/30 rounded-xl p-5 space-y-4 shadow-elevated">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="text-sm font-bold text-text-primary">Invoices</h3>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 select-none">
            {filterStatuses.map((st) => (
              <button
                key={st}
                onClick={() => handleStatusFilterChange(st)}
                className={cn(
                  'px-3 py-1 text-[10px] font-bold uppercase rounded border transition-all cursor-pointer',
                  currentStatus === st
                    ? 'bg-primary text-text-primary border-primary'
                    : 'bg-transparent text-text-secondary border-border/30 hover:text-text-primary hover:border-border/60'
                )}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* DataTable */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border/20 text-[10px] font-bold uppercase tracking-wider text-text-secondary h-10 select-none">
                <th className="px-4">Client</th>
                <th className="px-4">Invoice #</th>
                <th className="px-4">Description</th>
                <th className="px-4 text-right">Amount</th>
                <th className="px-4 text-center">Status</th>
                <th className="px-4">Issued</th>
                <th className="px-4">Due</th>
                <th className="px-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/10">
              {invoices.length > 0 ? (
                invoices.map((inv) => {
                  const clientName = (inv as Invoice & { clients?: { name: string } }).clients?.name || 'Unknown Client';
                  const isOverdue = inv.status === 'overdue';
                  const isPending = inv.status === 'pending';

                  return (
                    <tr
                      key={inv.id}
                      className={cn(
                        'group h-12 text-xs hover:bg-bg-card-hover/20 transition-all relative',
                        isOverdue && 'bg-error/5 hover:bg-error/10'
                      )}
                    >
                      <td className="px-4">
                        <Link
                          href={`/dashboard/clients/${inv.client_id}`}
                          className="font-bold text-text-primary hover:text-primary hover:underline"
                        >
                          {clientName}
                        </Link>
                      </td>
                      <td className="px-4 font-mono text-text-secondary">{inv.invoice_number}</td>
                      <td className="px-4 text-text-secondary truncate max-w-[150px]">{inv.description || '-'}</td>
                      <td className="px-4 text-right font-mono font-semibold text-accent">
                        {formatCurrency(inv.total_amount || inv.amount)}
                      </td>
                      <td className="px-4 text-center">
                        <StatusBadge status={inv.status} />
                      </td>
                      <td className="px-4 text-text-tertiary font-mono">{formatDate(inv.issued_date)}</td>
                      <td className="px-4">
                        <span className={cn('font-mono', isOverdue ? 'text-error font-semibold' : 'text-text-tertiary')}>
                          {inv.due_date ? formatDate(inv.due_date) : '-'}
                        </span>
                      </td>
                      <td className="px-4 text-right">
                        {/* Hover action bar */}
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-end gap-2 relative z-10">
                          {isPending && (
                            <Button
                              onClick={() => {
                                setSelectedInvoice(inv);
                                setMarkPaidOpen(true);
                              }}
                              className="bg-success hover:bg-success/90 text-white text-[10px] h-7 px-2.5 cursor-pointer font-bold shrink-0"
                            >
                              Mark Paid
                            </Button>
                          )}
                          <button
                            onClick={() => setActiveMenuInvoiceId(activeMenuInvoiceId === inv.id ? null : inv.id)}
                            className="p-1 rounded hover:bg-bg-card-hover/40 text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
                          >
                            <MoreHorizontal size={14} />
                          </button>
                          {activeMenuInvoiceId === inv.id && (
                            <>
                              <div className="fixed inset-0 z-20 cursor-default" onClick={() => setActiveMenuInvoiceId(null)} />
                              <div className="absolute right-0 top-6 bg-bg-card border border-border rounded-md shadow-2xl py-1 w-24 z-30 text-[10px] text-left">
                                <button
                                  onClick={() => {
                                    setActiveMenuInvoiceId(null);
                                    toast.info('Downloading PDF invoice...');
                                  }}
                                  className="w-full text-left px-3 py-1.5 hover:bg-bg-card-hover/40 text-text-primary transition-colors flex items-center gap-1.5 cursor-pointer"
                                >
                                  <FileText size={11} />
                                  <span>View PDF</span>
                                </button>
                                <button
                                  onClick={() => {
                                    setActiveMenuInvoiceId(null);
                                    setEditingInvoice(inv);
                                    setGenerateOpen(true);
                                  }}
                                  className="w-full text-left px-3 py-1.5 hover:bg-bg-card-hover/40 text-text-primary transition-colors flex items-center gap-1.5 cursor-pointer"
                                >
                                  <Edit3 size={11} />
                                  <span>Edit</span>
                                </button>
                                <button
                                  onClick={() => {
                                    setActiveMenuInvoiceId(null);
                                    setInvoiceToDelete(inv);
                                    setConfirmDeleteOpen(true);
                                  }}
                                  className="w-full text-left px-3 py-1.5 hover:bg-bg-card-hover/40 text-error hover:bg-error/10 transition-colors flex items-center gap-1.5 cursor-pointer"
                                >
                                  <Trash2 size={11} />
                                  <span>Delete</span>
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-text-tertiary select-none">
                    No invoices found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border/20 pt-4 select-none">
            <span className="text-[11px] text-text-tertiary">
              Page {currentPage} of {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <Button
                disabled={currentPage <= 1}
                onClick={() => handlePageChange(currentPage - 1)}
                size="sm"
                variant="secondary"
                className="h-8 text-xs cursor-pointer"
              >
                Previous
              </Button>
              <Button
                disabled={currentPage >= totalPages}
                onClick={() => handlePageChange(currentPage + 1)}
                size="sm"
                variant="secondary"
                className="h-8 text-xs cursor-pointer"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Row 4 — Expenses (collapsible section) */}
      <div className="bg-bg-card/70 backdrop-blur-[12px] border border-border/30 rounded-xl overflow-hidden shadow-elevated">
        <div
          onClick={() => setExpensesExpanded(!expensesExpanded)}
          className="flex items-center justify-between p-4 cursor-pointer hover:bg-bg-card-hover/20 select-none border-b border-border/10"
        >
          <div className="flex items-center gap-2">
            <ChevronDown
              size={18}
              className={cn('text-text-secondary transition-transform duration-200', !expensesExpanded && '-rotate-90')}
            />
            <span className="font-bold text-sm text-text-primary">Expenses</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-text-secondary font-mono">
              Total this month: <strong className="text-error">{formatCurrency(monthlyExpensesTotal)}</strong>
            </span>
            <Button
              onClick={(e) => {
                e.stopPropagation();
                setLogExpenseOpen(true);
              }}
              size="sm"
              className="text-[10px] h-7 px-3 cursor-pointer"
            >
              <Plus size={12} className="mr-1" />
              <span>Log Expense</span>
            </Button>
          </div>
        </div>

        {expensesExpanded && (
          <div className="p-4 bg-bg-card-hover/5">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border/10 text-[10px] font-bold uppercase tracking-wider text-text-secondary h-8 select-none">
                    <th className="px-2">Date</th>
                    <th className="px-2">Category</th>
                    <th className="px-2">Description</th>
                    <th className="px-2 text-right">Amount</th>
                    <th className="px-2">Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/10 text-text-primary">
                  {expenses.length > 0 ? (
                    expenses.map((exp) => (
                      <tr key={exp.id} className="h-10 hover:bg-bg-card-hover/10">
                        <td className="px-2 font-mono text-text-secondary">{formatDate(exp.date)}</td>
                        <td className="px-2 uppercase font-semibold text-[10px] tracking-wider text-text-secondary">
                          {CATEGORY_LABELS[exp.category] || exp.category}
                        </td>
                        <td className="px-2 text-text-secondary">{exp.description}</td>
                        <td className="px-2 text-right font-mono font-bold text-error">
                          {formatCurrency(exp.amount)}
                        </td>
                        <td className="px-2">
                          {exp.receipt_file_id ? (
                            <button
                              onClick={() => toast.info('Opening receipt document...')}
                              className="text-primary hover:underline flex items-center gap-1 cursor-pointer font-bold"
                            >
                              <Receipt size={12} />
                              <span>View</span>
                            </button>
                          ) : (
                            <span className="text-text-tertiary">-</span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="p-4 text-center text-text-secondary/60">
                        No expenses logged.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Row 5 — Stipends (collapsible section) */}
      <div className="bg-bg-card/70 backdrop-blur-[12px] border border-border/30 rounded-xl overflow-hidden shadow-elevated">
        <div
          onClick={() => setStipendsExpanded(!stipendsExpanded)}
          className="flex items-center justify-between p-4 cursor-pointer hover:bg-bg-card-hover/20 select-none border-b border-border/10"
        >
          <div className="flex items-center gap-2">
            <ChevronDown
              size={18}
              className={cn('text-text-secondary transition-transform duration-200', !stipendsExpanded && '-rotate-90')}
            />
            <span className="font-bold text-sm text-text-primary">Stipends</span>
          </div>
          <Button
            onClick={(e) => {
              e.stopPropagation();
              handleGenerateStipends();
            }}
            size="sm"
            className="text-[10px] h-7 px-3 cursor-pointer"
          >
            <UserCheck size={12} className="mr-1" />
            <span>Generate Stipends for {currentMonthStr}</span>
          </Button>
        </div>

        {stipendsExpanded && (
          <div className="p-4 bg-bg-card-hover/5">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border/10 text-[10px] font-bold uppercase tracking-wider text-text-secondary h-8 select-none">
                    <th className="px-2">Employee</th>
                    <th className="px-2">Month</th>
                    <th className="px-2 text-right">Base</th>
                    <th className="px-2 text-right">Bonus</th>
                    <th className="px-2 text-right">Total</th>
                    <th className="px-2 text-center">Status</th>
                    <th className="px-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/10 text-text-primary">
                  {stipendsList.length > 0 ? (
                    stipendsList.map((sp) => {
                      const isPending = sp.status === 'pending';

                      return (
                        <tr key={sp.id} className="h-10 hover:bg-bg-card-hover/10">
                          <td className="px-2 font-bold">{sp.employee_name}</td>
                          <td className="px-2 font-mono text-text-secondary">{sp.month_year}</td>
                          <td className="px-2 text-right font-mono text-text-secondary">
                            {formatCurrency(sp.base_amount || 0)}
                          </td>
                          <td className="px-2 text-right font-mono text-text-secondary">
                            {formatCurrency(sp.bonus_amount || 0)}
                          </td>
                          <td className="px-2 text-right font-mono font-bold text-accent">
                            {formatCurrency(sp.total_amount || 0)}
                          </td>
                          <td className="px-2 text-center">
                            <StatusBadge status={sp.status} />
                          </td>
                          <td className="px-2 text-right">
                            {isPending ? (
                              <Button
                                onClick={() =>
                                  handleMarkStipendPaid(
                                    sp.id,
                                    sp.employee_name,
                                    Number(sp.total_amount || 3000)
                                  )
                                }
                                size="sm"
                                className="bg-success hover:bg-success/90 text-white text-[9px] h-6 px-2 cursor-pointer font-bold"
                              >
                                Mark Paid
                              </Button>
                            ) : (
                              <span className="text-text-tertiary text-[9px] select-none font-semibold uppercase">
                                Settled
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={7} className="p-4 text-center text-text-secondary/60">
                        No stipend payments generated.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ━━━ MODAL: GENERATE/EDIT INVOICE ━━━ */}
      <GenerateInvoiceModal
        open={generateOpen}
        onOpenChange={setGenerateOpen}
        clients={clients}
        invoiceToEdit={editingInvoice}
        onSuccess={handleRefresh}
      />

      {/* ━━━ MODAL: MARK PAID ━━━ */}
      <MarkPaidModal
        open={markPaidOpen}
        onOpenChange={setMarkPaidOpen}
        invoice={selectedInvoice}
        clientName={
          selectedInvoice
            ? (selectedInvoice as Invoice & { clients?: { name: string } }).clients?.name || clients.find((c) => c.id === selectedInvoice.client_id)?.name
            : undefined
        }
        onSuccess={handleRefresh}
      />

      {/* ━━━ MODAL: LOG EXPENSE ━━━ */}
      <LogExpenseModal open={logExpenseOpen} onOpenChange={setLogExpenseOpen} onSuccess={handleRefresh} />

      {/* ━━━ DIALOG: CONFIRM DELETE INVOICE ━━━ */}
      <ConfirmDialog
        open={confirmDeleteOpen}
        onClose={() => {
          setConfirmDeleteOpen(false);
          setInvoiceToDelete(null);
        }}
        onConfirm={handleDeleteConfirm}
        title="Delete Invoice"
        description={`Are you sure you want to permanently delete invoice ${invoiceToDelete?.invoice_number}? This cannot be undone.`}
        confirmLabel="Delete"
        loading={isDeleting}
        variant="danger"
      />
    </div>
  );
}
export default FinanceDashboard;
