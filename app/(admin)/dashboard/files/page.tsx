import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { PageContainer } from '@/components/shared/page-container';
import { FileBrowser } from '@/components/shared/file-browser';

export const revalidate = 0;

export default async function FilesPage() {
  const supabase = await createClient();

  // 1. Fetch active clients and the agency self-client
  const { data: clients } = await supabase
    .from('clients')
    .select('*')
    .or('status.eq.active,is_agency_self.eq.true')
    .order('name', { ascending: true });

  // 2. Fetch all file records with the uploader's name joined
  const { data: files } = await supabase
    .from('files')
    .select('*, profiles:uploaded_by (full_name)')
    .order('created_at', { ascending: false });

  return (
    <PageContainer
      title="File Storage"
      description="Manage agency documents, client reports, invoices, and employee agreements in secure vaults."
    >
      <FileBrowser
        initialClients={clients || []}
        initialFiles={files || []}
      />
    </PageContainer>
  );
}
