import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const revalidate = 0;

export async function POST(req: NextRequest) {
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

    const supabase = createAdminClient();

    // 2. Fetch active external clients (excluding agency self)
    const { data: clients, error: clientsErr } = await supabase
      .from('clients')
      .select('*')
      .eq('status', 'active')
      .eq('is_agency_self', false);

    if (clientsErr) throw clientsErr;

    if (!clients || clients.length === 0) {
      return NextResponse.json({ success: true, message: 'No active clients found.' });
    }

    const currentYear = new Date().getFullYear();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentMonthName = months[new Date().getMonth()];
    const monthYearStr = `${currentMonthName} ${currentYear}`;

    // Target the 15th of the current month
    const dueDate = new Date(currentYear, new Date().getMonth(), 15).toISOString().slice(0, 10);
    const generatedTasks = [];

    // 3. Insert monthly call task for each client
    for (let i = 0; i < clients.length; i++) {
      const client = clients[i];

      // Check if call task already exists to avoid duplication
      const { data: existing } = await supabase
        .from('tasks')
        .select('id')
        .eq('client_id', client.id)
        .eq('month_year', monthYearStr)
        .ilike('title', '%Alignment Call%')
        .maybeSingle();

      if (existing) {
        console.log(`Alignment Call task already exists for client ${client.name} in ${monthYearStr}`);
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
      const notifs = admins.map((a) => ({
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

    return NextResponse.json({
      success: true,
      message: `Tasks generated successfully: ${generatedTasks.length} alignment calls scheduled.`,
      count: generatedTasks.length,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Failed to generate monthly call tasks';
    console.error('[Generate Monthly Calls API Error]:', err);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}

// Support GET for testing convenience
export async function GET(req: NextRequest) {
  return POST(req);
}
