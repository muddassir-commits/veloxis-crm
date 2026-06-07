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

interface LogWhatsAppCampaignModalProps {
  open: boolean;
  onClose: () => void;
  clients: Client[];
  onSuccess: () => void;
}

export function LogWhatsAppCampaignModal({
  open,
  onClose,
  clients,
  onSuccess,
}: LogWhatsAppCampaignModalProps) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    clientId: 'agency', // 'agency' indicates Veloxis own marketing
    name: '',
    monthYear: '',
    campaignType: 'broadcast' as 'broadcast' | 'sequence' | 'chatbot',
    templateName: '',
    messagesSent: 0,
    delivered: 0,
    readCount: 0,
    replied: 0,
    status: 'active' as 'active' | 'completed' | 'paused',
    notes: '',
  });

  // Pre-fill monthYear with current month/year
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
        month_year: form.monthYear,
        campaign_type: form.campaignType,
        template_name: form.templateName || null,
        messages_sent: Number(form.messagesSent),
        delivered: Number(form.delivered),
        read_count: Number(form.readCount),
        replied: Number(form.replied),
        status: form.status,
        notes: form.notes || null,
      };

      const res = await fetch('/api/admin/agency/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'whatsapp', payload }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to log WhatsApp campaign');
      }

      toast.success('WhatsApp campaign logged successfully!');
      onSuccess();
      onClose();

      // Reset form (except client and month)
      setForm((prev) => ({
        ...prev,
        name: '',
        templateName: '',
        messagesSent: 0,
        delivered: 0,
        readCount: 0,
        replied: 0,
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
          <DialogTitle className="text-lg font-bold text-text-primary">Log WhatsApp Campaign</DialogTitle>
          <DialogDescription className="text-xs text-text-secondary">
            Record details and performance metrics for WhatsApp campaigns.
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
                placeholder="e.g. Broadcast Promo Alerts, Payment Reminders Sequence"
                className="w-full bg-bg-dark border border-border/30 rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-primary/50 focus:bg-bg-card/70 transition-all duration-200 placeholder:text-text-tertiary"
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                disabled={loading}
                required
              />
            </div>

            {/* Template Name */}
            <div className="col-span-2 space-y-1">
              <label className="text-xs font-semibold text-text-secondary">WhatsApp Template Name (Optional)</label>
              <input
                type="text"
                placeholder="e.g. payment_reminder_v1, promo_broadcast"
                className="w-full bg-bg-dark border border-border/30 rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-primary/50 focus:bg-bg-card/70 transition-all duration-200 placeholder:text-text-tertiary"
                value={form.templateName}
                onChange={(e) => setForm((prev) => ({ ...prev, templateName: e.target.value }))}
                disabled={loading}
              />
            </div>

            {/* Campaign Type */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-text-secondary">Campaign Type</label>
              <select
                className="w-full bg-bg-dark border border-border/30 rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-primary/50 focus:bg-bg-card/70 transition-all duration-200"
                value={form.campaignType}
                onChange={(e) => setForm((prev) => ({ ...prev, campaignType: e.target.value as 'broadcast' | 'sequence' | 'chatbot' }))}
                disabled={loading}
              >
                <option value="broadcast" className="bg-bg-card">Broadcast</option>
                <option value="sequence" className="bg-bg-card">Sequence</option>
                <option value="chatbot" className="bg-bg-card">Chatbot Auto</option>
              </select>
            </div>

            {/* Status */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-text-secondary">Status</label>
              <select
                className="w-full bg-bg-dark border border-border/30 rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-primary/50 focus:bg-bg-card/70 transition-all duration-200"
                value={form.status}
                onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value as 'active' | 'completed' | 'paused' }))}
                disabled={loading}
              >
                <option value="active" className="bg-bg-card">Active</option>
                <option value="completed" className="bg-bg-card">Completed</option>
                <option value="paused" className="bg-bg-card">Paused</option>
              </select>
            </div>
          </div>

          <div className="border-t border-border/30 my-4 pt-4">
            <h4 className="text-sm font-semibold text-text-secondary mb-3">Metrics (Message Counts)</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-text-secondary">Messages Sent</label>
                <input
                  type="number"
                  min="0"
                  className="w-full bg-bg-dark border border-border/30 rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-primary/50 focus:bg-bg-card/70 transition-all duration-200"
                  value={form.messagesSent}
                  onChange={(e) => setForm((prev) => ({ ...prev, messagesSent: Math.max(0, parseInt(e.target.value) || 0) }))}
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
                <label className="text-xs font-semibold text-text-secondary">Read Count</label>
                <input
                  type="number"
                  min="0"
                  className="w-full bg-bg-dark border border-border/30 rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-primary/50 focus:bg-bg-card/70 transition-all duration-200"
                  value={form.readCount}
                  onChange={(e) => setForm((prev) => ({ ...prev, readCount: Math.max(0, parseInt(e.target.value) || 0) }))}
                  disabled={loading}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-text-secondary">Replied</label>
                <input
                  type="number"
                  min="0"
                  className="w-full bg-bg-dark border border-border/30 rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-primary/50 focus:bg-bg-card/70 transition-all duration-200"
                  value={form.replied}
                  onChange={(e) => setForm((prev) => ({ ...prev, replied: Math.max(0, parseInt(e.target.value) || 0) }))}
                  disabled={loading}
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-text-secondary">Campaign Notes</label>
            <textarea
              placeholder="Record any target segments, link CTR, or remarks..."
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
