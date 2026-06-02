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

    // 2. Fetch active paying clients (exclude self agency client)
    const { data: clients, error: clientsErr } = await supabase
      .from('clients')
      .select('*')
      .eq('status', 'active')
      .eq('is_agency_self', false)
      .gt('monthly_retainer', 0);

    if (clientsErr) throw clientsErr;

    if (!clients || clients.length === 0) {
      return NextResponse.json({ success: true, message: 'No active paying clients found to invoice.' });
    }

    // 3. Fetch invoice counter setting
    const { data: setting } = await supabase
      .from('agency_settings')
      .select('value')
      .eq('key', 'invoice_counter')
      .maybeSingle();

    let counter = 1;
    if (setting?.value !== undefined && setting?.value !== null) {
      counter = typeof setting.value === 'number' ? setting.value : Number(setting.value);
      if (isNaN(counter)) counter = 1;
    }

    const currentYear = new Date().getFullYear();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentMonthName = months[new Date().getMonth()];
    const monthYearStr = `${currentMonthName} ${currentYear}`;

    const generatedInvoices = [];

    // 4. Generate invoice for each client
    for (let i = 0; i < clients.length; i++) {
      const client = clients[i];
      const baseRetainer = Number(client.monthly_retainer || 0);

      // 18% GST
      const gstRate = 18;
      const gstAmount = Number((baseRetainer * 0.18).toFixed(2));
      const totalAmount = Number((baseRetainer + gstAmount).toFixed(2));

      // VG-YYYY-XXX invoice pattern
      const invoiceNumber = `VG-${currentYear}-${String(counter).padStart(3, '0')}`;

      // Insert invoice
      const { data: invoice, error: invoiceErr } = await supabase
        .from('invoices')
        .insert({
          client_id: client.id,
          invoice_number: invoiceNumber,
          month_year: monthYearStr,
          description: `Digital Marketing Retainer Services — ${monthYearStr}`,
          amount: baseRetainer,
          gst_rate: gstRate,
          gst_amount: gstAmount,
          total_amount: totalAmount,
          status: 'pending',
          issued_date: new Date().toISOString().slice(0, 10),
          due_date: new Date().toISOString().slice(0, 10), // payable on receipt
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (invoiceErr) {
        console.error(`Failed to generate invoice for client ${client.name}:`, invoiceErr);
        continue;
      }

      generatedInvoices.push(invoice);
      counter++;

      // Log activity
      await supabase.from('activity_log').insert({
        client_id: client.id,
        action: 'invoice_created',
        entity_type: 'invoice',
        entity_id: invoice.id,
        title: `Monthly invoice ${invoiceNumber} generated`,
        description: `Automated 1st of month invoice raised for ${client.name}: ₹${totalAmount.toLocaleString('en-IN')}`,
      });
    }

    // 5. Save updated invoice counter
    await supabase
      .from('agency_settings')
      .update({
        value: counter,
        updated_at: new Date().toISOString(),
      })
      .eq('key', 'invoice_counter');

    // 6. Broadcast notification to admins
    const { data: admins } = await supabase.from('profiles').select('id').eq('role', 'admin');
    if (admins && admins.length > 0 && generatedInvoices.length > 0) {
      const notifs = admins.map((a) => ({
        user_id: a.id,
        type: 'invoice_created',
        title: '🧾 Invoices Generated Successfully',
        message: `Automated billing completed: ${generatedInvoices.length} invoices generated for active clients.`,
        link: '/dashboard/finance',
        is_read: false,
        priority: 'normal',
      }));
      await supabase.from('notifications').insert(notifs);
    }

    return NextResponse.json({
      success: true,
      message: `Billing generated successfully: ${generatedInvoices.length} invoices created.`,
      invoices: generatedInvoices.map((inv) => inv.invoice_number),
    });
  } catch (err: any) {
    console.error('[Generate Invoices API Error]:', err);
    return NextResponse.json({ error: err.message || 'Failed to generate monthly invoices' }, { status: 500 });
  }
}

// Support GET for testing convenience if triggered with credentials, but POST preferred in prod
export async function GET(req: NextRequest) {
  return POST(req);
}
