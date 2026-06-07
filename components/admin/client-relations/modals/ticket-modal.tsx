'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Client, Profile, SupportTicket } from '@/types';
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

interface TicketModalProps {
  open: boolean;
  onClose: () => void;
  clients: Client[];
  team: Profile[];
  ticket: SupportTicket | null;
  onSuccess: () => void;
}

export function TicketModal({
  open,
  onClose,
  clients,
  team,
  ticket,
  onSuccess,
}: TicketModalProps) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    clientId: '',
    subject: '',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
    status: 'open' as 'open' | 'in_progress' | 'resolved',
    assignedTo: '',
    resolution: '',
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      if (ticket) {
        setForm((prev) => {
          if (
            prev.clientId === ticket.client_id &&
            prev.subject === ticket.subject &&
            prev.priority === ticket.priority &&
            prev.status === ticket.status &&
            prev.assignedTo === (ticket.assigned_to || '') &&
            prev.resolution === (ticket.resolution || '')
          ) {
            return prev;
          }
          return {
            clientId: ticket.client_id,
            subject: ticket.subject,
            priority: ticket.priority,
            status: ticket.status,
            assignedTo: ticket.assigned_to || '',
            resolution: ticket.resolution || '',
          };
        });
      } else {
        setForm((prev) => {
          if (
            prev.clientId === '' &&
            prev.subject === '' &&
            prev.priority === 'medium' &&
            prev.status === 'open' &&
            prev.assignedTo === '' &&
            prev.resolution === ''
          ) {
            return prev;
          }
          return {
            clientId: '',
            subject: '',
            priority: 'medium',
            status: 'open',
            assignedTo: '',
            resolution: '',
          };
        });
      }
    }, 0);

    return () => clearTimeout(timer);
  }, [ticket, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.clientId) {
      toast.error('Please select a client');
      return;
    }
    if (!form.subject.trim()) {
      toast.error('Please enter a subject');
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const client = clients.find((c) => c.id === form.clientId);
      const clientName = client ? client.name : 'Client';

      let resultTicket: SupportTicket;

      if (ticket) {
        // Edit flow
        const { data, error } = await supabase
          .from('support_tickets')
          .update({
            client_id: form.clientId,
            subject: form.subject,
            priority: form.priority,
            status: form.status,
            assigned_to: form.assignedTo || null,
            resolution: form.status === 'resolved' ? form.resolution : null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', ticket.id)
          .select('*')
          .single();

        if (error) throw error;
        resultTicket = data;

        // Log activity
        await supabase.from('activity_log').insert({
          user_id: user.id,
          client_id: form.clientId,
          action: 'update_ticket',
          entity_type: 'support_tickets',
          entity_id: ticket.id,
          title: `🎟️ Ticket updated: "${form.subject}"`,
          description: `Ticket status set to ${form.status} for ${clientName}.`,
        });

        // Audit log
        await supabase.from('audit_logs').insert({
          user_id: user.id,
          action: 'UPDATE',
          table_name: 'support_tickets',
          record_id: ticket.id,
          new_values: resultTicket,
          old_values: ticket,
        });

        toast.success('Support ticket updated!');
      } else {
        // Create flow
        const { data, error } = await supabase
          .from('support_tickets')
          .insert({
            client_id: form.clientId,
            subject: form.subject,
            priority: form.priority,
            status: form.status,
            assigned_to: form.assignedTo || null,
            resolution: form.status === 'resolved' ? form.resolution : null,
            created_by: user.id,
          })
          .select('*')
          .single();

        if (error) throw error;
        resultTicket = data;

        // Log activity
        await supabase.from('activity_log').insert({
          user_id: user.id,
          client_id: form.clientId,
          action: 'create_ticket',
          entity_type: 'support_tickets',
          entity_id: resultTicket.id,
          title: `🎟️ New Ticket raised for ${clientName}`,
          description: `Created ticket: "${form.subject}" with ${form.priority} priority.`,
        });

        // Audit log
        await supabase.from('audit_logs').insert({
          user_id: user.id,
          action: 'INSERT',
          table_name: 'support_tickets',
          record_id: resultTicket.id,
          new_values: resultTicket,
        });

        toast.success('Support ticket created!');
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save support ticket';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="bg-bg-card border border-border/30 text-text-primary max-w-md select-none">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold text-text-primary">
            {ticket ? 'Edit Support Ticket' : 'Raise Support Ticket'}
          </DialogTitle>
          <DialogDescription className="text-xs text-text-secondary">
            {ticket
              ? 'Update ticket progress, priority, assignee, or log a resolution.'
              : 'Create a support ticket to track client issues, bug reports, or service inquiries.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 my-2 text-xs">
          {/* Client Selection */}
          <div className="space-y-1">
            <label className="label">Select Client *</label>
            <select
              value={form.clientId}
              onChange={(e) => setForm((p) => ({ ...p, clientId: e.target.value }))}
              className="input h-9"
              required
              disabled={!!ticket} // Block editing client for existing tickets
            >
              <option value="">-- Choose Client --</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.is_agency_self ? '(My Agency)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Subject */}
          <div className="space-y-1">
            <label className="label">Subject / Issue Summary *</label>
            <input
              type="text"
              value={form.subject}
              onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))}
              placeholder="e.g. Meta Ads tracking pixel disconnected"
              className="input h-9"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Priority */}
            <div className="space-y-1">
              <label className="label">Priority *</label>
              <select
                value={form.priority}
                onChange={(e) => setForm((p) => ({ ...p, priority: e.target.value as 'low' | 'medium' | 'high' | 'urgent' }))}
                className="input h-9"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            {/* Status */}
            <div className="space-y-1">
              <label className="label">Status *</label>
              <select
                value={form.status}
                onChange={(e) => setForm((p) => ({ ...p, status: e.target.value as 'open' | 'in_progress' | 'resolved' }))}
                className="input h-9"
              >
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>
          </div>

          {/* Assigned To */}
          <div className="space-y-1">
            <label className="label">Assignee (Team Member)</label>
            <select
              value={form.assignedTo}
              onChange={(e) => setForm((p) => ({ ...p, assignedTo: e.target.value }))}
              className="input h-9"
            >
              <option value="">Unassigned</option>
              {team.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.full_name} ({t.role})
                </option>
              ))}
            </select>
          </div>

          {/* Resolution Notes (Visible when resolved) */}
          {form.status === 'resolved' && (
            <div className="space-y-1 animate-in fade-in slide-in-from-top-1 duration-200">
              <label className="label">Resolution Details *</label>
              <textarea
                value={form.resolution}
                onChange={(e) => setForm((p) => ({ ...p, resolution: e.target.value }))}
                rows={3}
                placeholder="Briefly describe how this issue was resolved."
                className="input resize-none"
                required={form.status === 'resolved'}
              />
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="bg-transparent border-border/30 text-text-secondary hover:bg-bg-card-hover/20 hover:text-text-primary cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-primary hover:bg-primary-light text-white cursor-pointer"
            >
              {loading ? 'Saving...' : ticket ? 'Save Changes' : 'Raise Ticket'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
