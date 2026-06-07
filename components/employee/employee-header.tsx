'use client';

import React from 'react';
import Link from 'next/link';
import { LogOut, User } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

interface EmployeeHeaderProps {
  profile: {
    full_name: string;
    email: string;
    role: string;
    avatar_url: string | null;
  };
}

export function EmployeeHeader({ profile }: EmployeeHeaderProps) {
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  const initials = profile.full_name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <header className="sticky top-0 z-50 h-14 bg-bg-card border-b border-border/30 flex items-center justify-between px-4">
      {/* Logo */}
      <Link href="/team" className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
          <span className="text-white font-black text-xs">V</span>
        </div>
        <div className="leading-tight hidden sm:block">
          <span className="text-text-primary font-bold text-sm tracking-tight">Veloxis</span>
          <span className="text-[#1B4FD8] font-bold text-sm ml-1">Global</span>
        </div>
        <span className="text-[10px] text-text-tertiary bg-bg-card-hover/20 border border-border/30 px-2 py-0.5 rounded-full font-semibold uppercase hidden sm:block">
          Team
        </span>
      </Link>

      {/* Right: User */}
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <button className="flex items-center gap-2.5 hover:bg-bg-card-hover/20 px-2 py-1.5 rounded-[7px] transition-colors cursor-pointer">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#1B4FD8] to-[#7C3AED] flex items-center justify-center text-white font-bold text-[11px] shrink-0">
                {initials}
              </div>
              <div className="text-left hidden sm:block">
                <p className="text-[11px] font-semibold text-text-primary leading-tight">{profile.full_name}</p>
                <p className="text-[9px] text-text-tertiary leading-tight truncate max-w-[120px]">{profile.email}</p>
              </div>
            </button>
          }
        />
        <DropdownMenuContent className="bg-bg-card border-border/30 text-text-primary w-48" align="end">
          <div className="px-3 py-2 border-b border-border/30">
            <p className="text-xs font-semibold text-text-primary">{profile.full_name}</p>
            <p className="text-[10px] text-text-tertiary truncate">{profile.email}</p>
          </div>
          <DropdownMenuItem
            onClick={() => router.push('/team/profile')}
            className="gap-2 text-xs text-text-secondary hover:text-text-primary hover:bg-bg-card-hover/20 cursor-pointer"
          >
            <User size={13} /> My Profile
          </DropdownMenuItem>
          <DropdownMenuSeparator className="bg-border/30" />
          <DropdownMenuItem
            onClick={handleLogout}
            className="gap-2 text-xs text-error hover:text-[#FCA5A5] hover:bg-[#EF444410] cursor-pointer"
          >
            <LogOut size={13} /> Sign Out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
