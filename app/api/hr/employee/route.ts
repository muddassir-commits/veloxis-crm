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
    const {
      full_name,
      email,
      phone,
      skills,
      designation,
      join_date,
      stipend_amount,
      payment_day,
      notes,
    } = body;

    if (!full_name || !email) {
      return NextResponse.json({ error: 'Full Name and Email are required parameters' }, { status: 400 });
    }

    // Generate random 8 character password
    const tempPassword = Math.random().toString(36).slice(-8);

    const supabaseAdmin = createAdminClient();

    // 4. Create Auth User
    const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        full_name,
        role: 'employee',
      },
    });

    if (authErr || !authData.user) {
      throw new Error(authErr?.message || 'Failed to create auth user');
    }

    const newUserId = authData.user.id;

    // 5. Update phone in profiles manually since trigger doesn't map it
    if (phone) {
      const { error: profileUpdateErr } = await supabaseAdmin
        .from('profiles')
        .update({ phone })
        .eq('id', newUserId);
      if (profileUpdateErr) {
        console.error('Error updating phone in profile:', profileUpdateErr);
      }
    }

    // 6. Insert Employee Details
    const { error: empErr } = await supabaseAdmin
      .from('employees')
      .insert({
        id: newUserId,
        skills: skills || [],
        designation: designation || 'Digital Marketing Intern',
        join_date: join_date || new Date().toISOString().split('T')[0],
        stipend_amount: stipend_amount ? Number(stipend_amount) : 3000,
        payment_day: payment_day ? Number(payment_day) : 5,
        notes: notes || null,
        performance_score: 10, // 1-10 quality scale
      });

    if (empErr) {
      // Rollback Auth user if database insert fails
      await supabaseAdmin.auth.admin.deleteUser(newUserId);
      throw empErr;
    }

    // 7. Log Activity
    await supabaseAdmin.from('activity_log').insert({
      user_id: currentUser.id,
      action: 'employee_added',
      entity_type: 'employee',
      entity_id: newUserId,
      title: 'New employee added',
      description: `New employee added: ${full_name}`,
    });

    return NextResponse.json({
      success: true,
      employee: {
        id: newUserId,
        full_name,
        email,
        tempPassword,
      },
    });
  } catch (err) {
    console.error('Employee creation API error:', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to create employee' }, { status: 500 });
  }
}
