import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logAudit } from '@/lib/audit';

export async function POST(req: Request) {
  try {
    const { invoice_id, paid_date, payment_method, amount_received } = await req.json();

    if (!invoice_id || !paid_date || !payment_method) {
      return NextResponse.json({ error: 'Missing required payment parameters' }, { status: 400 });
    }

    const supabase = await createClient();

    // 1. Fetch invoice and client name
    const { data: invoice, error: invoiceErr } = await supabase
      .from('invoices')
      .select('*, client:client_id(name)')
      .eq('id', invoice_id)
      .single();

    if (invoiceErr || !invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    const clientName = (invoice.client as { name: string } | null)?.name || 'Unknown Client';

    // 2. Update invoice status
    const { error: updateErr } = await supabase
      .from('invoices')
      .update({
        status: 'paid',
        paid_date,
        payment_method,
        updated_at: new Date().toISOString(),
      })
      .eq('id', invoice_id);

    if (updateErr) throw updateErr;

    // 3. Log activity: "Invoice paid: ₹X from [client]"
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('activity_log').insert({
      user_id: user?.id || null,
      client_id: invoice.client_id,
      action: 'invoice_paid',
      entity_type: 'invoice',
      entity_id: invoice_id,
      title: `Invoice ${invoice.invoice_number} paid`,
      description: `Invoice paid: ₹${Number(amount_received || invoice.total_amount).toLocaleString('en-IN')} from ${clientName}`,
    });

    // 3a. Immutable system audit log
    await logAudit({
      userId: user?.id || null,
      action: 'UPDATE',
      tableName: 'invoices',
      recordId: invoice_id,
      oldValues: { status: invoice.status, paid_date: invoice.paid_date, payment_method: invoice.payment_method },
      newValues: { status: 'paid', paid_date, payment_method },
      request: req,
    });

    // 3b. Notify all admins — payment received bell notification
    const { data: admins } = await supabase.from('profiles').select('id').eq('role', 'admin');
    if (admins && admins.length > 0) {
      const amountFormatted = `₹${Number(amount_received || invoice.total_amount).toLocaleString('en-IN')}`;
      const notifs = admins.map((a) => ({
        user_id: a.id,
        type: 'invoice_paid',
        title: `💰 Payment received — ${clientName}`,
        message: `Invoice ${invoice.invoice_number} paid: ${amountFormatted} via ${payment_method}.`,
        link: `/dashboard/finance`,
        is_read: false,
        priority: 'normal',
      }));
      await supabase.from('notifications').insert(notifs);
    }

    // 4. POST to /api/webhooks/n8n with type='invoice_paid'
    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      await fetch(`${appUrl}/api/webhooks/n8n`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'invoice_paid',
          invoice_id,
          invoice_number: invoice.invoice_number,
          client_id: invoice.client_id,
          client_name: clientName,
          amount: amount_received,
          paid_date,
          payment_method,
        }),
      });
    } catch (webhookErr) {
      console.error('Failed to trigger n8n webhook:', webhookErr);
      // We do not fail the request if the webhook fails, to prevent locking UI
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Invoice pay API error:', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to record payment' }, { status: 500 });
  }
}
