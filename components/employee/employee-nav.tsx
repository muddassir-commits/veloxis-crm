'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, CheckSquare, User, Folder } from 'lucide-react';

const navItems = [
  { href: '/team', label: 'Today', icon: Home },
  { href: '/team/tasks', label: 'Tasks', icon: CheckSquare },
  { href: '/team/files', label: 'Files', icon: Folder },
  { href: '/team/profile', label: 'Profile', icon: User },
];

export function EmployeeNav() {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop horizontal tab bar */}
      <nav className="hidden md:flex items-center gap-1 bg-bg-card border-b border-border/30 px-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== '/team' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-all ${
                isActive
                  ? 'border-primary text-text-primary'
                  : 'border-transparent text-text-tertiary hover:text-text-secondary'
              }`}
            >
              <Icon size={14} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Mobile bottom navigation bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-bg-card border-t border-border/30 flex items-stretch h-16">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== '/team' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 flex flex-col items-center justify-center gap-1 transition-all ${
                isActive ? 'text-[#1B4FD8]' : 'text-text-tertiary'
              }`}
            >
              <Icon size={20} />
              <span className="text-[10px] font-semibold">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
