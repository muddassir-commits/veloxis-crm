/* eslint-disable */
'use client';

import React, { useState, useTransition } from 'react';
import { PageContainer } from '@/components/shared/page-container';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon, List, AlertCircle, BarChart3, Plus, ChevronLeft, ChevronRight, RefreshCw, Instagram, Facebook, Linkedin, Users } from 'lucide-react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { SocialCalendar } from './social-calendar';
import { SocialListView } from './social-list-view';
import { SocialReviewQueue } from './social-review-queue';
import { SocialMetricsView } from './social-metrics-view';
import { SchedulePostModal } from './schedule-post-modal';
import { createClient } from '@/lib/supabase/client';
import { Client, AgencySocialAccount } from '@/types';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export interface PostWithClient {
  id: string;
  client_id: string;
  platform: string;
  content_type: string | null;
  caption: string | null;
  scheduled_for: string | null;
  status: string;
  assigned_to: string | null;
  design_file_id: string | null;
  clients?: {
    name: string;
    is_agency_self: boolean;
  };
  profiles?: {
    full_name: string;
  };
}

interface SocialDashboardProps {
  initialClients: Client[];
  initialPosts: PostWithClient[];
  initialAgencySocial: AgencySocialAccount[];
  selectedMonth: string;
  selectedClient: string;
}

