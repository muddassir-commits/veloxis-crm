import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { Resend } from 'resend';
import { logAudit } from '@/lib/audit';

export async function POST(req: Request) {
  try {
    const payload = await req.json();
    const {
      client_id,
      invoice_number,
      month_year,
      description,
      amount,
      gst_rate,
      gst_amount,
      total_amount,
      issued_date,
      due_date,
      payment_method,
      notes,
      send_email,
      counter_val,
    } = payload;

    if (!client_id || !invoice_number || !amount) {
      return NextResponse.json({ error: 'Missing required invoice parameters' }, { status: 400 });
    }

    const supabase = await createClient();

    // 1. Get client name & email for notifications
    const { data: client, error: clientErr } = await supabase
      .from('clients')
      .select('name, email')
      .eq('id', client_id)
      .single();

    if (clientErr || !client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    // 2. Insert Invoice
    const { data: invoice, error: invoiceErr } = await supabase
      .from('invoices')
      .insert({
        client_id,
        invoice_number,
        month_year,
        description,
        amount,
        gst_rate,
        gst_amount,
        total_amount,
        status: 'pending',
        issued_date,
        due_date,
        payment_method,
        notes,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (invoiceErr) {
      throw invoiceErr;
    }

    // 3. Update invoice counter in agency_settings
    const nextCounter = (counter_val || 0) + 1;
    const { error: settingsErr } = await supabase
      .from('agency_settings')
      .update({ value: JSON.stringify(nextCounter), updated_at: new Date().toISOString() })
      .eq('key', 'invoice_counter');

    if (settingsErr) {
      console.error('Error updating settings counter:', settingsErr);
    }

    // 4. Log to activity_log
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('activity_log').insert({
      user_id: user?.id || null,
      client_id,
      action: 'invoice_created',
      entity_type: 'invoice',
      entity_id: invoice.id,
      title: `Invoice ${invoice_number} generated`,
      description: `Invoice worth ₹${total_amount} raised for ${client.name}.`,
    });

    // 4a. Immutable system audit log
    await logAudit({
      userId: user?.id || null,
      action: 'INSERT',
      tableName: 'invoices',
      recordId: invoice.id,
      newValues: invoice,
      request: req,
    });

    // 4b. Notify all admins — new invoice created
    const { data: admins } = await supabase.from('profiles').select('id').eq('role', 'admin');
    if (admins && admins.length > 0) {
      const notifs = admins.map((a) => ({
        user_id: a.id,
        type: 'invoice_created',
        title: `🧾 Invoice ${invoice_number} raised`,
        message: `New invoice for ${client.name}: ₹${Number(total_amount).toLocaleString('en-IN')} — due ${due_date || 'on receipt'}.`,
        link: `/dashboard/finance`,
        is_read: false,
        priority: 'low',
      }));
      await supabase.from('notifications').insert(notifs);
    }

    // 5. Optionally send email via Resend
    if (send_email && client.email) {
      const resendKey = process.env.RESEND_API_KEY || '';
      const isMockResend = !resendKey || resendKey.startsWith('re_your_');

      const formattedTotal = new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
      }).format(total_amount);

      if (isMockResend) {
        console.log(`[MOCK EMAIL] To: ${client.email}, Subject: Invoice Raised: ${invoice_number}`);
      } else {
        const resend = new Resend(resendKey);
        const { data, error: sendError } = await resend.emails.send({
          from: `${process.env.RESEND_FROM_NAME || 'Veloxis Global'} <${process.env.RESEND_FROM_EMAIL || 'ops@veloxisglobal.com'}>`,
          to: client.email,
          subject: `Invoice Raised: ${invoice_number} — ${process.env.RESEND_FROM_NAME || 'Veloxis Global'}`,
          html: `
            <h2>New Invoice Raised</h2>
            <p>Dear ${client.name},</p>
            <p>A new invoice has been raised for your active digital marketing services:</p>
            <ul>
              <li><strong>Invoice Number:</strong> ${invoice_number}</li>
              <li><strong>Description:</strong> ${description || 'Digital Marketing Services'}</li>
              <li><strong>Amount Due:</strong> ${formattedTotal}</li>
              <li><strong>Due Date:</strong> ${due_date ? new Date(due_date).toLocaleDateString('en-IN') : 'Upon receipt'}</li>
            </ul>
            <p>You can view, download, or pay this invoice inside your Client Portal at <a href="https://portal.veloxisglobal.com">portal.veloxisglobal.com</a>.</p>
            <p>Thank you for partnering with Veloxis Global!</p>
            <br />
            <p>Warm regards,</p>
            <p><strong>Finance Department</strong></p>
            <p>${process.env.RESEND_FROM_NAME || 'Veloxis Global'}</p>
          `,
        });

        if (sendError) {
          throw new Error(`Resend Error: ${sendError.message}`);
        }
      }
    }

    return NextResponse.json({ success: true, invoice });
  } catch (err) {
    console.error('Invoice generation API error:', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to generate invoice' }, { status: 500 });
  }
}
