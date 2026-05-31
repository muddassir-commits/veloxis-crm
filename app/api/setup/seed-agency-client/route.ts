import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET() {
  try {
    const supabase = createAdminClient();

    // 1. Check if agency client already exists
    const { data: existingClient, error: checkError } = await supabase
      .from('clients')
      .select('id')
      .eq('is_agency_self', true)
      .maybeSingle();

    if (checkError) throw checkError;

    if (existingClient) {
      return NextResponse.json({
        message: 'Agency self-client already exists.',
        clientId: existingClient.id,
      });
    }

    // 2. Fetch an admin profile to assign as owner
    const { data: adminProfile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'admin')
      .limit(1)
      .maybeSingle();

    if (profileError) {
      console.warn('Could not fetch admin profile for assignment:', profileError.message);
    }

    // 3. Seed Veloxis Global self-client
    const { data: seededClient, error: seedError } = await supabase
      .from('clients')
      .insert({
        name: "Veloxis Global",
        company: "Veloxis Global",
        email: "muddassir@veloxisglobal.com",
        phone: "+91-8887620727",
        whatsapp: "918887620727",
        website: "https://veloxisglobal.com",
        industry: "Digital Marketing Agency",
        city: "Kanpur",
        status: "active",
        monthly_retainer: 0,
        services: ["seo", "smm", "content", "gbp"],
        notes: "Veloxis Global's own digital presence tracking. Not a paying client.",
        is_agency_self: true,
        start_date: new Date().toISOString().split('T')[0],
        assigned_to: adminProfile?.id || null,
      })
      .select('id')
      .single();

    if (seedError) throw seedError;

    return NextResponse.json({
      message: 'Agency self-client seeded successfully.',
      clientId: seededClient.id,
    });
  } catch (err) {
    const error = err as Error;
    console.error('Failed to seed agency self-client:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to seed client' },
      { status: 500 }
    );
  }
}
