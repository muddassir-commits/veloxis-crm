'use client';

/* eslint-disable react-hooks/set-state-in-effect */

import React, { useEffect, useState } from 'react';
import { Invoice } from '@/types';
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

interface MarkPaidModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: Invoice | null;
  clientName?: string;
  onSuccess: () => void;
}

export function MarkPaidModal({
  open,
  onOpenChange,
  invoice,
  clientName = 'Client',
  onSuccess,
}: MarkPaidModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    paid_date: '',
    payment_method: 'Bank Transfer',
    amount_received: '',
  });

  useEffect(() => {
    if (open && invoice) {
      setForm({
        paid_date: new Date().toISOString().split('T')[0],
        payment_method: invoice.payment_method || 'Bank Transfer',
        amount_received: String(invoice.total_amount || invoice.amount || ''),
      });
    }
  }, [open, invoice]);

  const handleSubmit = async () => {
    if (!invoice) return;

    const amtReceived = Number(form.amount_received || 0);
    if (amtReceived <= 0) {
      toast.error('Amount received must be greater than 0.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/finance/invoice/pay', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          invoice_id: invoice.id,
          paid_date: form.paid_date,
          payment_method: form.payment_method,
          amount_received: amtReceived,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to record payment.');
      }

      toast.success('Payment recorded ✓');
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : 'Failed to record payment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#0D1829] border border-[#1E3352] text-[#F0F4FF] max-w-sm select-none">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-[#F0F4FF]">Record Payment</DialogTitle>
          <DialogDescription className="text-xs text-[#8BA3C7]">
            Record payment details for invoice {invoice?.invoice_number}.
          </DialogDescription>
        </DialogHeader>

        {invoice && (
          <div className="space-y-4 my-2 text-xs">
            <div className="bg-[#132035]/50 border border-[#1E3352]/50 rounded p-3 space-y-1">
              <div className="flex justify-between">
                <span className="text-[#8BA3C7]">Client:</span>
                <span className="font-bold text-[#F0F4FF]">{clientName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8BA3C7]">Invoice Total:</span>
                <span className="font-mono font-bold text-[#F97316]">
                  ₹ {Number(invoice.total_amount || invoice.amount).toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-[#8BA3C7] tracking-wider uppercase">Payment Date</label>
              <input
                type="date"
                value={form.paid_date}
                onChange={(e) => setForm((p) => ({ ...p, paid_date: e.target.value }))}
                className="input h-9 w-full bg-[#060D1A] border-[#1E3352] text-[#F0F4FF] rounded px-3 font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-[#8BA3C7] tracking-wider uppercase">Payment Method</label>
              <select
                value={form.payment_method}
                onChange={(e) => setForm((p) => ({ ...p, payment_method: e.target.value }))}
                className="input h-9 w-full bg-[#060D1A] border-[#1E3352] text-[#F0F4FF] rounded px-3"
              >
                <option value="Bank Transfer" className="bg-[#0D1829]">Bank Transfer (IMPS/NEFT)</option>
                <option value="UPI" className="bg-[#0D1829]">UPI (GPay/PhonePe)</option>
                <option value="Credit Card" className="bg-[#0D1829]">Credit Card</option>
                <option value="Cash" className="bg-[#0D1829]">Cash</option>
                <option value="Other" className="bg-[#0D1829]">Other / Cheque</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-[#8BA3C7] tracking-wider uppercase">Amount Received (₹)</label>
              <input
                type="number"
                value={form.amount_received}
                onChange={(e) => setForm((p) => ({ ...p, amount_received: e.target.value }))}
                className="input h-9 w-full bg-[#060D1A] border-[#1E3352] text-[#F0F4FF] rounded px-3 font-mono"
              />
            </div>
          </div>
        )}

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
            className="bg-[#22C55E] hover:bg-[#16A34A] text-white cursor-pointer"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Recording...' : 'Record Payment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
