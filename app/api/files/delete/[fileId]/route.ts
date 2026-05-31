import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function DELETE(
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

    if (profileError || !profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 403 });
    }

    // 2. Fetch file details
    const { data: fileRecord, error: fileError } = await adminSupabase
      .from('files')
      .select('*')
      .eq('id', fileId)
      .single();

    if (fileError || !fileRecord) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // 3. Permission checks
    // Admins can delete any file. Employees can only delete their own uploaded files.
    if (profile.role !== 'admin') {
      if (profile.role !== 'employee' || fileRecord.uploaded_by !== user.id) {
        return NextResponse.json({ error: 'Unauthorized to delete this file' }, { status: 403 });
      }
    }

    // 4. Delete from Supabase Storage
    const { error: storageError } = await adminSupabase.storage
      .from(fileRecord.bucket)
      .remove([fileRecord.storage_path]);

    if (storageError) {
      console.error('Storage deletion warning:', storageError);
      // We continue with database record deletion even if the storage file wasn't found (orphan cleanup)
    }

    // 5. Delete from public.files table
    const { error: dbError } = await adminSupabase
      .from('files')
      .delete()
      .eq('id', fileId);

    if (dbError) {
      console.error('Database deletion error:', dbError);
      return NextResponse.json({ error: `Database deletion failed: ${dbError.message}` }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'File deleted successfully' });
  } catch (err) {
    const error = err as Error;
    console.error('File delete route error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
