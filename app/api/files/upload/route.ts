import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(req: NextRequest) {
  try {
    // 1. Verify User and Role
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    const adminSupabase = createAdminClient();
    const { data: profile, error: profileError } = await adminSupabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || (profile.role !== 'admin' && profile.role !== 'employee')) {
      return NextResponse.json({ error: 'Unauthorized. Admin or employee access required.' }, { status: 403 });
    }

    // 2. Parse Multipart Form Data
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const bucket = formData.get('bucket') as string | null;
    const path = formData.get('path') as string | null;
    const clientId = formData.get('client_id') as string | null;
    const department = formData.get('department') as string | null;
    const tagsString = formData.get('tags') as string | null;

    if (!file || !bucket || !path) {
      return NextResponse.json(
        { error: 'Missing required fields: file, bucket, and path are required.' },
        { status: 400 }
      );
    }

    // 2.5. Additional validations for employees
    if (profile.role === 'employee') {
      if (bucket !== 'employees' && bucket !== 'clients') {
        return NextResponse.json({ error: 'Unauthorized bucket access for employees.' }, { status: 403 });
      }
      
      const normalizedPath = path.startsWith('/') ? path.slice(1) : path;
      if (bucket === 'employees' && !normalizedPath.startsWith(`employees/${user.id}/`)) {
        return NextResponse.json({ error: 'Unauthorized path. Employees can only upload to their own directory.' }, { status: 403 });
      }
    }

    // 3. Upload File to Supabase Storage
    const buffer = Buffer.from(await file.arrayBuffer());
    const { error: storageError } = await adminSupabase.storage
      .from(bucket)
      .upload(path, buffer, {
        contentType: file.type || 'application/octet-stream',
        upsert: true,
      });

    if (storageError) {
      console.error('Supabase storage upload error:', storageError);
      return NextResponse.json({ error: `Storage upload failed: ${storageError.message}` }, { status: 500 });
    }

    // 4. Retrieve Public URL
    const {
      data: { publicUrl },
    } = adminSupabase.storage.from(bucket).getPublicUrl(path);

    // 5. Insert Record into Files Table
    const tags = tagsString ? tagsString.split(',').map((t) => t.trim()).filter(Boolean) : [];
    
    const { data: fileRecord, error: dbError } = await adminSupabase
      .from('files')
      .insert({
        name: file.name,
        original_name: file.name,
        mime_type: file.type || 'application/octet-stream',
        size_bytes: file.size,
        bucket,
        storage_path: path,
        public_url: publicUrl,
        client_id: clientId || null,
        department: department || null,
        tags,
        uploaded_by: user.id,
        is_shared_with_client: false,
      })
      .select('*')
      .single();

    if (dbError) {
      console.error('Database file insertion error:', dbError);
      // Clean up uploaded file if DB insert fails
      await adminSupabase.storage.from(bucket).remove([path]);
      return NextResponse.json({ error: `Database logging failed: ${dbError.message}` }, { status: 500 });
    }

    // 6. Return File Details
    return NextResponse.json({
      id: fileRecord.id,
      name: fileRecord.name,
      public_url: fileRecord.public_url,
      storage_path: fileRecord.storage_path,
    });
  } catch (err) {
    const error = err as Error;
    console.error('File upload route error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
