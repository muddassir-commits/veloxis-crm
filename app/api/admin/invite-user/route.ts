import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { logAudit } from '@/lib/audit';
import { sendEmail } from '@/lib/email';

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
    const {
      email,
      full_name,
      role,
      phone,
      // Employee-specific
      skills,
      designation,
      stipend_amount,
      payment_day,
      notes,
      // Client-specific
      client_id,
    } = body;

    if (!email || !full_name || !role) {
      return NextResponse.json({ error: 'Email, Full Name, and Role are required parameters' }, { status: 400 });
    }

    if (!['admin', 'employee', 'client'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role selection' }, { status: 400 });
    }

    if (role === 'client' && !client_id) {
      return NextResponse.json({ error: 'Client ID is required when role is client' }, { status: 400 });
    }

    const supabaseAdmin = createAdminClient();

    // Generate secure temporary password
    const tempPassword = Math.random().toString(36).slice(-8) + 'A1!';

    // 4. Create User in Auth
    const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        full_name,
        role,
      },
    });

    if (authErr || !authData.user) {
      throw new Error(authErr?.message || 'Failed to create auth user');
    }

    const newUserId = authData.user.id;

    // 5. Update phone number in profiles table if provided
    if (phone) {
      const { error: profileUpdateErr } = await supabaseAdmin
        .from('profiles')
        .update({ phone })
        .eq('id', newUserId);
      if (profileUpdateErr) {
        console.error('Error updating phone in profile:', profileUpdateErr);
      }
    }

    // 6. Role-specific downstream provisionings
    if (role === 'employee') {
      const { error: empErr } = await supabaseAdmin
        .from('employees')
        .insert({
          id: newUserId,
          skills: skills || [],
          designation: designation || 'Digital Marketing Intern',
          join_date: new Date().toISOString().split('T')[0],
          stipend_amount: stipend_amount ? Number(stipend_amount) : 3000,
          payment_day: payment_day ? Number(payment_day) : 5,
          notes: notes || null,
          performance_score: 10,
        });

      if (empErr) {
        // Rollback Auth User if database sync fails
        await supabaseAdmin.auth.admin.deleteUser(newUserId);
        throw empErr;
      }
    } else if (role === 'client') {
      const { error: clientLinkErr } = await supabaseAdmin
        .from('clients')
        .update({ portal_user_id: newUserId })
        .eq('id', client_id);

      if (clientLinkErr) {
        // Rollback Auth User if database sync fails
        await supabaseAdmin.auth.admin.deleteUser(newUserId);
        throw clientLinkErr;
      }
    }

    // 7. Log Audit logs
    await logAudit({
      userId: currentUser.id,
      action: 'INSERT',
      tableName: 'profiles',
      recordId: newUserId,
      newValues: { full_name, email, role, phone },
      request: req,
    });

    // 8. Log CRM Activity log
    await supabaseAdmin.from('activity_log').insert({
      user_id: currentUser.id,
      action: 'profile_added',
      entity_type: 'profile',
      entity_id: newUserId,
      title: `User invited as ${role}`,
      description: `New user account created for ${full_name} (${email}) with role ${role}.`,
    });

    // 9. Send invitation email via shared email utility
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://ops.veloxisglobal.com';
    const portalUrl = process.env.NEXT_PUBLIC_PORTAL_URL || 'https://portal.veloxisglobal.com';
    const teamUrl = process.env.NEXT_PUBLIC_TEAM_URL || 'https://team.veloxisglobal.com';

    let loginUrl = appUrl + '/login';
    if (role === 'client') loginUrl = portalUrl + '/login';
    if (role === 'employee') loginUrl = teamUrl + '/login';

    const emailSubject = `Welcome to Veloxis Global — Your ${role === 'client' ? 'Client Portal' : role === 'employee' ? 'Team Cabinet' : 'Admin Hub'}`;

    await sendEmail({
      to: email,
      subject: emailSubject,
      html: `
        <h2>Welcome to Veloxis Global CRM</h2>
        <p>Hi ${full_name},</p>
        <p>Your user profile has been created successfully. You can log in using the credentials below:</p>
        <ul>
          <li><strong>Email:</strong> ${email}</li>
          <li><strong>Temporary Password:</strong> ${tempPassword}</li>
          <li><strong>Login Portal:</strong> <a href="${loginUrl}">${loginUrl}</a></li>
        </ul>
        <p>For security purposes, please make sure to change your password immediately after your first sign in.</p>
        <br />
        <p>Best regards,</p>
        <p>Veloxis Global Operations</p>
      `,
    });

    return NextResponse.json({
      success: true,
      user: {
        id: newUserId,
        full_name,
        email,
        role,
        tempPassword,
      },
    });
  } catch (err) {
    console.error('Invite User API error:', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to invite user' }, { status: 500 });
  }
}
