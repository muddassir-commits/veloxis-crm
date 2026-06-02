import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { logAudit } from '@/lib/audit';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();

    // 1. Authenticate user
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Fetch role authorization check
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', currentUser.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 3. Parse input parameters
    const body = await req.json();
    const { userId, action } = body;

    if (!userId || !action) {
      return NextResponse.json({ error: 'User ID and Action are required parameters' }, { status: 400 });
    }

    if (!['reset-password', 'deactivate', 'reactivate'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action selection' }, { status: 400 });
    }

    // Prevent admin from deactivating themselves
    if (userId === currentUser.id && action === 'deactivate') {
      return NextResponse.json({ error: 'You cannot deactivate your own admin profile' }, { status: 400 });
    }

    const supabaseAdmin = createAdminClient();

    // Fetch target profile details for audit logging
    const { data: targetProfile, error: targetProfileErr } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (targetProfileErr || !targetProfile) {
      return NextResponse.json({ error: 'Target user profile not found' }, { status: 404 });
    }

    if (action === 'reset-password') {
      // Generate secure temporary password
      const tempPassword = Math.random().toString(36).slice(-8) + 'A1!';

      // Update password in Supabase Auth
      const { error: resetErr } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: tempPassword,
      });

      if (resetErr) {
        throw resetErr;
      }

      // Log Audit Trail
      await logAudit({
        userId: currentUser.id,
        action: 'UPDATE',
        tableName: 'profiles',
        recordId: userId,
        oldValues: { password: '●●●●●●●●' },
        newValues: { password: tempPassword },
        request: req,
      });

      return NextResponse.json({
        success: true,
        message: 'Password reset successfully',
        tempPassword,
      });
    }

    if (action === 'deactivate') {
      // Update is_active in profiles table
      const { error: profileErr } = await supabaseAdmin
        .from('profiles')
        .update({ is_active: false })
        .eq('id', userId);

      if (profileErr) {
        throw profileErr;
      }

      // Ban user in Supabase Auth to invalidate session and prevent login (100 years ban)
      const { error: authErr } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        ban_duration: '876000h',
      });

      if (authErr) {
        console.error('Warning: could not set ban duration in auth:', authErr);
      }

      // Log Audit Trail
      await logAudit({
        userId: currentUser.id,
        action: 'UPDATE',
        tableName: 'profiles',
        recordId: userId,
        oldValues: { is_active: true },
        newValues: { is_active: false },
        request: req,
      });

      // Log CRM Activity log
      await supabaseAdmin.from('activity_log').insert({
        user_id: currentUser.id,
        action: 'profile_updated',
        entity_type: 'profile',
        entity_id: userId,
        title: `User deactivated`,
        description: `Profile account for ${targetProfile.full_name} (${targetProfile.email}) was deactivated.`,
      });

      return NextResponse.json({ success: true, message: 'User account deactivated successfully' });
    }

    if (action === 'reactivate') {
      // Update is_active in profiles table
      const { error: profileErr } = await supabaseAdmin
        .from('profiles')
        .update({ is_active: true })
        .eq('id', userId);

      if (profileErr) {
        throw profileErr;
      }

      // Lift ban in Supabase Auth (ban_duration: 'none' / '0s')
      const { error: authErr } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        ban_duration: 'none',
      });

      if (authErr) {
        console.error('Warning: could not lift ban in auth:', authErr);
      }

      // Log Audit Trail
      await logAudit({
        userId: currentUser.id,
        action: 'UPDATE',
        tableName: 'profiles',
        recordId: userId,
        oldValues: { is_active: false },
        newValues: { is_active: true },
        request: req,
      });

      // Log CRM Activity log
      await supabaseAdmin.from('activity_log').insert({
        user_id: currentUser.id,
        action: 'profile_updated',
        entity_type: 'profile',
        entity_id: userId,
        title: `User reactivated`,
        description: `Profile account for ${targetProfile.full_name} (${targetProfile.email}) was reactivated.`,
      });

      return NextResponse.json({ success: true, message: 'User account reactivated successfully' });
    }

    return NextResponse.json({ error: 'Unrecognized action' }, { status: 400 });
  } catch (err) {
    console.error('User Action API error:', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Action failed' }, { status: 500 });
  }
}
