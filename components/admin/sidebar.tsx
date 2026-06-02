'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  LayoutDashboard,
  TrendingUp,
  Megaphone,
  DollarSign,
  Users,
  Settings2,
  FileText,
  Monitor,
  Briefcase,
  Search,
  Share2,
  Globe,
  Target,
  PenLine,
  Layout,
  BarChart2,
  FolderOpen,
  Zap,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Building2,
  ListTodo,
  History,
} from 'lucide-react';

interface SidebarProps {
  userProfile?: {
    id?: string;
    full_name: string;
    email: string;
    avatar_url?: string | null;
  } | null;
  isCollapsed?: boolean;
  setIsCollapsed?: (collapsed: boolean) => void;
}

export function Sidebar({ userProfile, isCollapsed: controlledCollapsed, setIsCollapsed: setControlledCollapsed }: SidebarProps) {
  const pathname = usePathname();
  const [localCollapsed, setLocalCollapsed] = useState(false);

  const isCollapsed = controlledCollapsed !== undefined ? controlledCollapsed : localCollapsed;
  const setIsCollapsed = setControlledCollapsed !== undefined ? setControlledCollapsed : setLocalCollapsed;

  const internalRoutes = [
    { name: 'Overview', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Sales', path: '/dashboard/sales', icon: TrendingUp },
    { name: 'Marketing', path: '/dashboard/marketing', icon: Megaphone },
    { name: 'Finance', path: '/dashboard/finance', icon: DollarSign },
    { name: 'HR & Team', path: '/dashboard/hr', icon: Users },
    { name: 'Operations', path: '/dashboard/operations', icon: Settings2 },
    { name: 'Legal', path: '/dashboard/legal', icon: FileText },
    { name: 'IT & Tech', path: '/dashboard/it', icon: Monitor },
  ];

  const deliveryRoutes = [
    { name: 'Clients', path: '/dashboard/clients', icon: Briefcase },
    { name: 'Deliverables', path: '/dashboard/deliverables', icon: ListTodo },
    { name: 'SEO', path: '/dashboard/seo', icon: Search },
    { name: 'Social Media', path: '/dashboard/social', icon: Share2 },
    { name: 'Google Ads', path: '/dashboard/google-ads', icon: Globe },
    { name: 'Meta Ads', path: '/dashboard/meta-ads', icon: Target },
    { name: 'Content', path: '/dashboard/content', icon: PenLine },
    { name: 'Web Design', path: '/dashboard/web-design', icon: Layout },
    { name: 'Reports', path: '/dashboard/reports', icon: BarChart2 },
  ];

  const bottomRoutes = [
    { name: 'Activity Log', path: '/dashboard/activity', icon: History },
    { name: 'Files', path: '/dashboard/files', icon: FolderOpen },
    { name: 'Automations', path: '/dashboard/automations', icon: Zap },
    { name: 'Settings', path: '/dashboard/settings', icon: Settings },
  ];

  const handleLogout = () => {
    window.location.href = '/api/auth/logout';
  };

  const renderNavItems = (items: typeof internalRoutes) => {
    return items.map((item) => {
      const isActive = pathname === item.path || pathname.startsWith(item.path + '/');
      const Icon = item.icon;

      return (
        <Link
          key={item.path}
          href={item.path}
          className={cn(
            "group flex items-center gap-3 px-3 py-2 rounded-md font-medium text-[13px] transition-all duration-150 relative cursor-pointer",
            isActive
              ? "bg-[#1B4FD815] text-[#4D90FE] border-l-2 border-[#1B4FD8]"
              : "text-[#8BA3C7] hover:bg-[#132035] hover:text-[#F0F4FF]"
          )}
        >
          <Icon size={16} className={cn("stroke-[1.5]", isActive ? "text-[#4D90FE]" : "text-[#8BA3C7] group-hover:text-[#F0F4FF]")} />
          {!isCollapsed && <span className="truncate">{item.name}</span>}
          {isCollapsed && (
            <div className="absolute left-16 bg-[#1A2D47] border border-[#1E3352] text-xs font-semibold px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 whitespace-nowrap shadow-xl">
              {item.name}
            </div>
          )}
        </Link>
      );
    });
  };

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 bg-[#0D1829] border-r border-[#1E3352] flex flex-col transition-all duration-200 z-30",
        isCollapsed ? "w-[60px]" : "w-[220px]"
      )}
    >
      {/* Sidebar Header / Logo */}
      <div className="h-14 px-4 flex items-center justify-between border-b border-[#1E3352] shrink-0">
        {!isCollapsed ? (
          <div className="flex items-center text-base font-bold tracking-tight select-none">
            <span className="text-[#1B4FD8]">Veloxis</span>
            <span className="text-[#F97316]">Global</span>
          </div>
        ) : (
          <div className="w-full flex justify-center text-lg font-bold text-[#1B4FD8] select-none">
            V
          </div>
        )}
        
        {/* Toggle Collapse Button */}
        {!isCollapsed && (
          <button
            onClick={() => setIsCollapsed(true)}
            className="text-[#8BA3C7] hover:text-[#F0F4FF] p-1 rounded hover:bg-[#132035] transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
        )}
      </div>

      {isCollapsed && (
        <div className="flex justify-center py-2 border-b border-[#1E3352]">
          <button
            onClick={() => setIsCollapsed(false)}
            className="text-[#8BA3C7] hover:text-[#F0F4FF] p-1 rounded hover:bg-[#132035] transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* Navigation Content */}
      <div className="flex-1 overflow-y-auto px-2 py-4 space-y-5 scrollbar-thin">
        {/* MY AGENCY */}
        <div className="space-y-1">
          {!isCollapsed && (
            <div className="px-3 text-[10px] font-semibold text-[#4A6480] uppercase tracking-wider mb-2 select-none">
              My Agency
            </div>
          )}
          <nav className="flex flex-col gap-0.5">
            <Link
              href="/dashboard/my-agency"
              className={cn(
                "group flex items-center gap-3 px-3 py-2 rounded-md font-medium text-[13px] transition-all duration-150 relative cursor-pointer",
                pathname === '/dashboard/my-agency' || pathname.startsWith('/dashboard/my-agency/')
                  ? "bg-[#F9731615] text-[#F97316] border-l-2 border-[#F97316]"
                  : "text-[#8BA3C7] hover:bg-[#132035] hover:text-[#F0F4FF]"
              )}
            >
              <Building2
                size={16}
                className={cn(
                  "stroke-[1.5]",
                  pathname === '/dashboard/my-agency' || pathname.startsWith('/dashboard/my-agency/')
                    ? "text-[#F97316]"
                    : "text-[#8BA3C7] group-hover:text-[#F0F4FF]"
                )}
              />
              {!isCollapsed && (
                <div className="flex items-center justify-between w-full min-w-0">
                  <span className="truncate">Veloxis Global</span>
                  <span className="h-1.5 w-1.5 rounded-full bg-[#F97316] shrink-0" />
                </div>
              )}
              {isCollapsed && (
                <div className="absolute left-16 bg-[#1A2D47] border border-[#1E3352] text-xs font-semibold px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 whitespace-nowrap shadow-xl">
                  Veloxis Global (My Agency)
                </div>
              )}
            </Link>
          </nav>
          {!isCollapsed && (
            <div className="border-b border-[#1E3352]/20 my-2 mx-3" />
          )}
        </div>

        {/* INTERNAL */}
        <div className="space-y-1">
          {!isCollapsed && (
            <div className="px-3 text-[10px] font-semibold text-[#4A6480] uppercase tracking-wider mb-2 select-none">
              Internal
            </div>
          )}
          <nav className="flex flex-col gap-0.5">
            {renderNavItems(internalRoutes)}
          </nav>
        </div>

        {/* CLIENT DELIVERY */}
        <div className="space-y-1">
          {!isCollapsed && (
            <div className="px-3 text-[10px] font-semibold text-[#4A6480] uppercase tracking-wider mb-2 select-none">
              Client Delivery
            </div>
          )}
          <nav className="flex flex-col gap-0.5">
            {renderNavItems(deliveryRoutes)}
          </nav>
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="p-2 border-t border-[#1E3352] flex flex-col gap-0.5 shrink-0">
        <nav className="flex flex-col gap-0.5">
          {renderNavItems(bottomRoutes)}
        </nav>

        {/* User profile & Logout */}
        <div className={cn("mt-2 rounded-lg bg-[#132035]/40 p-2 border border-[#1E3352]/30 flex items-center justify-between gap-2 overflow-hidden", isCollapsed && "justify-center")}>
          <div className="flex items-center gap-2.5 overflow-hidden">
            <Avatar className="h-7 w-7 border border-[#1E3352]">
              <AvatarImage src={userProfile?.avatar_url || undefined} />
              <AvatarFallback className="bg-[#1B4FD8] text-[10px] text-white uppercase font-bold select-none">
                {userProfile?.full_name?.substring(0, 2) || 'AD'}
              </AvatarFallback>
            </Avatar>
            {!isCollapsed && (
              <div className="flex flex-col text-left overflow-hidden min-w-0">
                <span className="text-xs font-semibold text-[#F0F4FF] truncate select-none">
                  {userProfile?.full_name || 'Admin User'}
                </span>
                <span className="text-[10px] text-[#8BA3C7] truncate select-none">
                  {userProfile?.email || 'admin@veloxisglobal.com'}
                </span>
              </div>
            )}
          </div>
          
          {!isCollapsed && (
            <button
              onClick={handleLogout}
              className="text-[#8BA3C7] hover:text-[#EF4444] p-1.5 rounded hover:bg-[#EF444415] transition-colors shrink-0"
              title="Sign Out"
            >
              <LogOut size={14} className="stroke-[1.5]" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
