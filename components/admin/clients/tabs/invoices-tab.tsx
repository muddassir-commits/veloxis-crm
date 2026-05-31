'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Client, Invoice, InvoiceStatus } from '@/types';
import { toast } from 'sonner';
import { formatCurrency, formatDate, getMonthYear } from '@/lib/utils';
import { FileText, RefreshCw, Plus, Check, Trash, MoreHorizontal, ExternalLink } from 'lucide-react';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface InvoicesTabProps {
  client: Client;
}

export function InvoicesTab({ client }: InvoicesTabProps) {
  const supabase = createClient();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal states
  const [generateModalOpen, setGenerateModalOpen] = useState(false);
  const [markPaidOpen, setMarkPaidOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  // Form states
  const [invoiceForm, setInvoiceForm] = useState({
    invoice_number: '',
    amount: '',
    description: '',
    issued_date: '',
    due_date: '',
    notes: '',
  });

  const [paymentForm, setPaymentForm] = useState({
    paid_date: '',
    payment_method: 'Bank Transfer',
  });

  const fetchInvoices = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('client_id', client.id)
        .order('issued_date', { ascending: false });

      if (error) throw error;
      setInvoices(data || []);
    } catch {
      toast.error('Failed to load invoices.');
    } finally {
      setIsLoading(false);
    }
  }, [client.id, supabase]);

  useEffect(() => {
    if (client.is_agency_self) return;
    const timer = setTimeout(() => {
      fetchInvoices();
    }, 0);
    return () => clearTimeout(timer);
  }, [client.is_agency_self, fetchInvoices]);

  if (client.is_agency_self) {
    return null;
  }

  // Outstanding calculations
  const totalOutstanding = invoices
    .filter((inv) => inv.status === 'pending' || inv.status === 'overdue' || inv.status === 'sent')
    .reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0);

  // Open Generate Modal & Suggest Sequential Invoice Number
  const handleOpenGenerateModal = () => {
    const year = new Date().getFullYear();
    const count = invoices.length + 1;
    const suggestedNum = `INV-${year}-${String(count).padStart(4, '0')}`;

    setInvoiceForm({
      invoice_number: suggestedNum,
      amount: String(client.monthly_retainer || ''),
      description: `Monthly Digital Marketing Services — ${new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}`,
      issued_date: new Date().toISOString().split('T')[0],
      due_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      notes: 'GST @ 18% is added to subtotal.',
    });
    setGenerateModalOpen(true);
  };

  // Submit Handler: Generate Invoice
  const handleGenerateInvoice = async () => {
    if (!invoiceForm.invoice_number.trim()) {
      toast.error('Invoice number is required.');
      return;
    }
    const amt = Number(invoiceForm.amount || 0);
    if (amt <= 0) {
      toast.error('Invoice amount must be greater than 0.');
      return;
    }

    try {
      const gstRate = 18;
      const gstAmt = Number((amt * 0.18).toFixed(2));
      const totalAmt = Number((amt + gstAmt).toFixed(2));

      const payload = {
        client_id: client.id,
        invoice_number: invoiceForm.invoice_number.trim(),
        amount: amt,
        gst_rate: gstRate,
        gst_amount: gstAmt,
        total_amount: totalAmt,
        status: 'pending' as InvoiceStatus,
        issued_date: invoiceForm.issued_date,
        due_date: invoiceForm.due_date || null,
        description: invoiceForm.description || null,
        notes: invoiceForm.notes || null,
        month_year: getMonthYear(new Date(invoiceForm.issued_date)),
      };

      const { error } = await supabase.from('invoices').insert(payload);
      if (error) throw error;

      // Log activity
      await supabase.from('activity_log').insert({
        client_id: client.id,
        action: 'invoice_created',
        entity_type: 'invoice',
        title: `Invoice ${payload.invoice_number} created`,
        description: `Invoice worth ₹${totalAmt} raised for ${client.name}.`,
      });

      toast.success('Invoice generated successfully.');
      setGenerateModalOpen(false);
      fetchInvoices();
    } catch {
      toast.error('Failed to generate invoice.');
    }
  };

  // Open Mark Paid dialog
  const handleOpenMarkPaid = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setPaymentForm({
      paid_date: new Date().toISOString().split('T')[0],
      payment_method: 'Bank Transfer',
    });
    setMarkPaidOpen(true);
  };

  // Submit Handler: Mark Invoice as Paid
  const handleMarkPaid = async () => {
    if (!selectedInvoice) return;

    try {
      const { error } = await supabase
        .from('invoices')
        .update({
          status: 'paid' as InvoiceStatus,
          paid_date: paymentForm.paid_date,
          payment_method: paymentForm.payment_method,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedInvoice.id);

      if (error) throw error;

      // Log activity
      await supabase.from('activity_log').insert({
        client_id: client.id,
        action: 'invoice_paid',
        entity_type: 'invoice',
        entity_id: selectedInvoice.id,
        title: `Invoice ${selectedInvoice.invoice_number} paid`,
        description: `Invoice worth ₹${selectedInvoice.total_amount} marked paid via ${paymentForm.payment_method}.`,
      });

      toast.success(`Invoice ${selectedInvoice.invoice_number} marked as paid.`);
      setMarkPaidOpen(false);
      setSelectedInvoice(null);
      fetchInvoices();
    } catch {
      toast.error('Failed to mark invoice as paid.');
    }
  };

  // Submit Handler: Delete Invoice (allowed only if draft or pending/sent depending on business logic, here we allow draft/pending delete)
  const handleDeleteInvoice = async (invoiceId: string) => {
    try {
      const { error } = await supabase.from('invoices').delete().eq('id', invoiceId);
      if (error) throw error;

      toast.success('Invoice deleted.');
      fetchInvoices();
    } catch {
      toast.error('Failed to delete invoice.');
    }
  };

  // Columns for Invoices DataTable
  const columns = [
    {
      key: 'invoice_number',
      header: 'Invoice #',
      width: '15%',
      render: (val: unknown) => <span className="font-mono text-xs font-semibold text-[#F0F4FF]">{String(val)}</span>,
    },
    {
      key: 'description',
      header: 'Description',
      width: '30%',
      render: (val: unknown) => <span className="text-xs text-[#8BA3C7]">{String(val || '-')}</span>,
    },
    {
      key: 'total_amount',
      header: 'Amount (incl GST)',
      width: '15%',
      render: (val: unknown) => (
        <span className="font-semibold font-mono text-xs text-[#F97316]">
          {formatCurrency(Number(val))}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      width: '12%',
      render: (val: unknown) => <StatusBadge status={String(val)} />,
    },
    {
      key: 'issued_date',
      header: 'Issued',
      width: '12%',
      render: (val: unknown) => (
        <span className="text-xs text-[#4A6480] font-mono">
          {val ? formatDate(String(val)) : '-'}
        </span>
      ),
    },
    {
      key: 'due_date',
      header: 'Due Date',
      width: '12%',
      render: (val: unknown, row: Record<string, unknown>) => {
        const dateStr = String(val || '');
        const isOverdue = dateStr && dateStr < new Date().toISOString().split('T')[0] && row.status !== 'paid';
        return (
          <span className={`font-mono text-xs ${isOverdue ? 'text-[#EF4444] font-semibold' : 'text-[#4A6480]'}`}>
            {val ? formatDate(dateStr) : '-'}
          </span>
        );
      },
    },
  ];

  // Actions dropdown generator
  const rowActions = (row: Record<string, unknown>) => {
    const inv = row as unknown as Invoice;
    const isUnpaid = inv.status !== 'paid' && inv.status !== 'cancelled';
    const isDraft = inv.status === 'draft';

    return (
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <button className="text-[#4A6480] hover:text-[#F0F4FF] p-0.5 rounded hover:bg-[#132035] transition-all cursor-pointer">
              <MoreHorizontal size={14} />
            </button>
          }
        />
        <DropdownMenuContent align="end" className="bg-[#0D1829] border-[#1E3352] text-[#F0F4FF] w-36 z-30">
          {isUnpaid && (
            <DropdownMenuItem
              onClick={() => handleOpenMarkPaid(inv)}
              className="text-xs hover:bg-[#132035] cursor-pointer text-[#22C55E] hover:text-[#22C55E] gap-2 py-1.5"
            >
              <Check size={12} />
              <span>Mark Paid</span>
            </DropdownMenuItem>
          )}

          {inv.file_id && (
            <DropdownMenuItem
              onClick={() => {
                // Open public link
                toast.info('Downloading pdf file receipt...');
              }}
              className="text-xs hover:bg-[#132035] cursor-pointer text-[#8BA3C7] hover:text-[#F0F4FF] gap-2 py-1.5"
            >
              <ExternalLink size={12} />
              <span>View PDF</span>
            </DropdownMenuItem>
          )}

          {(isDraft || inv.status === 'pending') && (
            <DropdownMenuItem
              onClick={() => handleDeleteInvoice(inv.id)}
              className="text-xs hover:bg-[#132035] cursor-pointer text-[#EF4444] hover:text-[#EF4444] gap-2 py-1.5"
            >
              <Trash size={12} />
              <span>Delete</span>
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  return (
    <div className="space-y-6">
      {/* Prominent Outstanding billing banner */}
      <div className="bg-[#F97316]/5 border border-[#F97316]/20 rounded-[10px] p-5 flex items-center justify-between select-none">
        <div>
          <span className="text-[10px] text-[#4A6480] uppercase tracking-wider font-semibold">Client Billing Summary</span>
          <h2 className="text-xl font-bold text-[#F97316] mt-1 font-mono">
            Outstanding: {formatCurrency(totalOutstanding)}
          </h2>
        </div>
        <Button
          onClick={handleOpenGenerateModal}
          size="sm"
          className="bg-[#1B4FD8] hover:bg-[#2563EB] text-white text-xs h-8 gap-1.5 cursor-pointer font-semibold"
        >
          <Plus size={13} />
          <span>Generate Invoice</span>
        </Button>
      </div>

      {/* Header controls strip */}
      <div className="flex items-center justify-between select-none">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#4A6480]">
          Invoice History ({invoices.length})
        </h3>

        <Button
          onClick={fetchInvoices}
          disabled={isLoading}
          size="sm"
          className="bg-[#132035] hover:bg-[#1A2D47] border border-[#1E3352] text-[#8BA3C7] hover:text-[#F0F4FF] text-xs h-8 gap-1.5 cursor-pointer"
        >
          <RefreshCw size={13} className={`stroke-[1.5] ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </Button>
      </div>

      {/* Invoices DataTable */}
      <DataTable
        columns={columns}
        data={invoices as unknown as Record<string, unknown>[]}
        rowActions={rowActions}
        loading={isLoading}
        emptyState={{
          icon: FileText,
          title: 'No Invoices Raised',
          description: 'Raise custom billing invoices for Indian GST auto-calculations.',
          actionLabel: 'Generate Invoice',
          onAction: handleOpenGenerateModal,
        }}
      />

      {/* ━━━ MODAL: GENERATE INVOICE ━━━ */}
      <Dialog open={generateModalOpen} onOpenChange={setGenerateModalOpen}>
        <DialogContent className="bg-[#0D1829] border border-[#1E3352] text-[#F0F4FF] max-w-md select-none">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-[#F0F4FF]">Raise Billing Invoice</DialogTitle>
            <DialogDescription className="text-xs text-[#8BA3C7]">
              Raise invoice for services. Subtotal amounts automatically compute 18% GST.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4 my-2 text-xs">
            <div className="space-y-1">
              <label className="label">Invoice Number *</label>
              <input
                type="text"
                value={invoiceForm.invoice_number}
                onChange={(e) => setInvoiceForm((p) => ({ ...p, invoice_number: e.target.value }))}
                className="input h-9 font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="label">Subtotal Amount (₹) *</label>
              <input
                type="number"
                placeholder="e.g. 20000"
                value={invoiceForm.amount}
                onChange={(e) => setInvoiceForm((p) => ({ ...p, amount: e.target.value }))}
                className="input h-9"
              />
            </div>

            <div className="col-span-2 space-y-1">
              <label className="label">Invoice Description *</label>
              <input
                type="text"
                placeholder="e.g. Monthly SEO Services"
                value={invoiceForm.description}
                onChange={(e) => setInvoiceForm((p) => ({ ...p, description: e.target.value }))}
                className="input h-9"
              />
            </div>

            <div className="space-y-1">
              <label className="label">Issue Date</label>
              <input
                type="date"
                value={invoiceForm.issued_date}
                onChange={(e) => setInvoiceForm((p) => ({ ...p, issued_date: e.target.value }))}
                className="input h-9 font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="label">Due Date</label>
              <input
                type="date"
                value={invoiceForm.due_date}
                onChange={(e) => setInvoiceForm((p) => ({ ...p, due_date: e.target.value }))}
                className="input h-9 font-mono"
              />
            </div>

            <div className="col-span-2 space-y-1">
              <label className="label">Additional Notes</label>
              <textarea
                placeholder="GST details, payment guidelines..."
                value={invoiceForm.notes}
                onChange={(e) => setInvoiceForm((p) => ({ ...p, notes: e.target.value }))}
                rows={2}
                className="input resize-none"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setGenerateModalOpen(false)}
              className="bg-transparent border-[#1E3352] text-[#8BA3C7] hover:bg-[#132035] hover:text-[#F0F4FF] cursor-pointer"
            >
              Cancel
            </Button>
            <Button onClick={handleGenerateInvoice} className="bg-[#1B4FD8] hover:bg-[#2563EB] text-white cursor-pointer">
              Raise Invoice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ━━━ MODAL: MARK PAID ━━━ */}
      <Dialog open={markPaidOpen} onOpenChange={setMarkPaidOpen}>
        <DialogContent className="bg-[#0D1829] border border-[#1E3352] text-[#F0F4FF] max-w-sm select-none">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-[#F0F4FF]">Record Payment</DialogTitle>
            <DialogDescription className="text-xs text-[#8BA3C7]">
              Specify the date and method for recording invoice payment.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 my-2 text-xs">
            <div className="space-y-1">
              <label className="label">Payment Date</label>
              <input
                type="date"
                value={paymentForm.paid_date}
                onChange={(e) => setPaymentForm((p) => ({ ...p, paid_date: e.target.value }))}
                className="input h-9 font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="label">Payment Method</label>
              <select
                value={paymentForm.payment_method}
                onChange={(e) => setPaymentForm((p) => ({ ...p, payment_method: e.target.value }))}
                className="input h-9"
              >
                <option value="Bank Transfer">Bank Transfer (IMPS/NEFT)</option>
                <option value="UPI">UPI (GPay/PhonePe)</option>
                <option value="Credit Card">Credit Card</option>
                <option value="Cash">Cash</option>
                <option value="Other">Other / Cheque</option>
              </select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setMarkPaidOpen(false); setSelectedInvoice(null); }}
              className="bg-transparent border-[#1E3352] text-[#8BA3C7] hover:bg-[#132035] cursor-pointer"
            >
              Cancel
            </Button>
            <Button onClick={handleMarkPaid} className="bg-[#22C55E] hover:bg-[#16A34A] text-white cursor-pointer">
              Record Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default InvoicesTab;