export function SocialDashboard({
  initialClients,
  initialPosts,
  initialAgencySocial,
  selectedMonth,
  selectedClient
}: SocialDashboardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const supabase = createClient();

  const [posts, setPosts] = useState<PostWithClient[]>(initialPosts);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Month navigation helpers
  const monthsList = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  const parseMonthYear = (str: string) => {
    const [mName, yStr] = str.split(' ');
    const mIdx = monthsList.indexOf(mName);
    const year = parseInt(yStr, 10);
    return new Date(year, mIdx, 1);
  };

  const currentParsedDate = parseMonthYear(selectedMonth);

  const updateFilters = (newMonth: string, newClient: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('month', newMonth);
    params.set('client', newClient);
    
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const d = new Date(currentParsedDate);
    if (direction === 'prev') {
      d.setMonth(d.getMonth() - 1);
    } else {
      d.setMonth(d.getMonth() + 1);
    }
    const monthStr = `${monthsList[d.getMonth()]} ${d.getFullYear()}`;
    updateFilters(monthStr, selectedClient);
  };

  const refreshData = async () => {
    let query = supabase
      .from('social_posts')
      .select('*, clients(name, is_agency_self), profiles(full_name)')
      .eq('month_year', selectedMonth);

    if (selectedClient !== 'all') {
      query = query.eq('client_id', selectedClient);
    }
    const { data } = await query.order('scheduled_for', { ascending: true });
    setPosts(data || []);
  };

  const handleSelectDate = (date: Date) => {
    setSelectedDate(date);
    setScheduleOpen(true);
  };

  const handleSelectPost = (post: PostWithClient) => {
    // Show quick info or trigger edit
    toast.info(`Post Info: [${post.platform.toUpperCase()}] ${post.content_type || 'Post'} scheduled for ${new Date(post.scheduled_for || '').toLocaleDateString()}`);
  };

  const handleDeletePost = async (post: PostWithClient) => {
    if (!confirm('Are you sure you want to delete this scheduled post?')) return;
    try {
      const { error } = await supabase.from('social_posts').delete().eq('id', post.id);
      if (error) throw error;
      toast.success('Social post deleted');
      refreshData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete post');
    }
  };

  // Stats computation for header
  const reviewCount = posts.filter((p) => p.status === 'review').length;
  const scheduledCount = posts.filter((p) => p.status === 'scheduled').length;
  const publishedCount = posts.filter((p) => p.status === 'published').length;

  return (
    <PageContainer
      title="Social Media"
      description="Plan client content calendars, approve student graphic posts, and monitor organic reach."
    >
      <div className="space-y-6 select-none">
        {/* 1. Toolbar Row */}
        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 bg-bg-card border border-border/30 p-4 rounded-lg">
          <div className="flex flex-wrap items-center gap-3">
            {/* Client Filter */}
            <Select value={selectedClient} onValueChange={(val) => updateFilters(selectedMonth, val || 'all')}>
              <SelectTrigger className="w-[180px] bg-bg-dark border-border/30 text-text-primary text-xs h-9">
                <SelectValue placeholder="All Clients" />
              </SelectTrigger>
              <SelectContent className="bg-bg-card border-border/30 text-text-primary">
                <SelectItem value="all" className="text-xs">All Clients</SelectItem>
                {initialClients.map((c) => (
                  <SelectItem key={c.id} value={c.id} className="text-xs">
                    {c.name} {c.is_agency_self && '🏢'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Month Navigator */}
            <div className="flex items-center gap-1.5 bg-bg-dark border border-border/30 rounded-[7px] px-1.5 h-9">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigateMonth('prev')}
                className="h-6 w-6 text-text-secondary hover:text-text-primary hover:bg-bg-card-hover/20 rounded"
              >
                <ChevronLeft size={14} />
              </Button>
              <span className="text-[11px] font-bold text-text-primary min-w-[70px] text-center font-mono">
                {selectedMonth}
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigateMonth('next')}
                className="h-6 w-6 text-text-secondary hover:text-text-primary hover:bg-bg-card-hover/20 rounded"
              >
                <ChevronRight size={14} />
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              onClick={refreshData}
              className="border-border/30 hover:bg-bg-card-hover/20 text-text-secondary h-9 w-9"
              title="Refresh"
            >
              <RefreshCw size={14} />
            </Button>
            <Button
              onClick={() => {
                setSelectedDate(null);
                setScheduleOpen(true);
              }}
              className="bg-primary hover:bg-primary-light text-white text-xs h-9"
            >
              <Plus size={14} className="mr-1" /> Schedule Post
            </Button>
          </div>
        </div>

        {/* 2. Mini Stats strip */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-bg-card border border-border/30 p-3 rounded-lg flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-text-tertiary tracking-wider">Scheduled Posts</span>
            <span className="text-sm font-bold font-mono text-text-primary bg-primary/15 px-2 py-0.5 rounded border border-primary/30">
              {scheduledCount}
            </span>
          </div>
          <div className="bg-bg-card border border-border/30 p-3 rounded-lg flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-text-tertiary tracking-wider">Published Posts</span>
            <span className="text-sm font-bold font-mono text-text-primary bg-online/15 px-2 py-0.5 rounded border border-online/30 text-online">
              {publishedCount}
            </span>
          </div>
          <div className="bg-bg-card border border-border/30 p-3 rounded-lg flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-text-tertiary tracking-wider">Pending Review</span>
            <span className={cn(
              "text-sm font-bold font-mono px-2 py-0.5 rounded border",
              reviewCount > 0
                ? "bg-warning/15 text-warning border-warning/30"
                : "bg-border-subtle/15 text-text-tertiary border-border/30"
            )}>
              {reviewCount}
            </span>
          </div>
        </div>

        {/* 3. Main Content Tabs */}
        <Tabs defaultValue="calendar" className="w-full">
          <TabsList className="bg-bg-card border border-border/30 p-1 h-9 rounded-lg">
            <TabsTrigger value="calendar" className="text-xs h-7 data-[state=active]:bg-bg-card-hover/20 data-[state=active]:text-text-primary text-text-secondary">
              <CalendarIcon size={12} className="mr-1.5" /> Calendar View
            </TabsTrigger>
            <TabsTrigger value="list" className="text-xs h-7 data-[state=active]:bg-bg-card-hover/20 data-[state=active]:text-text-primary text-text-secondary">
              <List size={12} className="mr-1.5" /> List View
            </TabsTrigger>
            <TabsTrigger value="review" className="text-xs h-7 data-[state=active]:bg-bg-card-hover/20 data-[state=active]:text-text-primary text-text-secondary relative">
              <AlertCircle size={12} className="mr-1.5" /> Review Queue
              {reviewCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white w-4 h-4 flex items-center justify-center rounded-full text-[8px] font-black animate-pulse">
                  {reviewCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="metrics" className="text-xs h-7 data-[state=active]:bg-bg-card-hover/20 data-[state=active]:text-text-primary text-text-secondary">
              <BarChart3 size={12} className="mr-1.5" /> Organic Reach Metrics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="calendar" className="mt-4 focus-visible:outline-none">
            <SocialCalendar
              currentDate={currentParsedDate}
              posts={posts}
              onSelectDate={handleSelectDate}
              onSelectPost={handleSelectPost}
            />
          </TabsContent>

          <TabsContent value="list" className="mt-4 focus-visible:outline-none">
            <SocialListView
              posts={posts}
              onSelectPost={handleSelectPost}
              onEditPost={(post) => {
                setSelectedDate(new Date(post.scheduled_for || ''));
                setScheduleOpen(true);
              }}
              onDeletePost={handleDeletePost}
            />
          </TabsContent>

          <TabsContent value="review" className="mt-4 focus-visible:outline-none">
            <SocialReviewQueue
              posts={posts.filter((p) => p.status === 'review')}
              onRefresh={refreshData}
            />
          </TabsContent>

          <TabsContent value="metrics" className="mt-4 focus-visible:outline-none">
            <SocialMetricsView
              clientId={selectedClient}
              monthYear={selectedMonth}
              clients={initialClients}
            />
          </TabsContent>
        </Tabs>
      </div>

      <SchedulePostModal
        open={scheduleOpen}
        onOpenChange={setScheduleOpen}
        onSuccess={refreshData}
        prefilledDate={selectedDate}
      />
    </PageContainer>
  );
}
export default SocialDashboard;
