import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(
  req: NextRequest,
  props: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await props.params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    const adminSupabase = createAdminClient();

    // Verify user is employee and task is assigned to them
    const { data: task, error: taskError } = await adminSupabase
      .from('tasks')
      .select('*, clients(name)')
      .eq('id', taskId)
      .eq('assigned_to', user.id)
      .single();

    if (taskError || !task) {
      return NextResponse.json({ error: 'Task not found or not assigned to you' }, { status: 404 });
    }

    const body = await req.json();
    const { notes } = body;

    // Insert task submission record
    const { error: submissionError } = await adminSupabase
      .from('task_submissions')
      .insert({
        task_id: taskId,
        submitted_by: user.id,
        notes: notes || null,
      });

    if (submissionError) {
      return NextResponse.json({ error: submissionError.message }, { status: 500 });
    }

    // Update task status to 'review'
    const { error: updateError } = await adminSupabase
      .from('tasks')
      .update({ status: 'review', updated_at: new Date().toISOString() })
      .eq('id', taskId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Log activity
    await adminSupabase.from('activity_log').insert({
      action: 'task_submitted',
      title: `Task submitted for review`,
      description: `Task "${task.title}" submitted for review`,
      client_id: task.client_id,
      user_id: user.id,
      entity_type: 'task',
      entity_id: taskId,
    });

    // Get admin users to notify
    const { data: admins } = await adminSupabase
      .from('profiles')
      .select('id')
      .eq('role', 'admin');

    // Insert notification for each admin
    if (admins && admins.length > 0) {
      const { data: profile } = await adminSupabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();

      const notificationInserts = admins.map((admin) => ({
        user_id: admin.id,
        type: 'task_submitted',
        title: `Review needed: ${task.title}`,
        message: `${profile?.full_name || 'An employee'} submitted "${task.title}" for review${notes ? ': ' + notes.slice(0, 80) : ''}`,
        link: `/dashboard/deliverables`,
        is_read: false,
      }));

      await adminSupabase.from('notifications').insert(notificationInserts);
    }

    return NextResponse.json({ success: true, message: 'Task submitted for review' });
  } catch (err) {
    const error = err as Error;
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
