'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Instagram, Facebook, Linkedin, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PostWithClient } from './social-dashboard';

interface SocialCalendarProps {
  currentDate: Date;
  posts: PostWithClient[];
  onSelectDate: (date: Date) => void;
  onSelectPost: (post: PostWithClient) => void;
}

export function SocialCalendar({
  currentDate,
  posts,
  onSelectDate,
  onSelectPost
}: SocialCalendarProps) {
  // Setup days of the week starting from Monday (as requested: Mon-Sun)
  const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // First day of the month
  const firstDayOfMonth = new Date(year, month, 1);
  // Get weekday index (0 for Sun, 1 for Mon, ..., 6 for Sat)
  let startDayIndex = firstDayOfMonth.getDay();
  // Adjust so Monday is 0, Sunday is 6
  startDayIndex = startDayIndex === 0 ? 6 : startDayIndex - 1;

  // Days in month
  const totalDays = new Date(year, month + 1, 0).getDate();

  // Create array of days representing the calendar grid
  const days: (Date | null)[] = [];
  
  // Fill starting padding with nulls
  for (let i = 0; i < startDayIndex; i++) {
    days.push(null);
  }

  // Fill actual month days
  for (let d = 1; d <= totalDays; d++) {
    days.push(new Date(year, month, d));
  }

  // Fill trailing padding with nulls to make complete rows of 7
  const remainingCells = days.length % 7;
  if (remainingCells > 0) {
    for (let i = 0; i < 7 - remainingCells; i++) {
      days.push(null);
    }
  }

  // Get posts for a specific date
  const getPostsForDate = (date: Date) => {
    return posts.filter((post) => {
      if (!post.scheduled_for) return false;
      const postDate = new Date(post.scheduled_for);
      return (
        postDate.getDate() === date.getDate() &&
        postDate.getMonth() === date.getMonth() &&
        postDate.getFullYear() === date.getFullYear()
      );
    });
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'instagram':
        return <Instagram size={10} className="text-pink-500" />;
      case 'facebook':
        return <Facebook size={10} className="text-blue-500" />;
      case 'linkedin':
        return <Linkedin size={10} className="text-cyan-500" />;
      default:
        return <Layers size={10} className="text-slate-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'published':
        return 'bg-[#22C55E]';
      case 'approved':
      case 'scheduled':
        return 'bg-[#1B4FD8]';
      case 'review':
        return 'bg-[#F59E0B]';
      default: // draft
        return 'bg-[#64748B]';
    }
  };

  return (
    <div className="bg-[#0D1829] border border-[#1E3352] rounded-lg overflow-hidden select-none">
      {/* Calendar Header Weekdays */}
      <div className="grid grid-cols-7 border-b border-[#1E3352] bg-[#060D1A]/50">
        {weekdays.map((day) => (
          <div
            key={day}
            className="py-2.5 text-center text-[10px] font-bold text-[#4A6480] uppercase tracking-wider border-r border-[#1E3352] last:border-r-0"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Days Grid */}
      <div className="grid grid-cols-7 auto-rows-[120px]">
        {days.map((date, idx) => {
          const isToday =
            date &&
            date.getDate() === new Date().getDate() &&
            date.getMonth() === new Date().getMonth() &&
            date.getFullYear() === new Date().getFullYear();

          const datePosts = date ? getPostsForDate(date) : [];

          return (
            <div
              key={idx}
              className={cn(
                "p-2 border-r border-b border-[#1E3352] relative flex flex-col justify-between group transition-colors",
                !date && "bg-[#060D1A]/10 cursor-not-allowed",
                date && "hover:bg-[#132035]/30 cursor-pointer",
                isToday && "bg-[#1B4FD8]/5 border-[#1B4FD8]/40"
              )}
              onClick={() => date && onSelectDate(date)}
            >
              {/* Day Cell Header */}
              <div className="flex justify-between items-start">
                <span
                  className={cn(
                    "text-[11px] font-bold font-mono",
                    isToday
                      ? "bg-[#1B4FD8] text-white w-5 h-5 flex items-center justify-center rounded-full"
                      : date
                        ? "text-[#8BA3C7]"
                        : "text-[#4A6480]/30"
                  )}
                >
                  {date ? date.getDate() : ''}
                </span>

                {date && (
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectDate(date);
                    }}
                    className="opacity-0 group-hover:opacity-100 h-5 w-5 rounded bg-[#132035] hover:bg-[#1A2D47] border border-[#1E3352]/50 text-[#8BA3C7] hover:text-[#F0F4FF] transition-opacity"
                  >
                    <Plus size={10} />
                  </Button>
                )}
              </div>

              {/* Day Cell Body (Posts list) */}
              <div className="flex-1 overflow-y-auto mt-1.5 space-y-1 pr-0.5 max-h-[75px] scrollbar-thin">
                {datePosts.map((post) => (
                  <div
                    key={post.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectPost(post);
                    }}
                    className="flex items-center gap-1.5 p-1 rounded bg-[#060D1A] hover:bg-[#1A2D47] border border-[#1E3352]/70 text-[9px] font-medium text-[#8BA3C7] hover:text-[#F0F4FF] transition-colors"
                  >
                    {/* Status dot */}
                    <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", getStatusColor(post.status))} />
                    
                    {/* Icon */}
                    <span className="shrink-0">{getPlatformIcon(post.platform)}</span>

                    {/* Client Chip (initials or prefix) */}
                    <span className="font-semibold text-[#F97316] uppercase truncate shrink-0 max-w-[40px]">
                      {post.clients?.name
                        ? post.clients.name.split(' ').map((n) => n[0]).join('').substring(0, 2)
                        : 'CL'}
                    </span>

                    {/* Content type or caption snippet */}
                    <span className="truncate flex-1 text-[#8BA3C7] opacity-80">
                      {post.caption || post.content_type || 'post'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
export default SocialCalendar;
