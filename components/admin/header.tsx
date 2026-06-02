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
import { Search, Bell, LogOut, User, Settings, CheckSquare, BellOff } from 'lucide-react';
import type { Notification } from '@/types';
import { toast } from 'sonner';

interface HeaderProps {
  userProfile?: {
    id: string;
    full_name: string;
    email: string;
    avatar_url?: string | null;
  } | null;
}

export function Header({ userProfile }: HeaderProps) {
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
    if (path.startsWith('/dashboard/my-agency')) return 'My Agency';
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
    <header className="sticky top-0 h-13 border-b border-[#1E3352] bg-[#060D1A]/95 backdrop-blur-md flex items-center justify-between px-6 z-20 shrink-0">
      {/* Dynamic Title */}
      <h1 className="text-[18px] font-semibold text-[#F0F4FF]">
        {getPageTitle(pathname)}
      </h1>

      {/* Right Elements */}
      <div className="flex items-center gap-4">
        {/* Global Search Input */}
        <div className="relative w-64 md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#8BA3C7] stroke-[1.5]" />
          <Input
            ref={searchInputRef}
            type="text"
            placeholder="Search..."
            className="w-full h-8 pl-9 pr-8 bg-[#0D1829] border-[#1E3352] text-[#F0F4FF] placeholder-[#8BA3C7]/60 text-xs rounded-md focus:border-[#1B4FD8] focus:ring-1 focus:ring-[#1B4FD8]/30 transition-all"
          />
          <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 select-none items-center gap-1 rounded border border-[#1E3352] bg-[#132035] px-1.5 font-mono text-[9px] font-medium text-[#8BA3C7] flex pointer-events-none">
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
                className="h-8 w-8 rounded-md border-[#1E3352] bg-[#0D1829] hover:bg-[#132035] hover:text-[#F0F4FF] text-[#8BA3C7] relative cursor-pointer"
              >
                <Bell className="h-4 w-4 stroke-[1.5]" />
                <span className={cn(
                  "absolute -top-1 -right-1 h-4 min-w-4 rounded-full flex items-center justify-center text-[9px] font-bold px-1 select-none transition-colors duration-150",
                  unreadCount > 0 ? "bg-[#EF4444] text-[#F0F4FF]" : "bg-[#1E3352] text-[#8BA3C7]"
                )}>
                  {unreadCount}
                </span>
              </Button>
            }
          />
          <DropdownMenuContent
            align="end"
            className="w-80 bg-[#0D1829] border-[#1E3352] text-[#F0F4FF] shadow-2xl p-1 z-30"
          >
            <div className="flex items-center justify-between p-2 font-semibold text-xs border-b border-[#1E3352]">
              <span className="text-[#F0F4FF]">Notifications</span>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-[#4D90FE] hover:text-[#2563EB] text-[10px] flex items-center gap-1 font-medium transition-colors"
                >
                  <CheckSquare size={11} />
                  Mark all read
                </button>
              )}
            </div>
            
            <div className="max-h-72 overflow-y-auto divide-y divide-[#1E3352]/50">
              {notifications.length === 0 ? (
                <div className="py-6 px-4 text-center text-xs text-[#8BA3C7] flex flex-col items-center gap-2">
                  <BellOff size={24} className="text-[#4A6480] stroke-[1.5]" />
                  <span>No notifications</span>
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    className={cn(
                      "p-2.5 text-xs transition-colors hover:bg-[#132035] relative flex flex-col gap-0.5 cursor-pointer",
                      !n.is_read && "bg-[#1B4FD810] border-l-2 border-[#1B4FD8]"
                    )}
                    onClick={() => {
                      if (!n.is_read) handleMarkAsRead(n.id);
                      if (n.link) router.push(n.link);
                    }}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <span className="font-semibold text-xs text-[#F0F4FF] leading-snug">
                        {n.title}
                      </span>
                      {!n.is_read && (
                        <span className="h-1.5 w-1.5 rounded-full bg-[#1B4FD8] shrink-0 mt-1" />
                      )}
                    </div>
                    {n.message && (
                      <p className="text-[11px] text-[#8BA3C7] leading-relaxed">
                        {n.message}
                      </p>
                    )}
                    <span className="text-[9px] text-[#4A6480] mt-1 select-none">
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
                className="p-0.5 h-8 w-8 rounded-full border border-[#1E3352] focus-visible:ring-0 focus-visible:ring-offset-0 overflow-hidden cursor-pointer"
              >
                <Avatar className="h-full w-full">
                  <AvatarImage src={userProfile?.avatar_url || undefined} />
                  <AvatarFallback className="bg-[#1B4FD8] text-xs text-white uppercase font-bold select-none">
                    {userProfile?.full_name?.substring(0, 2) || 'AD'}
                  </AvatarFallback>
                </Avatar>
              </Button>
            }
          />
          <DropdownMenuContent
            align="end"
            className="w-56 bg-[#0D1829] border-[#1E3352] text-[#F0F4FF] shadow-2xl p-1 z-30"
          >
            <DropdownMenuLabel className="px-2 py-1.5 flex flex-col">
              <span className="text-xs font-semibold text-[#F0F4FF] truncate select-none">
                {userProfile?.full_name || 'Admin User'}
              </span>
              <span className="text-[10px] text-[#8BA3C7] font-normal truncate select-none">
                {userProfile?.email || 'admin@veloxisglobal.com'}
              </span>
            </DropdownMenuLabel>
            
            <DropdownMenuSeparator className="bg-[#1E3352]" />
            
            <DropdownMenuItem
              className="text-xs focus:bg-[#132035] focus:text-[#F0F4FF] cursor-pointer"
              onClick={() => router.push('/dashboard/settings')}
            >
              <User className="mr-2 h-3.5 w-3.5 text-[#8BA3C7]" />
              <span>Profile Settings</span>
            </DropdownMenuItem>
            
            <DropdownMenuItem
              className="text-xs focus:bg-[#132035] focus:text-[#F0F4FF] cursor-pointer"
              onClick={() => router.push('/dashboard/settings')}
            >
              <Settings className="mr-2 h-3.5 w-3.5 text-[#8BA3C7]" />
              <span>Agency Settings</span>
            </DropdownMenuItem>
            
            <DropdownMenuSeparator className="bg-[#1E3352]" />
            
            <DropdownMenuItem
              className="text-xs text-[#EF4444] focus:bg-[#EF444415] focus:text-[#EF4444] cursor-pointer"
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
