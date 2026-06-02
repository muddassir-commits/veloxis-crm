'use client';

import React, { useState } from 'react';
import { Sidebar } from './sidebar';
import { Header } from './header';
import { cn } from '@/lib/utils';
import { Toaster } from '@/components/ui/sonner';

interface AdminLayoutShellProps {
  userProfile: {
    id: string;
    full_name: string;
    email: string;
    avatar_url?: string | null;
  };
  children: React.ReactNode;
}

export function AdminLayoutShell({ userProfile, children }: AdminLayoutShellProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-[#060D1A] text-[#F0F4FF] flex">
      {/* Sidebar component */}
      <Sidebar
        userProfile={userProfile}
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
      />

      {/* Main Content Area with Dynamic Padding-Left matching Sidebar state */}
      <div
        className={cn(
          "flex-1 flex flex-col min-w-0 min-h-screen transition-all duration-200",
          isCollapsed ? "pl-[60px]" : "pl-[220px]"
        )}
      >
        <Header userProfile={userProfile} />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>

      {/* Global Toast Notification System — Sonner */}
      <Toaster
        position="bottom-right"
        theme="dark"
        toastOptions={{
          style: {
            background: '#0D1829',
            border: '1px solid #1E3352',
            color: '#F0F4FF',
            fontSize: '13px',
            fontFamily: 'var(--font-dm-sans, DM Sans, sans-serif)',
          },
          duration: 4000,
        }}
      />
    </div>
  );
}
