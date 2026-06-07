'use client';

import React, { useState, useEffect } from 'react';
import { Client } from '@/types';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface LogEmailCampaignModalProps {
  open: boolean;
  onClose: () => void;
  clients: Client[];
  onSuccess: () => void;
}

export function LogEmailCampaignModal({
  open,
  onClose,
  clients,
  onSuccess,
}: LogEmailCampaignModalProps) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    clientId: 'agency', // 'agency' indicates Veloxis own marketing
    name: '',
    subject: '',
    monthYear: '',
    campaignType: 'newsletter' as 'newsletter' | 'drip' | 'announcement' | 'promo',
    provider: 'resend',
    emailsSent: 0,
    delivered: 0,
    opened: 0,
    clicked: 0,
    unsubscribed: 0,
    bounced: 0,
    status: 'sent' as 'draft' | 'scheduled' | 'sent',
    resendEmailId: '',
    notes: '',
  });

  // Pre-fill monthYear with current month/year e.g. "Jun 2026"
  useEffect(() => {
    const timer = setTimeout(() => {
      if (open) {
        const date = new Date();
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const monthYearStr = `${months[date.getMonth()]} ${date.getFullYear()}`;
        setForm((prev) => ({
          ...prev,
          monthYear: monthYearStr,
        }));
      }
    }, 0);

    return () => clearTimeout(timer);
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('Please enter a campaign name');
      return;
    }
    if (!form.monthYear.trim()) {
      toast.error('Please enter month/year (e.g. Jun 2026)');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        client_id: form.clientId === 'agency' ? null : form.clientId,
        name: form.name,
        subject: form.subject || null,
        month_year: form.monthYear,
        campaign_type: form.campaignType,
        provider: form.provider,
        emails_sent: Number(form.emailsSent),
        delivered: Number(form.delivered),
        opened: Number(form.opened),
        clicked: Number(form.clicked),
        unsubscribed: Number(form.unsubscribed),
        bounced: Number(form.bounced),
        status: form.status,
        resend_email_id: form.resendEmailId || null,
        notes: form.notes || null,
      };

      const res = await fetch('/api/admin/agency/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'email', payload }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to log email campaign');
      }

      toast.success('Email campaign logged successfully!');
      onSuccess();
      onClose();

      // Reset form (except client and month)
      setForm((prev) => ({
        ...prev,
        name: '',
        subject: '',
        emailsSent: 0,
        delivered: 0,
        opened: 0,
        clicked: 0,
        unsubscribed: 0,
        bounced: 0,
        resendEmailId: '',
        notes: '',
      }));
    } catch (err: unknown) {
      console.error(err);
      const message = err instanceof Error ? err.message : 'Server error';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[600px] select-none max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-text-primary">Log Email Campaign</DialogTitle>
          <DialogDescription className="text-xs text-text-secondary">
            Record details and performance metrics for email campaigns.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2 text-xs">
          <div className="grid grid-cols-2 gap-4">
            {/* Target Client */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-text-secondary">Owner/Client</label>
              <select
                className="w-full bg-bg-dark border border-border/30 rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-primary/50 focus:bg-bg-card/70 transition-all duration-200"
                value={form.clientId}
                onChange={(e) => setForm((prev) => ({ ...prev, clientId: e.target.value }))}
                disabled={loading}
              >
                <option value="agency" className="bg-bg-card">Veloxis Global (Own Agency)</option>
                {clients.filter(c => !c.is_agency_self).map((c) => (
                  <option key={c.id} value={c.id} className="bg-bg-card">
                    {c.name} ({c.company})
                  </option>
                ))}
              </select>
            </div>

            {/* Month/Year */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-text-secondary">Month & Year</label>
              <input
                type="text"
                placeholder="e.g. Jun 2026"
                className="w-full bg-bg-dark border border-border/30 rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-primary/50 focus:bg-bg-card/70 transition-all duration-200 placeholder:text-text-tertiary"
                value={form.monthYear}
                onChange={(e) => setForm((prev) => ({ ...prev, monthYear: e.target.value }))}
                disabled={loading}
                required
              />
            </div>

            {/* Campaign Name */}
            <div className="col-span-2 space-y-1">
              <label className="text-xs font-semibold text-text-secondary">Campaign Name</label>
              <input
                type="text"
                placeholder="e.g. Summer Retainer Update, Monthly Newsletter"
                className="w-full bg-bg-dark border border-border/30 rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-primary/50 focus:bg-bg-card/70 transition-all duration-200 placeholder:text-text-tertiary"
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                disabled={loading}
                required
              />
            </div>

            {/* Subject */}
            <div className="col-span-2 space-y-1">
              <label className="text-xs font-semibold text-text-secondary">Subject Line</label>
              <input
                type="text"
                placeholder="e.g. Important updates for your agency service"
                className="w-full bg-bg-dark border border-border/30 rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-primary/50 focus:bg-bg-card/70 transition-all duration-200 placeholder:text-text-tertiary"
                value={form.subject}
                onChange={(e) => setForm((prev) => ({ ...prev, subject: e.target.value }))}
                disabled={loading}
              />
            </div>

            {/* Campaign Type */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-text-secondary">Campaign Type</label>
              <select
                className="w-full bg-bg-dark border border-border/30 rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-primary/50 focus:bg-bg-card/70 transition-all duration-200"
                value={form.campaignType}
                onChange={(e) => setForm((prev) => ({ ...prev, campaignType: e.target.value as 'newsletter' | 'drip' | 'announcement' | 'promo' }))}
                disabled={loading}
              >
                <option value="newsletter" className="bg-bg-card">Newsletter</option>
                <option value="drip" className="bg-bg-card">Drip Campaign</option>
                <option value="announcement" className="bg-bg-card">Announcement</option>
                <option value="promo" className="bg-bg-card">Promo Offer</option>
              </select>
            </div>

            {/* Status */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-text-secondary">Status</label>
              <select
                className="w-full bg-bg-dark border border-border/30 rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-primary/50 focus:bg-bg-card/70 transition-all duration-200"
                value={form.status}
                onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value as 'draft' | 'scheduled' | 'sent' }))}
                disabled={loading}
              >
                <option value="sent" className="bg-bg-card">Sent</option>
                <option value="scheduled" className="bg-bg-card">Scheduled</option>
                <option value="draft" className="bg-bg-card">Draft</option>
              </select>
            </div>

            {/* Provider */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-text-secondary">Provider</label>
              <input
                type="text"
                className="w-full bg-bg-dark border border-border/30 rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-primary/50 focus:bg-bg-card/70 transition-all duration-200 placeholder:text-text-tertiary"
                value={form.provider}
                onChange={(e) => setForm((prev) => ({ ...prev, provider: e.target.value }))}
                disabled={loading}
              />
            </div>

            {/* Resend Email ID */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-text-secondary">Resend Email ID (Optional)</label>
              <input
                type="text"
                placeholder="e.g. email_xxx_yyy"
                className="w-full bg-bg-dark border border-border/30 rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-primary/50 focus:bg-bg-card/70 transition-all duration-200 placeholder:text-text-tertiary font-mono text-xs"
                value={form.resendEmailId}
                onChange={(e) => setForm((prev) => ({ ...prev, resendEmailId: e.target.value }))}
                disabled={loading}
              />
            </div>
          </div>

          <div className="border-t border-border/30 my-4 pt-4">
            <h4 className="text-sm font-semibold text-text-secondary mb-3">Metrics (Recipient Counts)</h4>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-text-secondary">Emails Sent</label>
                <input
                  type="number"
                  min="0"
                  className="w-full bg-bg-dark border border-border/30 rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-primary/50 focus:bg-bg-card/70 transition-all duration-200"
                  value={form.emailsSent}
                  onChange={(e) => setForm((prev) => ({ ...prev, emailsSent: Math.max(0, parseInt(e.target.value) || 0) }))}
                  disabled={loading}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-text-secondary">Delivered</label>
                <input
                  type="number"
                  min="0"
                  className="w-full bg-bg-dark border border-border/30 rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-primary/50 focus:bg-bg-card/70 transition-all duration-200"
                  value={form.delivered}
                  onChange={(e) => setForm((prev) => ({ ...prev, delivered: Math.max(0, parseInt(e.target.value) || 0) }))}
                  disabled={loading}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-text-secondary">Opened</label>
                <input
                  type="number"
                  min="0"
                  className="w-full bg-bg-dark border border-border/30 rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-primary/50 focus:bg-bg-card/70 transition-all duration-200"
                  value={form.opened}
                  onChange={(e) => setForm((prev) => ({ ...prev, opened: Math.max(0, parseInt(e.target.value) || 0) }))}
                  disabled={loading}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-text-secondary">Clicked</label>
                <input
                  type="number"
                  min="0"
                  className="w-full bg-bg-dark border border-border/30 rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-primary/50 focus:bg-bg-card/70 transition-all duration-200"
                  value={form.clicked}
                  onChange={(e) => setForm((prev) => ({ ...prev, clicked: Math.max(0, parseInt(e.target.value) || 0) }))}
                  disabled={loading}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-text-secondary">Unsubscribed</label>
                <input
                  type="number"
                  min="0"
                  className="w-full bg-bg-dark border border-border/30 rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-primary/50 focus:bg-bg-card/70 transition-all duration-200"
                  value={form.unsubscribed}
                  onChange={(e) => setForm((prev) => ({ ...prev, unsubscribed: Math.max(0, parseInt(e.target.value) || 0) }))}
                  disabled={loading}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-text-secondary">Bounced</label>
                <input
                  type="number"
                  min="0"
                  className="w-full bg-bg-dark border border-border/30 rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-primary/50 focus:bg-bg-card/70 transition-all duration-200"
                  value={form.bounced}
                  onChange={(e) => setForm((prev) => ({ ...prev, bounced: Math.max(0, parseInt(e.target.value) || 0) }))}
                  disabled={loading}
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-text-secondary">Campaign Notes</label>
            <textarea
              placeholder="Record any target segments, links used, or remarks..."
              rows={3}
              className="w-full bg-bg-dark border border-border/30 rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-primary/50 focus:bg-bg-card/70 transition-all duration-200 placeholder:text-text-tertiary"
              value={form.notes}
              onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
              disabled={loading}
            />
          </div>

          <DialogFooter className="pt-4 border-t border-border/30">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="border-border/30 text-text-secondary hover:bg-bg-card-hover/20 hover:text-text-primary"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-primary hover:bg-primary-light text-white font-semibold"
            >
              {loading ? 'Logging...' : 'Log Campaign'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
