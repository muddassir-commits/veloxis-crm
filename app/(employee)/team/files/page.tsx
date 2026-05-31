import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { EmployeeFilesPage } from '@/components/employee/employee-files-page';

export const revalidate = 0;

export default async function FilesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'employee') redirect('/login');

  // Fetch files uploaded by this employee
  const { data: files } = await supabase
    .from('files')
    .select('*')
    .eq('uploaded_by', user.id)
    .order('created_at', { ascending: false });

  return (
    <EmployeeFilesPage
      files={files || []}
      employeeId={user.id}
    />
  );
}
