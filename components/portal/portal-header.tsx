'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LogOut, User, Menu, X, LayoutDashboard, FileBarChart2, FileText, FolderClosed } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { createClient } from '@/lib/supabase/client';

interface PortalHeaderProps {
  profile: {
    full_name: string;
    email: string;
    avatar_url: string | null;
  };
  client: {
    name: string;
    company: string | null;
  };
}

export function PortalHeader({ profile, client }: PortalHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  const navItems = [
    { href: '/portal', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/portal/reports', label: 'Reports', icon: FileBarChart2 },
    { href: '/portal/invoices', label: 'Invoices', icon: FileText },
    { href: '/portal/files', label: 'Files', icon: FolderClosed },
  ];

  const initials = profile.full_name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <header className="sticky top-0 z-50 h-14 bg-white border-b border-[#E2E8F4] flex items-center justify-between px-4 md:px-6 shadow-xs select-none">
      {/* Left side: Logo & Client Badge */}
      <div className="flex items-center gap-3">
        <Link href="/portal" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-[#1B4FD8] flex items-center justify-center">
            <span className="text-white font-black text-xs">V</span>
          </div>
          <div className="leading-tight hidden sm:block">
            <span className="text-[#0A1628] font-bold text-sm tracking-tight">Veloxis</span>
            <span className="text-[#1B4FD8] font-bold text-sm ml-1">Global</span>
          </div>
        </Link>
        <span className="text-[#4A6480] font-light hidden sm:inline">|</span>
        <span className="text-[10px] text-[#475569] bg-[#F1F5F9] border border-[#E2E8F4] px-2.5 py-0.5 rounded-full font-bold uppercase truncate max-w-[140px] md:max-w-[200px]">
          {client.name || client.company || 'Client'}
        </span>
      </div>

      {/* Middle: Desktop Navigation links */}
      <nav className="hidden md:flex items-center gap-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== '/portal' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[5px] text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-brand-blue-muted text-[#1B4FD8]'
                  : 'text-[#475569] hover:bg-[#F1F5F9] hover:text-[#0A1628]'
              }`}
            >
              <Icon size={13} className="stroke-[1.75]" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Right side: User Dropdown & Mobile Menu Toggle */}
      <div className="flex items-center gap-2">
        {/* User avatar dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button className="flex items-center gap-2 hover:bg-[#F1F5F9] p-1 rounded-full md:rounded-[7px] transition-colors cursor-pointer outline-none">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#1B4FD8] to-[#8B5CF6] flex items-center justify-center text-white font-bold text-[11px] shrink-0">
                  {initials}
                </div>
                <div className="text-left hidden md:block">
                  <p className="text-[11px] font-semibold text-[#0A1628] leading-tight">{profile.full_name}</p>
                  <p className="text-[9px] text-[#475569] leading-tight truncate max-w-[100px]">{profile.email}</p>
                </div>
              </button>
            }
          />
          <DropdownMenuContent className="bg-white border-[#E2E8F4] text-[#0A1628] w-48 shadow-lg p-1" align="end">
            <div className="px-3 py-2 border-b border-[#E2E8F4] select-none">
              <p className="text-xs font-semibold text-[#0A1628]">{profile.full_name}</p>
              <p className="text-[9px] text-[#475569] truncate mt-0.5">{profile.email}</p>
              {client.company && (
                <p className="text-[9px] text-[#94A3B8] truncate italic mt-0.5">{client.company}</p>
              )}
            </div>
            <DropdownMenuItem
              onClick={() => router.push('/portal')}
              className="gap-2 text-xs text-[#475569] hover:text-[#0A1628] hover:bg-[#F1F5F9] cursor-pointer"
            >
              <User size={13} /> Dashboard
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-[#E2E8F4]" />
            <DropdownMenuItem
              onClick={handleLogout}
              className="gap-2 text-xs text-[#EF4444] hover:text-[#DC2626] hover:bg-[#EF444410] cursor-pointer"
            >
              <LogOut size={13} /> Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Mobile menu toggle button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-1 rounded hover:bg-[#F1F5F9] text-[#475569] hover:text-[#0A1628] cursor-pointer"
        >
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-x-0 top-14 bg-white border-b border-[#E2E8F4] shadow-md z-40 p-3 flex flex-col gap-1.5 animate-in fade-in slide-in-from-top-4 duration-150">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== '/portal' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2 rounded-[5px] text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-brand-blue-muted text-[#1B4FD8] font-bold'
                    : 'text-[#475569] hover:bg-[#F1F5F9] hover:text-[#0A1628]'
                }`}
              >
                <Icon size={14} className="stroke-[1.75]" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      )}
    </header>
  );
}
