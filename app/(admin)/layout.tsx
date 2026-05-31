import React from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { AdminLayoutShell } from '@/components/admin/admin-layout-shell';

export default async function Layout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch user profile from database using the admin client to ensure we can read the role
  const adminSupabase = createAdminClient();
  const { data: profile, error } = await adminSupabase
    .from('profiles')
    .select('id, full_name, email, role, avatar_url')
    .eq('id', user.id)
    .single();

  if (error || !profile) {
    console.error('Error fetching profile for admin layout:', error);
    redirect('/login');
  }

  // Ensure user is an admin
  if (profile.role !== 'admin') {
    redirect('/login');
  }

  return (
    <AdminLayoutShell userProfile={profile}>
      {children}
    </AdminLayoutShell>
  );
}
