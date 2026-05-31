'use client';

/* eslint-disable react-hooks/set-state-in-effect */

import React, { useEffect, useState } from 'react';
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
import { getMonthYear } from '@/lib/utils';

interface LogExpenseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const CATEGORIES = [
  { id: 'student_stipend', label: 'Student Stipend' },
  { id: 'tools', label: 'Tools / Subscriptions' },
  { id: 'travel', label: 'Travel & Conveyance' },
  { id: 'hosting', label: 'Hosting & Server' },
  { id: 'misc', label: 'Miscellaneous' },
];

export function LogExpenseModal({ open, onOpenChange, onSuccess }: LogExpenseModalProps) {
  const supabase = createClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [form, setForm] = useState({
    category: 'tools',
    description: '',
    amount: '',
    date: '',
    notes: '',
    is_tax_deductible: true,
    paid_by: 'muddassir',
  });

  useEffect(() => {
    if (open) {
      setForm({
        category: 'tools',
        description: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        notes: '',
        is_tax_deductible: true,
        paid_by: 'muddassir',
      });
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!form.description.trim()) {
      toast.error('Description is required.');
      return;
    }
    const amt = Number(form.amount || 0);
    if (amt <= 0) {
      toast.error('Amount must be greater than 0.');
      return;
    }
    if (!form.date) {
      toast.error('Date is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const monthYear = getMonthYear(new Date(form.date));

      const { data: expense, error } = await supabase
        .from('expenses')
        .insert({
          category: form.category,
          description: form.description.trim(),
          amount: amt,
          date: form.date,
          month_year: monthYear,
          notes: form.notes.trim() || null,
          is_tax_deductible: form.is_tax_deductible,
          paid_by: form.paid_by,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      // Log to activity_log
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('activity_log').insert({
        user_id: user?.id || null,
        action: 'expense_logged',
        entity_type: 'expense',
        entity_id: expense.id,
        title: `Expense Logged: ₹${amt.toLocaleString('en-IN')}`,
        description: `Logged expense of ₹${amt.toLocaleString('en-IN')} for category ${form.category}: "${form.description}".`,
      });

      toast.success('Expense logged successfully.');
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      toast.error('Failed to log expense.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#0D1829] border border-[#1E3352] text-[#F0F4FF] max-w-sm select-none">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-[#F0F4FF]">Log Business Expense</DialogTitle>
          <DialogDescription className="text-xs text-[#8BA3C7]">
            Log an operational or stipend expense to compute profit margins.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 my-2 text-xs">
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-[#8BA3C7] tracking-wider uppercase">Category</label>
            <select
              value={form.category}
              onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
              className="input h-9 w-full bg-[#060D1A] border-[#1E3352] text-[#F0F4FF] rounded px-3"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id} className="bg-[#0D1829]">
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-[#8BA3C7] tracking-wider uppercase">Description *</label>
            <input
              type="text"
              placeholder="e.g. n8n hosting bill or Vercel Pro subscription"
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              className="input h-9 w-full bg-[#060D1A] border-[#1E3352] text-[#F0F4FF] rounded px-3"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-[#8BA3C7] tracking-wider uppercase">Amount (₹) *</label>
            <input
              type="number"
              placeholder="e.g. 1500"
              value={form.amount}
              onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
              className="input h-9 w-full bg-[#060D1A] border-[#1E3352] text-[#F0F4FF] rounded px-3 font-mono"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-[#8BA3C7] tracking-wider uppercase">Date</label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
              className="input h-9 w-full bg-[#060D1A] border-[#1E3352] text-[#F0F4FF] rounded px-3 font-mono"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-[#8BA3C7] tracking-wider uppercase">Notes</label>
            <textarea
              placeholder="Receipt details or references..."
              value={form.notes}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              rows={2}
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
            {isSubmitting ? 'Logging...' : 'Log Expense'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
