import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(req: NextRequest) {
  try {
    const secret = req.headers.get('x-webhook-secret');
    if (!secret || secret !== process.env.N8N_WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { type, data } = body;

    if (!type || !data) {
      return NextResponse.json({ error: 'Missing type or data' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Helper: Notify all admins
    const notifyAdmins = async (title: string, message: string, notifType: string, link?: string, priority = 'normal') => {
      const { data: admins } = await supabase.from('profiles').select('id').eq('role', 'admin');
      if (admins && admins.length > 0) {
        const notifs = admins.map((a) => ({
          user_id: a.id,
          type: notifType,
          title,
          message,
          link: link || null,
          is_read: false,
          priority,
        }));
        await supabase.from('notifications').insert(notifs);
      }
    };

    switch (type) {
      case 'new_lead': {
        const { name, email, phone, website, message, source, industry, estimated_value, company, city } = data;
        if (!name) {
          return NextResponse.json({ error: 'Missing lead name' }, { status: 400 });
        }

        // Calculate score
        let score = 30; // base score
        const val = Number(estimated_value || 0);
        if (val >= 100000) score += 30;
        else if (val >= 50000) score += 20;
        else if (val >= 20000) score += 10;

        const src = source || 'website_audit_form';
        if (src === 'referral') score += 25;
        else if (src === 'website' || src === 'website_audit_form') score += 15;
        else if (src === 'linkedin') score += 10;
        else if (src === 'cold_whatsapp') score -= 10;

        const ind = (industry || '').toLowerCase();
        if (
          ind.includes('tech') ||
          ind.includes('software') ||
          ind.includes('ecommerce') ||
          ind.includes('finance') ||
          ind.includes('education') ||
          ind.includes('real estate')
        ) {
          score += 15;
        }
        const finalScore = Math.min(100, Math.max(0, score));

        // 1. Insert lead
        const { data: lead, error: leadErr } = await supabase
          .from('leads')
          .insert({
            name,
            email: email || null,
            phone: phone || null,
            website: website || null,
            notes: message || null,
            source: src,
            status: 'new',
            score: finalScore,
            industry: industry || null,
            estimated_value: val,
            company: company || null,
            city: city || null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (leadErr) throw leadErr;

        // 2. Insert notification
        await notifyAdmins(
          '🆕 New Lead Added',
          `New lead: ${name} from ${src} (Score: ${finalScore}/100, Value: ₹${val.toLocaleString('en-IN')})`,
          'lead_new',
          '/dashboard/sales',
          'high'
        );

        // 3. Log activity
        await supabase.from('activity_log').insert({
          action: 'lead_created',
          entity_type: 'lead',
          entity_id: lead.id,
          title: `Lead ${name} captured`,
          description: `Lead created via inbound webhook. Source: ${src}.`,
        });

        // 4. Log lead activity
        await supabase.from('lead_activities').insert({
          lead_id: lead.id,
          type: 'note',
          description: `Lead synced via website form. Auto-score: ${finalScore}/100.`,
          created_at: new Date().toISOString(),
        });

        return NextResponse.json({ success: true, lead_id: lead.id });
      }

      case 'invoice_paid': {
        const { invoice_id, payment_method, notes } = data;
        if (!invoice_id) {
          return NextResponse.json({ error: 'Missing invoice_id' }, { status: 400 });
        }

        const { data: invoice, error: fetchErr } = await supabase
          .from('invoices')
          .select('*, clients(name)')
          .eq('id', invoice_id)
          .single();

        if (fetchErr || !invoice) {
          return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
        }

        // Update status to paid
        const { error: updateErr } = await supabase
          .from('invoices')
          .update({
            status: 'paid',
            paid_date: new Date().toISOString().slice(0, 10),
            payment_method: payment_method || invoice.payment_method || 'upi',
            notes: notes || invoice.notes || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', invoice_id);

        if (updateErr) throw updateErr;

        // Insert notification
        const formattedAmount = Number(invoice.total_amount).toLocaleString('en-IN');
        await notifyAdmins(
          '💰 Invoice Paid',
          `₹${formattedAmount} received from ${invoice.clients?.name || 'Client'} (Invoice: ${invoice.invoice_number})`,
          'invoice_paid',
          '/dashboard/finance'
        );

        // Log activity
        await supabase.from('activity_log').insert({
          client_id: invoice.client_id,
          action: 'invoice_paid',
          entity_type: 'invoice',
          entity_id: invoice_id,
          title: `Invoice ${invoice.invoice_number} paid`,
          description: `Received ₹${formattedAmount} via automated payment flow.`,
        });

        return NextResponse.json({ success: true, invoice_number: invoice.invoice_number });
      }

      case 'task_submitted': {
        const { task_id, notes, employee_id } = data;
        if (!task_id) {
          return NextResponse.json({ error: 'Missing task_id' }, { status: 400 });
        }

        const { data: task, error: fetchErr } = await supabase
          .from('tasks')
          .select('*, clients(name)')
          .eq('id', task_id)
          .single();

        if (fetchErr || !task) {
          return NextResponse.json({ error: 'Task not found' }, { status: 404 });
        }

        // Insert task submission record
        await supabase.from('task_submissions').insert({
          task_id,
          submitted_by: employee_id || null,
          notes: notes || null,
          created_at: new Date().toISOString(),
        });

        // Update task status to review
        const { error: updateErr } = await supabase
          .from('tasks')
          .update({
            status: 'review',
            updated_at: new Date().toISOString(),
          })
          .eq('id', task_id);

        if (updateErr) throw updateErr;

        // Fetch employee full name if employee_id provided
        let employeeName = 'An employee';
        if (employee_id) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', employee_id)
            .single();
          if (profile) employeeName = profile.full_name;
        }

        // Insert notification
        await notifyAdmins(
          `Review needed: ${task.title}`,
          `${employeeName} submitted "${task.title}" for review (Client: ${task.clients?.name || 'Client'})`,
          'task_submitted',
          '/dashboard/deliverables'
        );

        // Log activity
        await supabase.from('activity_log').insert({
          client_id: task.client_id,
          user_id: employee_id || null,
          action: 'task_submitted',
          entity_type: 'task',
          entity_id: task_id,
          title: `Task submitted for review`,
          description: `Task "${task.title}" submitted by ${employeeName}.`,
        });

        return NextResponse.json({ success: true, task_title: task.title });
      }

      case 'invoice_overdue': {
        const { invoice_id } = data;
        if (!invoice_id) {
          return NextResponse.json({ error: 'Missing invoice_id' }, { status: 400 });
        }

        const { data: invoice, error: fetchErr } = await supabase
          .from('invoices')
          .select('*, clients(name)')
          .eq('id', invoice_id)
          .single();

        if (fetchErr || !invoice) {
          return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
        }

        // Update invoice status to overdue
        const { error: updateErr } = await supabase
          .from('invoices')
          .update({
            status: 'overdue',
            updated_at: new Date().toISOString(),
          })
          .eq('id', invoice_id);

        if (updateErr) throw updateErr;

        // Insert notification
        const formattedAmount = Number(invoice.total_amount).toLocaleString('en-IN');
        await notifyAdmins(
          `⚠️ Invoice Overdue: ${invoice.invoice_number}`,
          `${invoice.clients?.name || 'Client'} is outstanding ₹${formattedAmount} (Due Date: ${invoice.due_date})`,
          'invoice_overdue',
          '/dashboard/finance',
          'high'
        );

        // Log activity
        await supabase.from('activity_log').insert({
          client_id: invoice.client_id,
          action: 'invoice_overdue',
          entity_type: 'invoice',
          entity_id: invoice_id,
          title: `Invoice ${invoice.invoice_number} marked overdue`,
          description: `Invoice worth ₹${formattedAmount} for ${invoice.clients?.name || 'Client'} flagged overdue.`,
        });

        return NextResponse.json({ success: true, invoice_number: invoice.invoice_number });
      }

      case 'sync_complete': {
        const { job_name, status, output, error } = data;
        if (!job_name) {
          return NextResponse.json({ error: 'Missing job_name' }, { status: 400 });
        }

        // Find job by name
        const { data: job } = await supabase
          .from('cron_jobs')
          .select('id')
          .eq('name', job_name)
          .maybeSingle();

        if (job) {
          // Log run details
          await supabase.from('cron_job_runs').insert({
            job_id: job.id,
            status: status || 'success',
            started_at: new Date().toISOString(),
            ended_at: new Date().toISOString(),
            output: output || null,
            error: error || null,
          });

          // Update job last run metrics
          await supabase
            .from('cron_jobs')
            .update({
              last_run: new Date().toISOString(),
              last_status: status || 'success',
              updated_at: new Date().toISOString(),
            })
            .eq('id', job.id);
        }

        return NextResponse.json({ success: true });
      }

      case 'error': {
        const { message, workflow_name } = data;
        await notifyAdmins(
          `🔴 Automation Error: ${workflow_name || 'System'}`,
          `N8N automation workflow failed: ${message || 'Unknown execution failure.'}`,
          'error',
          '/dashboard/it',
          'urgent'
        );

        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json({ error: 'Unknown event type' }, { status: 400 });
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- cosmetic catch block error
  } catch (err: any) {
    console.error('[n8n Webhook Error]:', err);
    return NextResponse.json({ error: err.message || 'Failed to process webhook' }, { status: 500 });
  }
}
