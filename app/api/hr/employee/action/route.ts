import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();

    // 1. Authenticate check
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Role authorization check
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', currentUser.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 3. Parse parameters
    const body = await req.json();
    const { action, employeeId } = body;

    if (!action || !employeeId) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const supabaseAdmin = createAdminClient();

    // Fetch employee profile details for naming & logs
    const { data: empProfile, error: profileErr } = await supabaseAdmin
      .from('profiles')
      .select('full_name, is_active')
      .eq('id', employeeId)
      .single();

    if (profileErr || !empProfile) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    if (action === 'reset-password') {
      // Generate new 8-char password
      const tempPassword = Math.random().toString(36).slice(-8);

      const { error: resetErr } = await supabaseAdmin.auth.admin.updateUserById(employeeId, {
        password: tempPassword,
      });

      if (resetErr) throw resetErr;

      // Log activity
      await supabaseAdmin.from('activity_log').insert({
        user_id: currentUser.id,
        action: 'employee_password_reset',
        entity_type: 'employee',
        entity_id: employeeId,
        title: 'Employee password reset',
        description: `Password reset for employee: ${empProfile.full_name}`,
      });

      return NextResponse.json({ success: true, tempPassword });
    } 
    
    if (action === 'toggle-status') {
      const nextActiveStatus = !empProfile.is_active;

      // 1. Update profiles table
      const { error: updateProfileErr } = await supabaseAdmin
        .from('profiles')
        .update({ is_active: nextActiveStatus })
        .eq('id', employeeId);

      if (updateProfileErr) throw updateProfileErr;

      // 2. Update end_date on employees table
      const todayStr = new Date().toISOString().split('T')[0];
      const { error: updateEmpErr } = await supabaseAdmin
        .from('employees')
        .update({ end_date: nextActiveStatus ? null : todayStr })
        .eq('id', employeeId);

      if (updateEmpErr) {
        console.error('Error updating employee end date:', updateEmpErr);
      }

      // 3. Log activity
      await supabaseAdmin.from('activity_log').insert({
        user_id: currentUser.id,
        action: nextActiveStatus ? 'employee_activated' : 'employee_deactivated',
        entity_type: 'employee',
        entity_id: employeeId,
        title: nextActiveStatus ? 'Employee activated' : 'Employee deactivated',
        description: `Employee ${empProfile.full_name} is now ${nextActiveStatus ? 'active' : 'inactive'}.`,
      });

      return NextResponse.json({ success: true, is_active: nextActiveStatus });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err) {
    console.error('Employee action API error:', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to execute employee action' }, { status: 500 });
  }
}
