'use client';

import React, { useState, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Search, Bell, LogOut, User, Settings, CheckSquare, BellOff, Menu } from 'lucide-react';
import type { Notification } from '@/types';
import { toast } from 'sonner';

interface HeaderProps {
  userProfile?: {
    id: string;
    full_name: string;
    email: string;
    avatar_url?: string | null;
  } | null;
  onMenuClick?: () => void;
}

export function Header({ userProfile, onMenuClick }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);
  const supabase = createClient();

  // 1. Dynamic Page Title
  const getPageTitle = (path: string) => {
    if (path === '/dashboard') return 'Overview';
    if (path.startsWith('/dashboard/sales')) return 'Sales';
    if (path.startsWith('/dashboard/marketing')) return 'Marketing';
    if (path.startsWith('/dashboard/finance')) return 'Finance';
    if (path.startsWith('/dashboard/hr')) return 'HR & Team';
    if (path.startsWith('/dashboard/operations')) return 'Operations';
    if (path.startsWith('/dashboard/legal')) return 'Legal';
    if (path.startsWith('/dashboard/it')) return 'IT & Tech';
    if (path.startsWith('/dashboard/clients')) {
      if (path !== '/dashboard/clients') return 'Client Profile';
      return 'Clients';
    }
    if (path.startsWith('/dashboard/seo')) return 'SEO';
    if (path.startsWith('/dashboard/social')) return 'Social Media';
    if (path.startsWith('/dashboard/google-ads')) return 'Google Ads';
    if (path.startsWith('/dashboard/meta-ads')) return 'Meta Ads';
    if (path.startsWith('/dashboard/content')) return 'Content';
    if (path.startsWith('/dashboard/web-design')) return 'Web Design';
    if (path.startsWith('/dashboard/reports')) return 'Reports';
    if (path.startsWith('/dashboard/files')) return 'Files';
    if (path.startsWith('/dashboard/automations')) return 'Automations';
    if (path.startsWith('/dashboard/settings')) return 'Settings';
    if (path.startsWith('/dashboard/my-agency')) return 'Marketing';
    return 'Dashboard';
  };

  // 2. Global search shortcut listener (/)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // 3. Fetch notifications and subscription
  useEffect(() => {
    if (!userProfile?.id) return;

    let active = true;

    const loadNotifications = async () => {
      try {
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', userProfile.id)
          .order('created_at', { ascending: false })
          .limit(10);

        if (error) throw error;

        if (active && data) {
          setNotifications(data as Notification[]);
          const unread = data.filter((n) => !n.is_read).length;
          setUnreadCount(unread);
        }
      } catch (err) {
        console.error('Error fetching notifications:', err);
      }
    };

    loadNotifications();

    const channel = supabase
      .channel(`user-notifications-${userProfile.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userProfile.id}`,
        },
        (payload) => {
          loadNotifications();
          if (payload.eventType === 'INSERT') {
            const newNotif = payload.new as Notification;
            toast(newNotif.title, {
              description: newNotif.message || undefined,
            });
          }
        }
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [userProfile?.id, supabase, refreshTrigger]);

  // 4. Notification Actions
  const handleMarkAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) throw error;
      setRefreshTrigger((prev) => prev + 1);
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const handleMarkAllRead = async () => {
    if (!userProfile?.id) return;
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userProfile.id)
        .eq('is_read', false);

      if (error) throw error;
      setRefreshTrigger((prev) => prev + 1);
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
    }
  };

  const handleLogout = () => {
    window.location.href = '/api/auth/logout';
  };

  return (
    <header className="sticky top-0 h-14 border-b border-border/30 bg-bg-card/75 backdrop-blur-[12px] flex items-center justify-between px-6 z-20 shrink-0 shadow-elevated">
      {/* Left side title and Hamburger */}
      <div className="flex items-center gap-3">
        {/* Mobile Hamburger menu */}
        <button
          onClick={onMenuClick}
          className="lg:hidden text-text-secondary hover:text-text-primary p-1.5 rounded-md hover:bg-bg-card-hover/20 transition-colors cursor-pointer shrink-0"
          title="Open Menu"
        >
          <Menu className="h-4 w-4 stroke-[1.5]" />
        </button>

        {/* Dynamic Title */}
        <h1 className="text-[18px] font-semibold text-text-primary truncate">
          {getPageTitle(pathname)}
        </h1>
      </div>

      {/* Right Elements */}
      <div className="flex items-center gap-4">
        {/* Global Search Input */}
        <div className="relative w-64 md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-secondary stroke-[1.5]" />
          <Input
            ref={searchInputRef}
            type="text"
            placeholder="Search..."
            className="w-full h-8 pl-9 pr-8 bg-bg-card border-border/30 text-text-primary placeholder-text-secondary/60 text-xs rounded-md focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all"
          />
          <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 select-none items-center gap-1 rounded border border-border/30 bg-bg-card-hover/20 px-1.5 font-mono text-[9px] font-medium text-text-secondary flex pointer-events-none">
            /
          </kbd>
        </div>

        {/* Bell Notifications Icon Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 rounded-md border-border/30 bg-bg-card hover:bg-bg-card-hover/20 hover:text-text-primary text-text-secondary relative cursor-pointer"
              >
                <Bell className="h-4 w-4 stroke-[1.5]" />
                <span className={cn(
                  "absolute -top-1 -right-1 h-4 min-w-4 rounded-full flex items-center justify-center text-[9px] font-bold px-1 select-none transition-colors duration-150",
                  unreadCount > 0 ? "bg-error text-text-primary" : "bg-bg-border text-text-secondary"
                )}>
                  {unreadCount}
                </span>
              </Button>
            }
          />
          <DropdownMenuContent
            align="end"
            className="w-80 bg-bg-card border-border/30 text-text-primary shadow-2xl p-1 z-30"
          >
            <div className="flex items-center justify-between p-2 font-semibold text-xs border-b border-border/30">
              <span className="text-text-primary">Notifications</span>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-primary-light hover:text-primary text-[10px] flex items-center gap-1 font-medium transition-colors"
                >
                  <CheckSquare size={11} />
                  Mark all read
                </button>
              )}
            </div>
            
            <div className="max-h-72 overflow-y-auto divide-y divide-bg-border/50">
              {notifications.length === 0 ? (
                <div className="py-6 px-4 text-center text-xs text-text-secondary flex flex-col items-center gap-2">
                  <BellOff size={24} className="text-text-tertiary stroke-[1.5]" />
                  <span>No notifications</span>
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    className={cn(
                      "p-2.5 text-xs transition-colors hover:bg-bg-card-hover/20 relative flex flex-col gap-0.5 cursor-pointer",
                      !n.is_read && "bg-primary/10 border-l-2 border-primary"
                    )}
                    onClick={() => {
                      if (!n.is_read) handleMarkAsRead(n.id);
                      if (n.link) router.push(n.link);
                    }}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <span className="font-semibold text-xs text-text-primary leading-snug">
                        {n.title}
                      </span>
                      {!n.is_read && (
                        <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0 mt-1" />
                      )}
                    </div>
                    {n.message && (
                      <p className="text-[11px] text-text-secondary leading-relaxed">
                        {n.message}
                      </p>
                    )}
                    <span className="text-[9px] text-text-tertiary mt-1 select-none">
                      {new Date(n.created_at).toLocaleDateString()}
                    </span>
                  </div>
                ))
              )}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User Profile Avatar Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                className="p-0.5 h-8 w-8 rounded-full border border-border/30 focus-visible:ring-0 focus-visible:ring-offset-0 overflow-hidden cursor-pointer"
              >
                <Avatar className="h-full w-full">
                  <AvatarImage src={userProfile?.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary text-xs text-white uppercase font-bold select-none">
                    {userProfile?.full_name?.substring(0, 2) || 'AD'}
                  </AvatarFallback>
                </Avatar>
              </Button>
            }
          />
          <DropdownMenuContent
            align="end"
            className="w-56 bg-bg-card border-border/30 text-text-primary shadow-2xl p-1 z-30"
          >
            <DropdownMenuLabel className="px-2 py-1.5 flex flex-col">
              <span className="text-xs font-semibold text-text-primary truncate select-none">
                {userProfile?.full_name || 'Admin User'}
              </span>
              <span className="text-[10px] text-text-secondary font-normal truncate select-none">
                {userProfile?.email || 'admin@veloxisglobal.com'}
              </span>
            </DropdownMenuLabel>
            
            <DropdownMenuSeparator className="bg-border/30" />
            
            <DropdownMenuItem
              className="text-xs focus:bg-bg-card-hover/20 focus:text-text-primary cursor-pointer"
              onClick={() => router.push('/dashboard/settings')}
            >
              <User className="mr-2 h-3.5 w-3.5 text-text-secondary" />
              <span>Profile Settings</span>
            </DropdownMenuItem>
            
            <DropdownMenuItem
              className="text-xs focus:bg-bg-card-hover/20 focus:text-text-primary cursor-pointer"
              onClick={() => router.push('/dashboard/settings')}
            >
              <Settings className="mr-2 h-3.5 w-3.5 text-text-secondary" />
              <span>Agency Settings</span>
            </DropdownMenuItem>
            
            <DropdownMenuSeparator className="bg-border/30" />
            
            <DropdownMenuItem
              className="text-xs text-error focus:bg-error/15 focus:text-error cursor-pointer"
              onClick={handleLogout}
            >
              <LogOut className="mr-2 h-3.5 w-3.5" />
              <span>Sign Out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
