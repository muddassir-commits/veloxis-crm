/* eslint-disable */
'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart3, LineChart, Users, Eye, MousePointer, BookOpen, Plus } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, Legend } from 'recharts';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { StatCard } from '@/components/shared/stat-card';
import { Client } from '@/types';

interface MetricRecord {
  id: string;
  client_id: string;
  platform: string;
  month_year: string;
  followers: number;
  new_followers: number;
  reach: number;
  impressions: number;
  engagements: number;
  engagement_rate: number | null;
  posts_published: number;
  profile_visits: number;
  white_clicks?: number;
  website_clicks?: number;
}

interface SocialMetricsViewProps {
  clientId: string;
  monthYear: string;
  clients: Client[];
}

export function SocialMetricsView({ clientId, monthYear, clients }: SocialMetricsViewProps) {
  const supabase = createClient();
  const [metrics, setMetrics] = useState<MetricRecord[]>([]);
  const [history, setHistory] = useState<MetricRecord[]>([]);
  const [logOpen, setLogOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form states
  const [formClient, setFormClient] = useState('');
  const [formPlatform, setFormPlatform] = useState('instagram');
  const [formMonth, setFormMonth] = useState(monthYear);
  const [followers, setFollowers] = useState(0);
  const [newFollowers, setNewFollowers] = useState(0);
  const [reach, setReach] = useState(0);
  const [impressions, setImpressions] = useState(0);
  const [engagements, setEngagements] = useState(0);
  const [posts, setPosts] = useState(0);
  const [visits, setVisits] = useState(0);
  const [clicks, setClicks] = useState(0);

  useEffect(() => {
    loadMetrics();
  }, [clientId, monthYear]);

  async function loadMetrics() {
    let query = supabase.from('social_media_metrics').select('*');
    if (clientId && clientId !== 'all') {
      query = query.eq('client_id', clientId);
    }
    const { data: allMetrics } = await query.order('month_year', { ascending: true });
    
    const formatted = (allMetrics || []).map((m: any) => ({
      ...m,
      followers: Number(m.followers || 0),
      new_followers: Number(m.new_followers || 0),
      reach: Number(m.reach || 0),
      impressions: Number(m.impressions || 0),
      engagements: Number(m.engagements || 0),
      posts_published: Number(m.posts_published || 0),
      profile_visits: Number(m.profile_visits || 0),
      website_clicks: Number(m.website_clicks || m.white_clicks || 0),
    }));

    setHistory(formatted);

    // Filter current selected month_year metrics
    const current = formatted.filter((m) => m.month_year === monthYear);
    setMetrics(current);
  }

  const handleLogSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formClient) {
      toast.error('Please select a client');
      return;
    }

    setLoading(true);
    try {
      const erRate = reach > 0 ? Number(((engagements / reach) * 100).toFixed(2)) : 0;
      
      const { error } = await supabase.from('social_media_metrics').upsert({
        client_id: formClient,
        platform: formPlatform,
        month_year: formMonth,
        followers,
        new_followers: newFollowers,
        reach,
        impressions,
        engagements,
        posts_published: posts,
        profile_visits: visits,
        website_clicks: clicks,
        engagement_rate: erRate,
      }, {
        onConflict: 'client_id,platform,month_year'
      });

      if (error) throw error;

      toast.success('Platform metrics logged successfully');
      setLogOpen(false);
      loadMetrics();
    } catch (err: any) {
      toast.error(err.message || 'Failed to log metrics');
    } finally {
      setLoading(false);
    }
  };

  // Compile totals for StatCards
  const totalFollowers = metrics.reduce((sum, m) => sum + m.followers, 0);
  const totalReach = metrics.reduce((sum, m) => sum + m.reach, 0);
  const totalImpressions = metrics.reduce((sum, m) => sum + m.impressions, 0);
  const totalClicks = metrics.reduce((sum, m) => sum + (m.website_clicks || 0), 0);
  const totalPosts = metrics.reduce((sum, m) => sum + m.posts_published, 0);
  const avgEngagementRate = metrics.length > 0 
    ? (metrics.reduce((sum, m) => sum + Number(m.engagement_rate || 0), 0) / metrics.length).toFixed(1)
    : '0';

  // Grouped chart data
  const chartDataMap: Record<string, any> = {};
  history.forEach((m) => {
    if (!chartDataMap[m.month_year]) {
      chartDataMap[m.month_year] = { month: m.month_year, reach: 0, followers: 0, clicks: 0 };
    }
    chartDataMap[m.month_year].reach += m.reach;
    chartDataMap[m.month_year].followers += m.followers;
    chartDataMap[m.month_year].clicks += (m.website_clicks || 0);
  });
  const chartData = Object.values(chartDataMap);

  return (
    <div className="space-y-6 select-none">
      {/* 1. Header with Log Metrics Button */}
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-bold text-[#F0F4FF]">Performance Analytics</h3>
        <Button
          size="sm"
          onClick={() => setLogOpen(true)}
          className="bg-[#1B4FD8] hover:bg-[#2563EB] text-white text-xs h-8"
        >
          <Plus size={14} className="mr-1" /> Log Monthly Metrics
        </Button>
      </div>

      {/* 2. Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <StatCard title="Total Followers" value={totalFollowers.toLocaleString()} icon={Users} />
        <StatCard title="Total Reach" value={totalReach.toLocaleString()} icon={BarChart3} />
        <StatCard title="Impressions" value={totalImpressions.toLocaleString()} icon={Eye} />
        <StatCard title="Website Clicks" value={totalClicks.toLocaleString()} icon={MousePointer} />
        <StatCard title="Posts Published" value={totalPosts.toLocaleString()} icon={BookOpen} />
        <StatCard title="Engagement Rate" value={`${avgEngagementRate}%`} icon={LineChart} />
      </div>

      {/* 3. Charts Area */}
      {chartData.length === 0 ? (
        <div className="bg-[#0D1829] border border-[#1E3352] rounded-lg p-12 text-center text-xs text-[#8BA3C7] space-y-2">
          <p className="font-semibold text-slate-500">No history data available for charts</p>
          <p className="text-[10px] text-[#4A6480]">Once you log metrics for consecutive months, performance graphs will render here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Reach Area Chart */}
          <Card className="bg-[#0D1829] border-[#1E3352] text-[#F0F4FF] overflow-hidden">
            <CardContent className="p-5 space-y-3">
              <h4 className="text-xs font-bold text-[#F0F4FF]">Monthly Reach Trend</h4>
              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorReach" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#1B4FD8" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#1B4FD8" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#1E3352" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="month" tick={{ fill: '#4A6480', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#4A6480', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#0D1829', borderColor: '#1E3352', color: '#F0F4FF', fontSize: 11 }} />
                    <Area type="monotone" dataKey="reach" stroke="#1B4FD8" strokeWidth={2} fillOpacity={1} fill="url(#colorReach)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Followers & Clicks Bar Chart */}
          <Card className="bg-[#0D1829] border-[#1E3352] text-[#F0F4FF] overflow-hidden">
            <CardContent className="p-5 space-y-3">
              <h4 className="text-xs font-bold text-[#F0F4FF]">Followers & Clicks Growth</h4>
              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid stroke="#1E3352" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="month" tick={{ fill: '#4A6480', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#4A6480', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#0D1829', borderColor: '#1E3352', color: '#F0F4FF', fontSize: 11 }} />
                    <Legend wrapperStyle={{ fontSize: 10, color: '#8BA3C7' }} />
                    <Bar dataKey="followers" fill="#8B5CF6" name="Followers" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="clicks" fill="#F97316" name="Clicks" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Log Metrics Modal */}
      <Dialog open={logOpen} onOpenChange={setLogOpen}>
        <DialogContent className="max-w-lg bg-[#0D1829] border border-[#1E3352] text-[#F0F4FF] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-[#F0F4FF]">Log Social Media Metrics</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleLogSubmit} className="space-y-4 py-2 text-xs">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[#8BA3C7] text-[11px] font-medium">Client *</Label>
                <Select value={formClient} onValueChange={(val) => setFormClient(val || '')}>
                  <SelectTrigger className="bg-[#060D1A] border-[#1E3352] text-[#F0F4FF] text-xs h-9">
                    <SelectValue placeholder="Client" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0D1829] border-[#1E3352] text-[#F0F4FF]">
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={c.id} className="text-xs">
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[#8BA3C7] text-[11px] font-medium">Platform *</Label>
                <Select value={formPlatform} onValueChange={(val) => setFormPlatform(val || '')}>
                  <SelectTrigger className="bg-[#060D1A] border-[#1E3352] text-[#F0F4FF] text-xs h-9">
                    <SelectValue placeholder="Platform" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0D1829] border-[#1E3352] text-[#F0F4FF]">
                    <SelectItem value="instagram" className="text-xs">Instagram</SelectItem>
                    <SelectItem value="facebook" className="text-xs">Facebook</SelectItem>
                    <SelectItem value="linkedin" className="text-xs">LinkedIn</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[#8BA3C7] text-[11px] font-medium">Month/Year *</Label>
                <Input
                  type="text"
                  value={formMonth}
                  onChange={(e) => setFormMonth(e.target.value)}
                  placeholder="e.g. Jun 2026"
                  className="bg-[#060D1A] border-[#1E3352] text-[#F0F4FF] text-xs h-9"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[#8BA3C7] text-[11px] font-medium">Total Followers</Label>
                <Input
                  type="number"
                  value={followers || ''}
                  onChange={(e) => setFollowers(Number(e.target.value))}
                  className="bg-[#060D1A] border-[#1E3352] text-[#F0F4FF] text-xs h-9"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[#8BA3C7] text-[11px] font-medium">New Followers</Label>
                <Input
                  type="number"
                  value={newFollowers || ''}
                  onChange={(e) => setNewFollowers(Number(e.target.value))}
                  className="bg-[#060D1A] border-[#1E3352] text-[#F0F4FF] text-xs h-9"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[#8BA3C7] text-[11px] font-medium">Reach</Label>
                <Input
                  type="number"
                  value={reach || ''}
                  onChange={(e) => setReach(Number(e.target.value))}
                  className="bg-[#060D1A] border-[#1E3352] text-[#F0F4FF] text-xs h-9"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[#8BA3C7] text-[11px] font-medium">Impressions</Label>
                <Input
                  type="number"
                  value={impressions || ''}
                  onChange={(e) => setImpressions(Number(e.target.value))}
                  className="bg-[#060D1A] border-[#1E3352] text-[#F0F4FF] text-xs h-9"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[#8BA3C7] text-[11px] font-medium">Engagements</Label>
                <Input
                  type="number"
                  value={engagements || ''}
                  onChange={(e) => setEngagements(Number(e.target.value))}
                  className="bg-[#060D1A] border-[#1E3352] text-[#F0F4FF] text-xs h-9"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[#8BA3C7] text-[11px] font-medium">Posts Published</Label>
                <Input
                  type="number"
                  value={posts || ''}
                  onChange={(e) => setPosts(Number(e.target.value))}
                  className="bg-[#060D1A] border-[#1E3352] text-[#F0F4FF] text-xs h-9"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[#8BA3C7] text-[11px] font-medium">Profile Visits</Label>
                <Input
                  type="number"
                  value={visits || ''}
                  onChange={(e) => setVisits(Number(e.target.value))}
                  className="bg-[#060D1A] border-[#1E3352] text-[#F0F4FF] text-xs h-9"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[#8BA3C7] text-[11px] font-medium">Website Clicks</Label>
                <Input
                  type="number"
                  value={clicks || ''}
                  onChange={(e) => setClicks(Number(e.target.value))}
                  className="bg-[#060D1A] border-[#1E3352] text-[#F0F4FF] text-xs h-9"
                />
              </div>
            </div>

            <DialogFooter className="mt-4 pt-2 border-t border-[#1E3352]/30">
              <Button
                type="button"
                variant="outline"
                onClick={() => setLogOpen(false)}
                className="border-[#1E3352] hover:bg-[#132035] text-[#8BA3C7] text-xs h-9"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="bg-[#1B4FD8] hover:bg-[#2563EB] text-white text-xs h-9"
              >
                {loading ? 'Saving...' : 'Save Metrics'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
export default SocialMetricsView;
