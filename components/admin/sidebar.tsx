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
  X,
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
  isMobileOpen?: boolean;
  setIsMobileOpen?: (open: boolean) => void;
}

export function Sidebar({
  userProfile,
  isCollapsed: controlledCollapsed,
  setIsCollapsed: setControlledCollapsed,
  isMobileOpen = false,
  setIsMobileOpen,
}: SidebarProps) {
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
              ? "bg-primary/20 text-primary-light border-l-[3px] border-primary pl-[9px]"
              : "text-text-secondary hover:bg-primary/10 hover:text-text-primary"
          )}
        >
          <Icon size={16} className={cn("stroke-[1.5]", isActive ? "text-primary-light" : "text-text-secondary group-hover:text-text-primary")} />
          {!isCollapsed && <span className="truncate">{item.name}</span>}
          {isCollapsed && (
            <div className="absolute left-16 bg-bg-card-hover/40 border border-border/30 text-xs font-semibold px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 whitespace-nowrap shadow-xl">
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
        "fixed inset-y-0 left-0 bg-bg-card/75 backdrop-blur-[12px] border-r border-border/30 flex flex-col transition-all duration-200 shadow-elevated z-30",
        // Desktop layouts
        "lg:translate-x-0",
        isCollapsed ? "lg:w-[60px]" : "lg:w-[220px]",
        // Mobile drawer transition & layouts
        "z-40 w-[240px]",
        isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}
    >
      {/* Sidebar Header / Logo */}
      <div className="h-14 px-4 flex items-center justify-between border-b border-border/30 shrink-0">
        {!isCollapsed || isMobileOpen ? (
          <div className="flex items-center text-base font-bold tracking-tight select-none">
            <span className="text-primary font-bold">Veloxis</span>
            <span className="text-accent font-bold">Global</span>
          </div>
        ) : (
          <div className="w-full flex justify-center text-lg font-bold text-primary select-none">
            V
          </div>
        )}
        
        {/* Toggle Collapse Button (desktop only) */}
        {!isCollapsed && (
          <button
            onClick={() => setIsCollapsed(true)}
            className="hidden lg:block text-text-secondary hover:text-text-primary p-1 rounded hover:bg-bg-card-hover/20 transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
        )}

        {/* Close Button (mobile only) */}
        {isMobileOpen && (
          <button
            onClick={() => setIsMobileOpen?.(false)}
            className="lg:hidden text-text-secondary hover:text-text-primary p-1.5 rounded-md hover:bg-bg-card-hover/20 transition-colors cursor-pointer"
          >
            <X size={16} className="stroke-[1.5]" />
          </button>
        )}
      </div>

      {isCollapsed && (
        <div className="hidden lg:flex justify-center py-2 border-b border-border/30">
          <button
            onClick={() => setIsCollapsed(false)}
            className="text-text-secondary hover:text-text-primary p-1 rounded hover:bg-bg-card-hover/20 transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* Navigation Content */}
      <div className="flex-1 overflow-y-auto px-2 py-4 space-y-5 scrollbar-thin">
        {/* MARKETING */}
        <div className="space-y-1">
          {!isCollapsed && (
            <div className="px-3 text-[10px] font-semibold text-text-tertiary uppercase tracking-wider mb-2 select-none">
              Marketing
            </div>
          )}
          <nav className="flex flex-col gap-0.5">
            <Link
              href="/dashboard/my-agency"
              className={cn(
                "group flex items-center gap-3 px-3 py-2 rounded-md font-medium text-[13px] transition-all duration-150 relative cursor-pointer",
                pathname === '/dashboard/my-agency' || pathname.startsWith('/dashboard/my-agency/')
                  ? "bg-accent/15 text-accent border-l-[3px] border-accent pl-[9px]"
                  : "text-text-secondary hover:bg-primary/10 hover:text-text-primary"
              )}
            >
              <Building2
                size={16}
                className={cn(
                  "stroke-[1.5]",
                  pathname === '/dashboard/my-agency' || pathname.startsWith('/dashboard/my-agency/')
                    ? "text-accent"
                    : "text-text-secondary group-hover:text-text-primary"
                )}
              />
              {!isCollapsed && (
                <div className="flex items-center justify-between w-full min-w-0">
                  <span className="truncate">Agency Marketing</span>
                  <span className="h-1.5 w-1.5 rounded-full bg-accent shrink-0" />
                </div>
              )}
              {isCollapsed && (
                <div className="absolute left-16 bg-bg-card-hover/40 border border-border/30 text-xs font-semibold px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 whitespace-nowrap shadow-xl">
                  Agency Marketing (Veloxis Global)
                </div>
              )}
            </Link>
          </nav>
          {!isCollapsed && (
            <div className="border-b border-border/30/20 my-2 mx-3" />
          )}
        </div>

        {/* INTERNAL */}
        <div className="space-y-1">
          {!isCollapsed && (
            <div className="px-3 text-[10px] font-semibold text-text-tertiary uppercase tracking-wider mb-2 select-none">
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
            <div className="px-3 text-[10px] font-semibold text-text-tertiary uppercase tracking-wider mb-2 select-none">
              Client Delivery
            </div>
          )}
          <nav className="flex flex-col gap-0.5">
            {renderNavItems(deliveryRoutes)}
          </nav>
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="p-2 border-t border-border/30 flex flex-col gap-0.5 shrink-0">
        <nav className="flex flex-col gap-0.5">
          {renderNavItems(bottomRoutes)}
        </nav>

        {/* User profile & Logout */}
        <div className={cn(
          "mt-2 rounded-lg bg-bg-card-hover/30 p-2 border border-border/20 flex items-center justify-between gap-2 overflow-hidden",
          isCollapsed ? "lg:justify-center" : ""
        )}>
          <div className="flex items-center gap-2.5 overflow-hidden">
            <Avatar className="h-7 w-7 border border-border/30">
              <AvatarImage src={userProfile?.avatar_url || undefined} />
              <AvatarFallback className="bg-primary text-[10px] text-white uppercase font-bold select-none">
                {userProfile?.full_name?.substring(0, 2) || 'AD'}
              </AvatarFallback>
            </Avatar>
            {(!isCollapsed || isMobileOpen) && (
              <div className={cn("flex flex-col text-left overflow-hidden min-w-0", isCollapsed && "lg:hidden")}>
                <span className="text-xs font-semibold text-text-primary truncate select-none">
                  {userProfile?.full_name || 'Admin User'}
                </span>
                <span className="text-[10px] text-text-secondary truncate select-none">
                  {userProfile?.email || 'admin@veloxisglobal.com'}
                </span>
              </div>
            )}
          </div>
          
          {(!isCollapsed || isMobileOpen) && (
            <button
              onClick={handleLogout}
              className={cn("text-text-secondary hover:text-error p-1.5 rounded hover:bg-error/15 transition-colors shrink-0", isCollapsed && "lg:hidden")}
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
