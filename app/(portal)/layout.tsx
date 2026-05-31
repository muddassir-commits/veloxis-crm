import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { PortalHeader } from '@/components/portal/portal-header';

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch profiles role to ensure user is a client
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email, role, avatar_url')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'client') {
    // If user is admin/employee, proxy.ts handles redirecting to their portals.
    // If middleware did not catch, redirect to login as a safe guard.
    redirect('/login');
  }

  // Fetch client record associated with this portal user
  const { data: client } = await supabase
    .from('clients')
    .select('*')
    .eq('portal_user_id', user.id)
    .single();

  if (!client) {
    return (
      <div className="theme-light bg-[#F8FAFF] text-[#0A1628] min-h-screen flex items-center justify-center p-6">
        <div className="bg-white border border-[#E2E8F4] rounded-[10px] p-8 max-w-md w-full shadow-sm text-center space-y-4">
          <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto text-xl font-bold">
            ⚠️
          </div>
          <h2 className="text-lg font-bold">Portal Access Pending</h2>
          <p className="text-xs text-[#475569] leading-relaxed">
            Your client portal account is active, but it is not linked to any agency client profile yet. Please contact <strong>muddassir@veloxisglobal.com</strong> or WhatsApp <strong>+91-8887620727</strong> to connect your company dashboard.
          </p>
          <a
            href="/api/auth/logout"
            className="inline-block bg-[#1B4FD8] hover:bg-[#2563EB] text-white text-xs font-bold px-4 py-2 rounded-[7px] transition-colors"
          >
            Sign Out
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="theme-light bg-background text-foreground min-h-screen flex flex-col antialiased">
      {/* Top Navigation */}
      <PortalHeader profile={profile} client={client} />

      {/* Main Content Area */}
      <main className="flex-1 p-4 md:p-6 max-w-6xl mx-auto w-full page-enter">
        {children}
      </main>

      {/* Footer */}
      <footer className="py-6 border-t border-border bg-card text-center text-[10px] text-muted-foreground font-medium shrink-0">
        <p>© {new Date().getFullYear()} {client.name || client.company || 'Client Portal'}. All rights reserved.</p>
        <p className="mt-1 text-[9px] opacity-70">
          Powered by <a href="https://veloxisglobal.com" target="_blank" rel="noopener noreferrer" className="text-[#1B4FD8] hover:underline font-bold">Veloxis Global</a>
        </p>
      </footer>
    </div>
  );
}
