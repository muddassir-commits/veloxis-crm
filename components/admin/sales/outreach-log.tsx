'use client';

import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { formatDate, cn } from '@/lib/utils';
import {
  Plus,
  Search,
  MessageSquare,
  Linkedin,
  Mail,
  Instagram,
  HelpCircle,
  Target
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/shared/data-table';
import { StatusBadge } from '@/components/shared/status-badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { OutreachLog as OutreachLogType } from '@/types';

interface OutreachLogProps {
  outreachLogs: OutreachLogType[];
  onOutreachLogged: () => void;
}

export function OutreachLog({ outreachLogs, onOutreachLogged }: OutreachLogProps) {
  const supabase = createClient();
  const [filterRange, setFilterRange] = useState<'week' | 'month' | 'all'>('all');
  const [modalOpen, setModalOpen] = useState(false);

  // Form states
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    business_name: '',
    contact_name: '',
    phone: '',
    city: '',
    channel: 'linkedin',
    observation: '',
    response: 'no_response',
    follow_up: '',
  });

  // Calculate outreach messages sent today
  const todayStr = new Date().toISOString().split('T')[0];
  const messagesToday = outreachLogs.filter((log) => {
    const logDateStr = log.date ? log.date.split('T')[0] : '';
    return logDateStr === todayStr;
  }).length;

  const getTargetColors = (count: number) => {
    if (count >= 10) {
      return 'bg-success/10 border-success/30 text-success';
    }
    if (count >= 5) {
      return 'bg-accent/10 border-accent/30 text-accent';
    }
    return 'bg-error/10 border-error/30 text-error';
  };

  // Filter logs by date range
  const filteredLogs = outreachLogs.filter((log) => {
    const logDate = new Date(log.date);
    const now = new Date();

    if (filterRange === 'week') {
      const oneWeekAgo = new Date(now.setDate(now.getDate() - 7));
      return logDate >= oneWeekAgo;
    }
    if (filterRange === 'month') {
      const oneMonthAgo = new Date(now.setMonth(now.getMonth() - 1));
      return logDate >= oneMonthAgo;
    }
    return true;
  });

  // Submit Handler
  const handleLogOutreach = async () => {
    if (!form.business_name.trim()) {
      toast.error('Business name is required.');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Unauthenticated');

      const { error } = await supabase.from('outreach_log').insert({
        date: form.date,
        business_name: form.business_name,
        contact_name: form.contact_name || null,
        phone: form.phone || null,
        city: form.city || null,
        channel: form.channel,
        observation: form.observation || null,
        response: form.response,
        follow_up: form.follow_up || null,
        created_by: user.id,
        created_at: new Date().toISOString(),
      });

      if (error) throw error;

      toast.success('Outreach log added successfully.');
      setModalOpen(false);
      setForm({
        date: new Date().toISOString().split('T')[0],
        business_name: '',
        contact_name: '',
        phone: '',
        city: '',
        channel: 'linkedin',
        observation: '',
        response: 'no_response',
        follow_up: '',
      });
      onOutreachLogged();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add outreach log.';
      toast.error(errorMessage);
    }
  };

  // Helper: Channel Icon
  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'whatsapp':
        return <MessageSquare size={14} className="text-success" />;
      case 'linkedin':
        return <Linkedin size={14} className="text-primary-light" />;
      case 'email':
        return <Mail size={14} className="text-error" />;
      case 'instagram':
        return <Instagram size={14} className="text-accent" />;
      default:
        return <HelpCircle size={14} className="text-text-tertiary" />;
    }
  };

  // Helper: Response Status Badge Mapping
  const getResponseStatus = (resp: string) => {
    switch (resp) {
      case 'positive':
      case 'meeting_set':
        return 'won'; // Green badge
      case 'not_interested':
        return 'overdue'; // Red badge
      case 'no_response':
      default:
        return 'paused'; // Orange/Yellow badge
    }
  };

  const columns = [
    {
      key: 'date',
      header: 'Date',
      width: '12%',
      render: (val: unknown) => <span className="font-mono text-xs text-text-primary">{formatDate(String(val))}</span>,
    },
    {
      key: 'business_name',
      header: 'Business Name',
      width: '20%',
      render: (val: unknown) => <span className="font-semibold text-xs text-text-primary">{String(val || '-')}</span>,
    },
    { key: 'contact_name', header: 'Contact Name', width: '15%' },
    {
      key: 'channel',
      header: 'Channel',
      width: '10%',
      render: (val: unknown) => (
        <span className="flex items-center gap-1.5 capitalize text-xs">
          {getChannelIcon(String(val))}
          <span>{String(val || '')}</span>
        </span>
      ),
    },
    { key: 'phone', header: 'Phone', width: '12%' },
    { key: 'city', header: 'City', width: '10%' },
    {
      key: 'observation',
      header: 'Observation / Note',
      width: '25%',
      render: (val: unknown) => (
        <span className="truncate max-w-[200px] inline-block text-[11px] text-text-secondary/80 italic" title={String(val)}>
          {val ? `"${val}"` : '-'}
        </span>
      ),
    },
    {
      key: 'response',
      header: 'Response',
      width: '12%',
      render: (val: unknown) => (
        <StatusBadge status={getResponseStatus(String(val))} />
      ),
    },
    {
      key: 'follow_up',
      header: 'Follow Up',
      width: '12%',
      render: (val: unknown) =>
        val ? (
          <span className="font-mono text-xs text-error font-semibold">{formatDate(String(val))}</span>
        ) : (
          <span className="text-text-tertiary">-</span>
        ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* ━━━ DAILY TARGET COUNTER CARD ━━━ */}
      <div className={cn("p-4 rounded-[10px] border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 transition-colors", getTargetColors(messagesToday))}>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-current/5 rounded-full shrink-0">
            <Target size={20} className="stroke-[1.5]" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold tracking-wider opacity-60">
              Daily Outreach Target Status
            </div>
            <div className="text-base font-bold font-mono mt-0.5">
              Today: {messagesToday} messages sent
            </div>
          </div>
        </div>
        <div className="text-xs font-semibold px-3 py-1.5 rounded-full bg-current/5 border border-current/25 select-none shrink-0 text-center sm:text-left">
          Target: 10/day • {messagesToday >= 10 ? '✓ Target Met' : `Pending: ${10 - messagesToday}`}
        </div>
      </div>

      {/* Filters Strip */}
      <div className="flex items-center justify-between select-none">
        <div className="flex items-center gap-1.5 bg-bg-card-hover/20 border border-border/10 p-0.5 rounded">
          {(['week', 'month', 'all'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setFilterRange(r)}
              className={cn(
                "px-3 py-1 rounded text-[10px] font-semibold uppercase cursor-pointer transition-all",
                filterRange === r
                  ? "bg-primary text-text-primary"
                  : "text-text-secondary hover:text-text-primary"
              )}
            >
              {r === 'week' ? 'This Week' : r === 'month' ? 'This Month' : 'Show All'}
            </button>
          ))}
        </div>

        <Button
          onClick={() => setModalOpen(true)}
          size="sm"
          className="text-xs h-8 gap-1.5 cursor-pointer font-semibold"
        >
          <Plus size={13} />
          <span>Log Outreach</span>
        </Button>
      </div>

      {/* Logs Table */}
      <DataTable
        columns={columns}
        data={filteredLogs as unknown as Record<string, unknown>[]}
        emptyState={{
          icon: Search,
          title: 'No Outreach Logs Found',
          description: 'Log your daily outreach messages to track prospects and follow-ups.',
        }}
      />

      {/* ━━━ MODAL: LOG OUTREACH ━━━ */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-[550px] select-none">
          <DialogHeader>
            <DialogTitle>Log Outreach Event</DialogTitle>
            <DialogDescription>
              Enter the details of your cold outreach, target account observations, and responses.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 my-2 text-xs">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-text-secondary font-semibold">Outreach Date *</label>
                <Input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
                  className="h-10"
                />
              </div>

              <div className="space-y-1">
                <label className="text-text-secondary font-semibold">Outreach Channel</label>
                <select
                  value={form.channel}
                  onChange={(e) => setForm((p) => ({ ...p, channel: e.target.value }))}
                  className="flex h-10 w-full rounded-lg border border-border/30 bg-bg-card/50 backdrop-blur-[8px] px-3 py-2 text-sm text-text-primary outline-none hover:border-border/60 focus:border-primary/50 focus:bg-bg-card/70 focus:shadow-[0_0_16px_rgba(37,99,235,0.15)] transition-all duration-200"
                >
                  <option value="linkedin">LinkedIn DM</option>
                  <option value="whatsapp">Cold WhatsApp</option>
                  <option value="email">Cold Email</option>
                  <option value="instagram">Instagram DM</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-text-secondary font-semibold">Business Name *</label>
                <Input
                  type="text"
                  placeholder="e.g. Kanpur Bakery"
                  value={form.business_name}
                  onChange={(e) => setForm((p) => ({ ...p, business_name: e.target.value }))}
                  className="h-10"
                />
              </div>

              <div className="space-y-1">
                <label className="text-text-secondary font-semibold">Contact Name</label>
                <Input
                  type="text"
                  placeholder="e.g. Rahul Sharma"
                  value={form.contact_name}
                  onChange={(e) => setForm((p) => ({ ...p, contact_name: e.target.value }))}
                  className="h-10"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-text-secondary font-semibold">Phone / WhatsApp</label>
                <Input
                  type="text"
                  placeholder="e.g. +91 9999999999"
                  value={form.phone}
                  onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                  className="h-10"
                />
              </div>

              <div className="space-y-1">
                <label className="text-text-secondary font-semibold">City / Location</label>
                <Input
                  type="text"
                  placeholder="e.g. Kanpur"
                  value={form.city}
                  onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))}
                  className="h-10"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-text-secondary font-semibold">Observation / Icebreaker Note</label>
              <Textarea
                placeholder="What specific issue did you notice on their profile/site? (e.g. website not mobile friendly)"
                value={form.observation}
                onChange={(e) => setForm((p) => ({ ...p, observation: e.target.value }))}
                rows={2}
                className="resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-text-secondary font-semibold">Initial Response</label>
                <select
                  value={form.response}
                  onChange={(e) => setForm((p) => ({ ...p, response: e.target.value }))}
                  className="flex h-10 w-full rounded-lg border border-border/30 bg-bg-card/50 backdrop-blur-[8px] px-3 py-2 text-sm text-text-primary outline-none hover:border-border/60 focus:border-primary/50 focus:bg-bg-card/70 focus:shadow-[0_0_16px_rgba(37,99,235,0.15)] transition-all duration-200"
                >
                  <option value="no_response">No Response</option>
                  <option value="positive">Positive / Replied</option>
                  <option value="not_interested">Not Interested</option>
                  <option value="meeting_set">Discovery Meeting Set</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-text-secondary font-semibold">Follow Up Date</label>
                <Input
                  type="date"
                  value={form.follow_up}
                  onChange={(e) => setForm((p) => ({ ...p, follow_up: e.target.value }))}
                  className="h-10"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setModalOpen(false)}
              className="text-text-secondary hover:text-text-primary cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              onClick={handleLogOutreach}
              className="cursor-pointer"
            >
              Log Outreach
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
