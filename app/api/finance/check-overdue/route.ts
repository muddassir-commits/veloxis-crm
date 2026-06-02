import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const revalidate = 0;

export async function POST(req: NextRequest) {
  try {
    // 1. Verify CRON_SECRET or shared secret
    const secret = req.headers.get('x-cron-secret');
    if (!secret || secret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient();

    // 2. Fetch pending invoices past their due dates
    const { data: invoices, error: fetchErr } = await supabase
      .from('invoices')
      .select('*, clients(name)')
      .in('status', ['pending', 'sent'])
      .lt('due_date', new Date().toISOString().slice(0, 10));

    if (fetchErr) throw fetchErr;

    if (!invoices || invoices.length === 0) {
      return NextResponse.json({ success: true, message: 'No overdue invoices found.' });
    }

    const overdueInvoiceIds = invoices.map((inv) => inv.id);

    // 3. Bulk update statuses to overdue
    const { error: updateErr } = await supabase
      .from('invoices')
      .update({
        status: 'overdue',
        updated_at: new Date().toISOString(),
      })
      .in('id', overdueInvoiceIds);

    if (updateErr) throw updateErr;

    const markedInvoices = [];

    // 4. Create activity logs and notifications
    for (let i = 0; i < invoices.length; i++) {
      const inv = invoices[i];
      const formattedAmount = Number(inv.total_amount).toLocaleString('en-IN');

      // Log activity
      await supabase.from('activity_log').insert({
        client_id: inv.client_id,
        action: 'invoice_overdue',
        entity_type: 'invoice',
        entity_id: inv.id,
        title: `Invoice ${inv.invoice_number} marked overdue`,
        description: `Overdue invoice identified by daily scheduler for ${inv.clients?.name || 'Client'}: ₹${formattedAmount} past due date ${inv.due_date}`,
      });

      // Broadcast notification
      const { data: admins } = await supabase.from('profiles').select('id').eq('role', 'admin');
      if (admins && admins.length > 0) {
        const notifs = admins.map((a) => ({
          user_id: a.id,
          type: 'invoice_overdue',
          title: `⚠️ Invoice Overdue: ${inv.invoice_number}`,
          message: `${inv.clients?.name || 'Client'} has an outstanding invoice of ₹${formattedAmount} (Due: ${inv.due_date})`,
          link: '/dashboard/finance',
          is_read: false,
          priority: 'high',
        }));
        await supabase.from('notifications').insert(notifs);
      }

      markedInvoices.push(inv.invoice_number);
    }

    return NextResponse.json({
      success: true,
      message: `Checked overdue invoices: ${markedInvoices.length} marked as overdue.`,
      marked_invoices: markedInvoices,
    });
  } catch (err: any) {
    console.error('[Check Overdue Invoices API Error]:', err);
    return NextResponse.json({ error: err.message || 'Failed to process overdue check' }, { status: 500 });
  }
}

// Support GET for testing convenience
export async function GET(req: NextRequest) {
  return POST(req);
}
