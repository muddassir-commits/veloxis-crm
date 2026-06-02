import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { Resend } from 'resend';

export async function POST(req: Request) {
  try {
    const { clientId } = await req.json();
    if (!clientId) {
      return NextResponse.json({ error: 'Client ID is required' }, { status: 400 });
    }

    const supabaseAdmin = createAdminClient();

    // Fetch client details
    const { data: client, error: fetchErr } = await supabaseAdmin
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .single();

    if (fetchErr || !client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    if (!client.email) {
      return NextResponse.json({ error: 'Client email is required for invitation' }, { status: 400 });
    }

    // Check if a profile already exists for this email
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('email', client.email)
      .maybeSingle();

    let userId = '';
    const tempPassword = Math.random().toString(36).slice(-8) + 'A1!';

    if (existingProfile) {
      userId = existingProfile.id;
    } else {
      // Create new user in auth
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: client.email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          full_name: client.name,
          role: 'client',
        },
      });

      if (createError) {
        throw createError;
      }

      userId = newUser.user.id;
    }

    // Link portal_user_id to client
    const { error: updateErr } = await supabaseAdmin
      .from('clients')
      .update({ portal_user_id: userId })
      .eq('id', clientId);

    if (updateErr) throw updateErr;

    // Log activity
    await supabaseAdmin.from('activity_log').insert({
      client_id: clientId,
      action: 'client_updated',
      entity_type: 'client',
      title: `Client portal invited`,
      description: `Portal user account linked to email ${client.email}.`,
    });

    // Send email via Resend
    const resendKey = process.env.RESEND_API_KEY || '';
    const isMockResend = !resendKey || resendKey.startsWith('re_your_');

    if (isMockResend) {
      console.log(`[MOCK EMAIL] To: ${client.email}, Subject: Welcome to Client Portal. Temp Password: ${tempPassword}`);
    } else {
      const resend = new Resend(resendKey);
      const { data, error: sendError } = await resend.emails.send({
        from: `${process.env.RESEND_FROM_NAME || 'Veloxis Global'} <${process.env.RESEND_FROM_EMAIL || 'ops@veloxisglobal.com'}>`,
        to: client.email,
        subject: 'Welcome to your Veloxis Client Portal',
        html: `
          <h2>Welcome to Veloxis Global Client Portal</h2>
          <p>Hi ${client.name},</p>
          <p>Your portal account is active. You can log in using:</p>
          <ul>
            <li><strong>Email:</strong> ${client.email}</li>
            <li><strong>Temporary Password:</strong> ${tempPassword}</li>
            <li><strong>Portal URL:</strong> <a href="https://portal.veloxisglobal.com">portal.veloxisglobal.com</a></li>
          </ul>
          <p>Please change your password after logging in.</p>
          <br />
          <p>Thanks,</p>
          <p>Veloxis Global Operations</p>
        `,
      });

      if (sendError) {
        throw new Error(`Resend Error: ${sendError.message}`);
      }
    }

    return NextResponse.json({ success: true, userId, mockPassword: isMockResend ? tempPassword : undefined });
  } catch (err) {
    console.error('Invite error:', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Invitation failed' }, { status: 500 });
  }
}
