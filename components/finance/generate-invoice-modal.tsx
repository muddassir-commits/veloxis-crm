'use client';

/* eslint-disable react-hooks/set-state-in-effect */

import React, { useEffect, useState } from 'react';
import { Client, Invoice } from '@/types';
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
import { Input } from '@/components/ui/input';

interface GenerateInvoiceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clients: Client[];
  invoiceToEdit?: Invoice | null;
  onSuccess: () => void;
}

export function GenerateInvoiceModal({
  open,
  onOpenChange,
  clients,
  invoiceToEdit,
  onSuccess,
}: GenerateInvoiceModalProps) {
  const supabase = createClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [counterVal, setCounterVal] = useState(0);

  const [form, setForm] = useState({
    client_id: '',
    invoice_number: '',
    month_year: '',
    description: '',
    amount: '',
    gst_rate: '18',
    issued_date: '',
    due_date: '',
    payment_method: 'Bank Transfer',
    notes: 'GST @ 18% is added to subtotal.',
    send_email: false,
  });

  // Suggest sequential invoice number on open or load editing invoice
  useEffect(() => {
    if (open) {
      if (invoiceToEdit) {
        setForm({
          client_id: invoiceToEdit.client_id || '',
          invoice_number: invoiceToEdit.invoice_number || '',
          month_year: invoiceToEdit.month_year || '',
          description: invoiceToEdit.description || '',
          amount: String(invoiceToEdit.amount || ''),
          gst_rate: String(invoiceToEdit.gst_rate || '18'),
          issued_date: invoiceToEdit.issued_date || '',
          due_date: invoiceToEdit.due_date || '',
          payment_method: invoiceToEdit.payment_method || 'Bank Transfer',
          notes: invoiceToEdit.notes || '',
          send_email: false,
        });
      } else {
        const fetchNextInvoiceNumber = async () => {
          try {
            const { data: settingsData } = await supabase
              .from('agency_settings')
              .select('value')
              .eq('key', 'invoice_counter')
              .single();

            const counter = settingsData ? Number(settingsData.value) : 0;
            setCounterVal(counter);
            const nextCounter = counter + 1;
            const year = new Date().getFullYear();
            const padded = String(nextCounter).padStart(3, '0');

            setForm((p) => ({
              ...p,
              invoice_number: `VG-${year}-${padded}`,
              issued_date: new Date().toISOString().split('T')[0],
              due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // today + 7 days
              month_year: new Date().toLocaleString('default', { month: 'short', year: 'numeric' }), // e.g. "Jun 2026"
              client_id: clients.length > 0 ? clients[0].id : '',
            }));
          } catch (err) {
            console.error('Error fetching counter:', err);
          }
        };

        fetchNextInvoiceNumber();
      }
    }
  }, [open, invoiceToEdit, clients, supabase]);

  // Set description when client changes (only in add mode)
  useEffect(() => {
    if (form.client_id && !invoiceToEdit) {
      const selectedClient = clients.find((c) => c.id === form.client_id);
      if (selectedClient) {
        setForm((p) => ({
          ...p,
          amount: String(selectedClient.monthly_retainer || ''),
          description: `Digital Marketing Services — ${p.month_year || new Date().toLocaleString('default', { month: 'short', year: 'numeric' })}`,
        }));
      }
    }
  }, [form.client_id, form.month_year, clients, invoiceToEdit]);

  // Auto-calculated values
  const amountNum = Number(form.amount || 0);
  const gstRateNum = Number(form.gst_rate || 0);
  const gstAmount = Number(((amountNum * gstRateNum) / 100).toFixed(2));
  const totalAmount = Number((amountNum + gstAmount).toFixed(2));

  const handleSubmit = async () => {
    if (!form.client_id) {
      toast.error('Client is required.');
      return;
    }
    if (!form.invoice_number.trim()) {
      toast.error('Invoice number is required.');
      return;
    }
    if (amountNum <= 0) {
      toast.error('Subtotal amount must be greater than 0.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (invoiceToEdit) {
        // UPDATE existing invoice
        const { error } = await supabase
          .from('invoices')
          .update({
            description: form.description.trim(),
            amount: amountNum,
            gst_rate: gstRateNum,
            gst_amount: gstAmount,
            total_amount: totalAmount,
            due_date: form.due_date || null,
            payment_method: form.payment_method,
            notes: form.notes.trim() || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', invoiceToEdit.id);

        if (error) throw error;
        toast.success(`Invoice ${form.invoice_number} updated.`);
      } else {
        // CREATE new invoice (calls our API endpoint)
        const response = await fetch('/api/finance/invoice', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            client_id: form.client_id,
            invoice_number: form.invoice_number.trim(),
            month_year: form.month_year,
            description: form.description.trim(),
            amount: amountNum,
            gst_rate: gstRateNum,
            gst_amount: gstAmount,
            total_amount: totalAmount,
            issued_date: form.issued_date,
            due_date: form.due_date || null,
            payment_method: form.payment_method,
            notes: form.notes.trim() || null,
            send_email: form.send_email,
            counter_val: counterVal,
          }),
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Failed to generate invoice.');
        }

        toast.success(`Invoice ${form.invoice_number} generated`);
      }

      onSuccess();
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : 'Failed to save invoice.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] select-none max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base font-bold">
            {invoiceToEdit ? `Edit Invoice ${form.invoice_number}` : 'Raise Billing Invoice'}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {invoiceToEdit
              ? 'Update the invoice details. Subtotal and GST are auto-calculated.'
              : 'Create a professional invoice. Subtotal amounts automatically compute GST.'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 my-2 text-xs">
          <div className="col-span-2 space-y-1">
            <label className="text-[11px] font-semibold text-text-secondary tracking-wider uppercase">Client *</label>
            <select
              value={form.client_id}
              onChange={(e) => setForm((p) => ({ ...p, client_id: e.target.value }))}
              className="h-9 w-full bg-bg-card/50 border border-border/30 text-text-primary rounded px-3 hover:border-border/60 focus:border-primary/50 focus:shadow-[0_0_16px_rgba(37,99,235,0.15)] transition-all outline-none"
              disabled={!!invoiceToEdit}
            >
              {clients.map((client) => (
                <option key={client.id} value={client.id} className="bg-bg-card text-text-primary">
                  {client.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-text-secondary tracking-wider uppercase">Invoice Number *</label>
            <Input
              type="text"
              value={form.invoice_number}
              onChange={(e) => setForm((p) => ({ ...p, invoice_number: e.target.value }))}
              className="h-9 font-mono"
              disabled={!!invoiceToEdit}
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-text-secondary tracking-wider uppercase">Month Year *</label>
            <Input
              type="text"
              placeholder="e.g. Jun 2026"
              value={form.month_year}
              onChange={(e) => setForm((p) => ({ ...p, month_year: e.target.value }))}
              className="h-9 font-mono"
              disabled={!!invoiceToEdit}
            />
          </div>

          <div className="col-span-2 space-y-1">
            <label className="text-[11px] font-semibold text-text-secondary tracking-wider uppercase">Invoice Description *</label>
            <Input
              type="text"
              placeholder="e.g. Digital Marketing Services"
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              className="h-9"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-text-secondary tracking-wider uppercase">Subtotal Amount (₹) *</label>
            <Input
              type="number"
              placeholder="e.g. 30000"
              value={form.amount}
              onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
              className="h-9"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-text-secondary tracking-wider uppercase">GST Rate (%)</label>
            <Input
              type="number"
              value={form.gst_rate}
              onChange={(e) => setForm((p) => ({ ...p, gst_rate: e.target.value }))}
              className="h-9"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-text-secondary tracking-wider uppercase">GST Amount (auto)</label>
            <div className="h-9 w-full bg-bg-card-hover/20 border border-border/20 text-text-secondary rounded px-3 flex items-center font-mono select-none">
              ₹ {gstAmount.toLocaleString('en-IN')}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-text-secondary tracking-wider uppercase">Total Amount (auto)</label>
            <div className="h-9 w-full bg-bg-card-hover/20 border border-border/20 text-accent font-bold rounded px-3 flex items-center font-mono select-none">
              ₹ {totalAmount.toLocaleString('en-IN')}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-text-secondary tracking-wider uppercase">Issued Date</label>
            <Input
              type="date"
              value={form.issued_date}
              onChange={(e) => setForm((p) => ({ ...p, issued_date: e.target.value }))}
              className="h-9 font-mono"
              disabled={!!invoiceToEdit}
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-text-secondary tracking-wider uppercase">Due Date</label>
            <Input
              type="date"
              value={form.due_date}
              onChange={(e) => setForm((p) => ({ ...p, due_date: e.target.value }))}
              className="h-9 font-mono"
            />
          </div>

          <div className="col-span-2 space-y-1">
            <label className="text-[11px] font-semibold text-text-secondary tracking-wider uppercase">Payment Method</label>
            <select
              value={form.payment_method}
              onChange={(e) => setForm((p) => ({ ...p, payment_method: e.target.value }))}
              className="h-9 w-full bg-bg-card/50 border border-border/30 text-text-primary rounded px-3 hover:border-border/60 focus:border-primary/50 focus:shadow-[0_0_16px_rgba(37,99,235,0.15)] transition-all outline-none"
            >
              <option value="Bank Transfer" className="bg-bg-card text-text-primary">Bank Transfer</option>
              <option value="UPI" className="bg-bg-card text-text-primary">UPI</option>
              <option value="Cash" className="bg-bg-card text-text-primary">Cash</option>
              <option value="Other" className="bg-bg-card text-text-primary">Other</option>
            </select>
          </div>

          <div className="col-span-2 space-y-1">
            <label className="text-[11px] font-semibold text-text-secondary tracking-wider uppercase">Notes</label>
            <textarea
              placeholder="Payment options, banking accounts..."
              value={form.notes}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              rows={2}
              className="w-full bg-bg-card/50 border border-border/30 text-text-primary rounded p-2 resize-none hover:border-border/60 focus:border-primary/50 focus:shadow-[0_0_16px_rgba(37,99,235,0.15)] transition-all outline-none"
            />
          </div>

          {/* Send to client checkbox: only shown in create mode */}
          {!invoiceToEdit && (
            <div className="col-span-2 flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="send_email"
                checked={form.send_email}
                onChange={(e) => setForm((p) => ({ ...p, send_email: e.target.checked }))}
                className="rounded border-border/30 bg-bg-card/50 text-primary focus:ring-0 cursor-pointer h-4 w-4"
              />
              <label htmlFor="send_email" className="text-xs text-text-secondary select-none cursor-pointer">
                Send invoice link to client via email (Resend)
              </label>
            </div>
          )}
        </div>

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
            variant="default"
            className="cursor-pointer"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving...' : invoiceToEdit ? 'Save Changes' : 'Generate Invoice'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
