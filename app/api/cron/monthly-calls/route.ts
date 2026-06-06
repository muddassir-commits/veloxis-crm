import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const revalidate = 0;

export async function POST(req: NextRequest) {
  const startedAt = new Date().toISOString();
  let jobId: string | null = null;
  let supabase: any = null;

  try {
    // 1. Verify CRON_SECRET or shared secret
    let secret = req.headers.get('x-cron-secret');
    if (!secret) {
      const url = new URL(req.url);
      secret = url.searchParams.get('secret');
    }

    if (!secret || secret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    supabase = createAdminClient();

    // Look up the cron job ID
    const { data: job } = await supabase
      .from('cron_jobs')
      .select('id')
      .eq('name', 'Monthly Client Call Task Generator')
      .maybeSingle();

    if (job) {
      jobId = job.id;
    }

    // 2. Fetch active external clients (excluding agency self)
    const { data: clients, error: clientsErr } = await supabase
      .from('clients')
      .select('*')
      .eq('status', 'active')
      .eq('is_agency_self', false);

    if (clientsErr) throw clientsErr;

    if (!clients || clients.length === 0) {
      const message = 'No active clients found.';
      if (jobId) {
        await supabase.from('cron_job_runs').insert({
          job_id: jobId,
          started_at: startedAt,
          ended_at: new Date().toISOString(),
          status: 'success',
          output: { count: 0, skippedCount: 0, skipped: [], message }
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

    // Target the 15th of the current month
    const dueDate = new Date(currentYear, new Date().getMonth(), 15).toISOString().slice(0, 10);
    const generatedTasks = [];
    const skippedClients: string[] = [];

    // 3. Insert monthly call task for each client
    for (let i = 0; i < clients.length; i++) {
      const client = clients[i];

      // Check if call task already exists to avoid duplication (Hardened Duplicate Guard)
      const { data: existing, error: checkErr } = await supabase
        .from('tasks')
        .select('id')
        .eq('client_id', client.id)
        .eq('month_year', monthYearStr)
        .ilike('title', '%Alignment Call%')
        .limit(1);

      if (checkErr) {
        console.error(`Error checking alignment call existence for client ${client.name}:`, checkErr);
        skippedClients.push(client.name);
        continue; // skip creating the task if existence check itself fails
      }

      if (existing && existing.length > 0) {
        console.log(`Alignment Call task already exists for client ${client.name} in ${monthYearStr}`);
        skippedClients.push(client.name);
        continue;
      }

      const { data: task, error: taskErr } = await supabase
        .from('tasks')
        .insert({
          client_id: client.id,
          title: `Monthly Client Alignment Call — ${monthYearStr}`,
          description: `Conduct alignment call with client to review performance metrics, campaigns, and overall delivery tracker status.`,
          instructions: `1. Schedule call with client contacts.\n2. Review GSC, GA4, Meta/Google Ads performance dashboard together.\n3. Log notes, feedback, and action items in Client Relations dashboard.`,
          status: 'todo',
          priority: 'medium',
          due_date: dueDate,
          month_year: monthYearStr,
          assigned_to: client.assigned_to || null,
          estimated_hours: 1,
          department: 'content',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (taskErr) {
        console.error(`Error generating call task for client ${client.name}:`, taskErr);
        continue;
      }

      generatedTasks.push(task);

      // Audit Trail Log
      await supabase.from('audit_logs').insert({
        user_id: null, // System action
        action: 'INSERT',
        table_name: 'tasks',
        record_id: task.id,
        new_values: task,
      });
    }

    // 4. Broadcast notification to admins
    const { data: admins } = await supabase.from('profiles').select('id').eq('role', 'admin');
    if (admins && admins.length > 0 && generatedTasks.length > 0) {
      const notifs = admins.map((a: any) => ({
        user_id: a.id,
        type: 'task_submitted',
        title: '📞 Monthly Alignment Calls Scheduled',
        message: `Scheduled ${generatedTasks.length} client alignment calls due on the 15th.`,
        link: '/dashboard/deliverables',
        is_read: false,
        priority: 'normal',
      }));
      await supabase.from('notifications').insert(notifs);
    }

    // 5. Update runs log with result
    if (jobId) {
      await supabase.from('cron_job_runs').insert({
        job_id: jobId,
        started_at: startedAt,
        ended_at: new Date().toISOString(),
        status: 'success',
        output: {
          count: generatedTasks.length,
          skippedCount: skippedClients.length,
          skipped: skippedClients,
          message: `Tasks generated successfully: ${generatedTasks.length} alignment calls scheduled, ${skippedClients.length} skipped.`
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
      message: `Tasks generated successfully: ${generatedTasks.length} alignment calls scheduled, ${skippedClients.length} skipped.`,
      count: generatedTasks.length,
      skipped: skippedClients
    });
  } catch (err: any) {
    const endedAt = new Date().toISOString();
    const errorMsg = err instanceof Error ? err.message : 'Failed to generate monthly call tasks';
    console.error('[Generate Monthly Calls API Error]:', err);

    if (supabase && jobId) {
      try {
        await supabase.from('cron_job_runs').insert({
          job_id: jobId,
          started_at: startedAt,
          ended_at: endedAt,
          status: 'failed',
          error: errorMsg,
          output: { error: errorMsg }
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

    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}

// Support GET for testing convenience
export async function GET(req: NextRequest) {
  return POST(req);
}
