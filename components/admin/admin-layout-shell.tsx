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
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-bg-dark text-text-primary flex relative">
      {/* Backdrop overlay for mobile */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden transition-opacity duration-300"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar component */}
      <Sidebar
        userProfile={userProfile}
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
      />

      {/* Main Content Area with Dynamic Padding-Left matching Sidebar state */}
      <div
        className={cn(
          "flex-1 flex flex-col min-w-0 min-h-screen transition-all duration-200",
          "pl-0 lg:pl-[220px]",
          isCollapsed && "lg:pl-[60px]"
        )}
      >
        <Header userProfile={userProfile} onMenuClick={() => setIsMobileOpen(true)} />
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
            background: 'var(--color-bg-card)',
            border: '1px solid var(--color-border-subtle)',
            color: 'var(--color-text-primary)',
            fontSize: '13px',
            fontFamily: 'var(--font-dm-sans, DM Sans, sans-serif)',
          },
          duration: 4000,
        }}
      />
    </div>
  );
}
