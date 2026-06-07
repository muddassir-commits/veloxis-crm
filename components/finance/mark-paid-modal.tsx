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
import { Input } from '@/components/ui/input';

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
      <DialogContent className="max-w-sm select-none">
        <DialogHeader>
          <DialogTitle className="text-base font-bold">Record Payment</DialogTitle>
          <DialogDescription className="text-xs">
            Record payment details for invoice {invoice?.invoice_number}.
          </DialogDescription>
        </DialogHeader>

        {invoice && (
          <div className="space-y-4 my-2 text-xs">
            <div className="bg-bg-card-hover/20 border border-border/20 rounded p-3 space-y-1">
              <div className="flex justify-between">
                <span className="text-text-secondary">Client:</span>
                <span className="font-bold text-text-primary">{clientName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Invoice Total:</span>
                <span className="font-mono font-bold text-accent">
                  ₹ {Number(invoice.total_amount || invoice.amount).toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-text-secondary tracking-wider uppercase">Payment Date</label>
              <Input
                type="date"
                value={form.paid_date}
                onChange={(e) => setForm((p) => ({ ...p, paid_date: e.target.value }))}
                className="h-9 font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-text-secondary tracking-wider uppercase">Payment Method</label>
              <select
                value={form.payment_method}
                onChange={(e) => setForm((p) => ({ ...p, payment_method: e.target.value }))}
                className="h-9 w-full bg-bg-card/50 border border-border/30 text-text-primary rounded px-3 hover:border-border/60 focus:border-primary/50 focus:shadow-[0_0_16px_rgba(37,99,235,0.15)] transition-all outline-none"
              >
                <option value="Bank Transfer" className="bg-bg-card text-text-primary">Bank Transfer (IMPS/NEFT)</option>
                <option value="UPI" className="bg-bg-card text-text-primary">UPI (GPay/PhonePe)</option>
                <option value="Credit Card" className="bg-bg-card text-text-primary">Credit Card</option>
                <option value="Cash" className="bg-bg-card text-text-primary">Cash</option>
                <option value="Other" className="bg-bg-card text-text-primary">Other / Cheque</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-text-secondary tracking-wider uppercase">Amount Received (₹)</label>
              <Input
                type="number"
                value={form.amount_received}
                onChange={(e) => setForm((p) => ({ ...p, amount_received: e.target.value }))}
                className="h-9 font-mono"
              />
            </div>
          </div>
        )}

        <DialogFooter className="mt-4 gap-2 sm:gap-0">
          <Button
            variant="secondary"
            onClick={() => onOpenChange(false)}
            className="cursor-pointer"
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            className="bg-success text-white border border-success/30 hover:bg-success/80 shadow-[0_4px_12px_rgba(16,185,129,0.25)] hover:shadow-[0_8px_20px_rgba(16,185,129,0.35)] cursor-pointer"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Recording...' : 'Record Payment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
