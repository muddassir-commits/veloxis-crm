import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(
  req: NextRequest,
  props: { params: Promise<{ fileId: string }> }
) {
  try {
    const { fileId } = await props.params;
    
    // 1. Authenticate user
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    const adminSupabase = createAdminClient();
    
    // Get user profile
    const { data: profile, error: profileError } = await adminSupabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 403 });
    }

    // 2. Parse body
    const body = await req.json();
    const { shared } = body;

    if (typeof shared !== 'boolean') {
      return NextResponse.json({ error: 'Missing or invalid shared parameter' }, { status: 400 });
    }

    // 3. Update public.files table
    const { data: updatedRecord, error: dbError } = await adminSupabase
      .from('files')
      .update({ is_shared_with_client: shared })
      .eq('id', fileId)
      .select('*')
      .single();

    if (dbError) {
      console.error('Database update error:', dbError);
      return NextResponse.json({ error: `Database update failed: ${dbError.message}` }, { status: 500 });
    }

    return NextResponse.json({ success: true, file: updatedRecord });
  } catch (err) {
    const error = err as Error;
    console.error('File share route error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
