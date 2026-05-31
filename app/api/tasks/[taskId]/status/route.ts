import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function PATCH(
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

    // Get profile
    const { data: profile } = await adminSupabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 403 });
    }

    const body = await req.json();
    const { status } = body;

    if (!status) {
      return NextResponse.json({ error: 'Status is required' }, { status: 400 });
    }

    // Employees can only update their own tasks
    const query = adminSupabase
      .from('tasks')
      .update({
        status,
        ...(status === 'done' ? { completed_at: new Date().toISOString() } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq('id', taskId);

    // Non-admins can only update their own tasks
    if (profile.role !== 'admin') {
      query.eq('assigned_to', user.id);
    }

    const { data: updatedTask, error } = await query.select('*').single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Log activity if done
    if (status === 'done') {
      await adminSupabase.from('activity_log').insert({
        action: 'task_completed',
        title: 'Task completed',
        description: `Task "${updatedTask.title}" marked as completed`,
        client_id: updatedTask.client_id,
        user_id: user.id,
        entity_type: 'task',
        entity_id: taskId,
      });
    }

    return NextResponse.json({ success: true, task: updatedTask });
  } catch (err) {
    const error = err as Error;
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
