import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import {
  FileText,
  Download,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ExternalLink,
  IndianRupee,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';

export const revalidate = 0;

export default async function InvoicesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  // Retrieve client associated with this portal user
  const { data: client } = await supabase
    .from('clients')
    .select('*')
    .eq('portal_user_id', user.id)
    .single();

  if (!client) redirect('/login');

  // Fetch client invoices (join with files to get the PDF link)
  const { data: invoices } = await supabase
    .from('invoices')
    .select('*, files(*)')
    .eq('client_id', client.id)
    .neq('status', 'draft')
    .order('issued_date', { ascending: false });

  // Calculate billing statistics
  const outstandingInvoices = (invoices || []).filter(
    (inv) => inv.status === 'pending' || inv.status === 'sent' || inv.status === 'overdue'
  );
  const outstandingTotal = outstandingInvoices.reduce((sum, inv) => sum + Number(inv.total_amount || inv.amount || 0), 0);

  const overdueInvoices = (invoices || []).filter((inv) => inv.status === 'overdue');
  const overdueTotal = overdueInvoices.reduce((sum, inv) => sum + Number(inv.total_amount || inv.amount || 0), 0);

  const paidInvoices = (invoices || []).filter((inv) => inv.status === 'paid');
  const paidTotal = paidInvoices.reduce((sum, inv) => sum + Number(inv.total_amount || inv.amount || 0), 0);

  const STATUS_PILLS: Record<string, string> = {
    pending: 'bg-amber-50 text-amber-600 border border-amber-200',
    sent: 'bg-blue-50 text-blue-600 border border-blue-200',
    overdue: 'bg-rose-50 text-rose-600 border border-rose-200',
    paid: 'bg-green-50 text-green-600 border border-green-200',
    cancelled: 'bg-slate-50 text-slate-400 border border-slate-200',
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-lg font-bold text-text-primary">Invoices & Billing Statement</h1>
        <p className="text-xs text-text-secondary mt-0.5">
          View your payment history, check outstanding balances, and download invoice copies.
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {/* Total Outstanding */}
        <div className="bg-bg-light border border-border rounded-[10px] p-4 flex items-center justify-between shadow-xs">
          <div>
            <span className="text-[10px] text-text-secondary font-bold uppercase tracking-wider block">Outstanding Balance</span>
            <div className="flex items-center text-xl font-bold text-text-primary font-mono mt-1">
              <IndianRupee size={16} className="stroke-[2.5]" />
              <span>{outstandingTotal.toLocaleString('en-IN')}</span>
            </div>
            <span className="text-[9px] text-text-muted block mt-0.5">{outstandingInvoices.length} unpaid invoice(s)</span>
          </div>
          <div className="p-2 rounded-full bg-amber-50 text-amber-500">
            <Clock size={16} />
          </div>
        </div>

        {/* Overdue Amount */}
        <div className="bg-bg-light border border-border rounded-[10px] p-4 flex items-center justify-between shadow-xs">
          <div>
            <span className="text-[10px] text-text-secondary font-bold uppercase tracking-wider block">Overdue Amount</span>
            <div className="flex items-center text-xl font-bold text-rose-500 font-mono mt-1">
              <IndianRupee size={16} className="stroke-[2.5]" />
              <span>{overdueTotal.toLocaleString('en-IN')}</span>
            </div>
            <span className="text-[9px] text-text-muted block mt-0.5">{overdueInvoices.length} overdue invoice(s)</span>
          </div>
          <div className="p-2 rounded-full bg-rose-50 text-rose-500">
            <AlertTriangle size={16} />
          </div>
        </div>

        {/* Paid This Year */}
        <div className="bg-bg-light border border-border rounded-[10px] p-4 flex items-center justify-between shadow-xs">
          <div>
            <span className="text-[10px] text-text-secondary font-bold uppercase tracking-wider block">Total Payments Made</span>
            <div className="flex items-center text-xl font-bold text-green-500 font-mono mt-1">
              <IndianRupee size={16} className="stroke-[2.5]" />
              <span>{paidTotal.toLocaleString('en-IN')}</span>
            </div>
            <span className="text-[9px] text-text-muted block mt-0.5">{paidInvoices.length} paid invoice(s)</span>
          </div>
          <div className="p-2 rounded-full bg-green-50 text-green-500">
            <CheckCircle2 size={16} />
          </div>
        </div>
      </div>

      {/* Invoices List Table */}
      <div className="bg-bg-light border border-border rounded-[10px] p-5 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-text-primary">Billing History</h3>

        {!invoices || invoices.length === 0 ? (
          <div className="py-12 text-center text-xs text-text-muted space-y-2 border border-dashed border-border rounded-[8px]">
            <FileText size={28} className="mx-auto text-border" />
            <p className="font-semibold text-slate-500">No invoices generated yet</p>
            <p className="text-[10px]">Your billing statements will show up here once generated by Kanpur agency finance team.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-bg-light text-[9px] font-bold text-text-secondary uppercase tracking-wider">
                  <th className="p-3 pl-4">Invoice #</th>
                  <th className="p-3">Issue Date</th>
                  <th className="p-3">Due Date</th>
                  <th className="p-3">Amount</th>
                  <th className="p-3">GST (18%)</th>
                  <th className="p-3">Total Due</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right pr-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50 text-xs">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-bg-light text-text-secondary transition-colors">
                    <td className="p-3 pl-4 font-bold text-text-primary font-mono">
                      {inv.invoice_number}
                    </td>
                    <td className="p-3 font-mono">{formatDate(inv.issued_date)}</td>
                    <td className="p-3 font-mono">
                      {inv.due_date ? formatDate(inv.due_date) : '—'}
                    </td>
                    <td className="p-3 font-mono">₹{Number(inv.amount || 0).toLocaleString('en-IN')}</td>
                    <td className="p-3 font-mono">₹{Number(inv.gst_amount || 0).toLocaleString('en-IN')}</td>
                    <td className="p-3 font-bold font-mono text-text-primary">
                      ₹{Number(inv.total_amount || inv.amount || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${STATUS_PILLS[inv.status] || ''}`}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="p-3 text-right pr-4">
                      {inv.files?.public_url ? (
                        <div className="flex items-center justify-end gap-2">
                          <a
                            href={inv.files.public_url}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 rounded hover:bg-bg-elevated text-text-secondary hover:text-text-primary transition-colors"
                            title="Preview PDF"
                          >
                            <ExternalLink size={12} />
                          </a>
                          <a
                            href={inv.files.public_url}
                            download={`${inv.invoice_number}.pdf`}
                            className="p-1.5 rounded hover:bg-bg-elevated text-text-secondary hover:text-text-primary transition-colors"
                            title="Download PDF"
                          >
                            <Download size={12} />
                          </a>
                        </div>
                      ) : (
                        <span className="text-[10px] text-text-muted italic">No copy available</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
