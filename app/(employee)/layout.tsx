import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { EmployeeHeader } from '@/components/employee/employee-header';
import { EmployeeNav } from '@/components/employee/employee-nav';
import { Toaster } from '@/components/ui/sonner';

export default async function EmployeeLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email, role, avatar_url')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'employee') {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-bg-dark text-text-primary flex flex-col">
      <EmployeeHeader profile={profile} />
      <EmployeeNav />
      <main className="flex-1 p-4 pb-24 md:pb-6 max-w-4xl mx-auto w-full">
        {children}
      </main>
      <Toaster position="bottom-right" theme="dark" />
    </div>
  );
}
