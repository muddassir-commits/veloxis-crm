import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { ClientFileBrowser } from '@/components/portal/client-file-browser';

export const revalidate = 0;

export default async function FilesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  // Retrieve client associated with this portal user
  const { data: client } = await supabase
    .from('clients')
    .select('*')
    .eq('portal_user_id', user.id)
    .single();

  if (!client) redirect('/login');

  // Fetch shared files for this client
  const { data: files } = await supabase
    .from('files')
    .select('*')
    .eq('client_id', client.id)
    .eq('is_shared_with_client', true)
    .order('created_at', { ascending: false });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-bold text-text-primary">Document Vault & Assets</h1>
        <p className="text-xs text-text-secondary mt-0.5">
          Browse and download files, reports, and creative brand assets shared with your company.
        </p>
      </div>

      <ClientFileBrowser files={files || []} />
    </div>
  );
}
