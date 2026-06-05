import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const revalidate = 0;

export async function POST(req: NextRequest) {
  const startedAt = new Date().toISOString();
  let jobId: string | null = null;
  let supabase;

  try {
    // 1. Verify CRON_SECRET or shared secret
    const secret = req.headers.get('x-cron-secret');
    if (!secret || secret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    supabase = createAdminClient();

    // Look up the cron job ID
    const { data: job } = await supabase
      .from('cron_jobs')
      .select('id')
      .eq('name', 'Monthly Invoice Generator')
      .maybeSingle();
    
    if (job) {
      jobId = job.id;
    }

    // 2. Fetch active paying clients (exclude self agency client)
    const { data: clients, error: clientsErr } = await supabase
      .from('clients')
      .select('*')
      .eq('status', 'active')
      .eq('is_agency_self', false)
      .gt('monthly_retainer', 0);

    if (clientsErr) throw clientsErr;

    if (!clients || clients.length === 0) {
      const message = 'No active paying clients found to invoice.';
      if (jobId) {
        await supabase.from('cron_job_runs').insert({
          job_id: jobId,
          started_at: startedAt,
          ended_at: new Date().toISOString(),
          status: 'success',
          output: { count: 0, invoices: [], message }
        });
        await supabase
          .from('cron_jobs')
          .update({
            last_run: startedAt,
            last_status: 'success',
            updated_at: new Date().toISOString()
          })
          .eq('id', jobId);
      }
      return NextResponse.json({ success: true, message });
    }



    const currentYear = new Date().getFullYear();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentMonthName = months[new Date().getMonth()];
    const monthYearStr = `${currentMonthName} ${currentYear}`;

    const generatedInvoices = [];
    const skippedClients: string[] = [];

    // 4. Generate invoice for each client
    for (let i = 0; i < clients.length; i++) {
      const client = clients[i];

      // Check if invoice already exists for this client and month
      const { data: existingInvoices, error: checkErr } = await supabase
        .from('invoices')
        .select('id')
        .eq('client_id', client.id)
        .eq('month_year', monthYearStr);

      if (checkErr) throw checkErr;

      if (existingInvoices && existingInvoices.length > 0) {
        console.log(`Skipping invoice generation for client ${client.name}: already invoiced for ${monthYearStr}`);
        skippedClients.push(client.name);
        continue;
      }

      const baseRetainer = Number(client.monthly_retainer || 0);

      // 18% GST
      const gstRate = 18;
      const gstAmount = Number((baseRetainer * 0.18).toFixed(2));
      const totalAmount = Number((baseRetainer + gstAmount).toFixed(2));

      // Get next sequence value atomically
      const { data: nextCounter, error: rpcError } = await supabase.rpc('get_next_invoice_counter');
      if (rpcError) throw rpcError;

      // VG-YYYY-XXX invoice pattern
      const invoiceNumber = `VG-${currentYear}-${String(nextCounter).padStart(3, '0')}`;

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

    if (jobId) {
      await supabase.from('cron_job_runs').insert({
        job_id: jobId,
        started_at: startedAt,
        ended_at: new Date().toISOString(),
        status: 'success',
        output: {
          count: generatedInvoices.length,
          skippedCount: skippedClients.length,
          skipped: skippedClients,
          invoices: generatedInvoices.map((inv) => inv.invoice_number),
          message: `Billing generated successfully: ${generatedInvoices.length} invoices created, ${skippedClients.length} skipped.`
        }
      });
      await supabase
        .from('cron_jobs')
        .update({
          last_run: startedAt,
          last_status: 'success',
          updated_at: new Date().toISOString()
        })
        .eq('id', jobId);
    }

    return NextResponse.json({
      success: true,
      message: `Billing generated successfully: ${generatedInvoices.length} invoices created, ${skippedClients.length} skipped.`,
      invoices: generatedInvoices.map((inv) => inv.invoice_number),
      skipped: skippedClients,
    });
  } catch (err) {
    console.error('[Generate Invoices API Error]:', err);
    
    const endedAt = new Date().toISOString();
    const errMsg = err instanceof Error ? err.message : 'Failed to generate monthly invoices';
    
    if (supabase && jobId) {
      try {
        await supabase.from('cron_job_runs').insert({
          job_id: jobId,
          started_at: startedAt,
          ended_at: endedAt,
          status: 'failed',
          error: errMsg,
          output: { error: errMsg }
        });
        await supabase
          .from('cron_jobs')
          .update({
            last_run: startedAt,
            last_status: 'failed',
            updated_at: new Date().toISOString()
          })
          .eq('id', jobId);
      } catch (logErr) {
        console.error('Failed to log cron error to DB:', logErr);
      }
    }

    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}

// Support GET for testing convenience if triggered with credentials, but POST preferred in prod
export async function GET(req: NextRequest) {
  return POST(req);
}
