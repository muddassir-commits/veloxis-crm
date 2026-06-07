'use client';

import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
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

interface LogCommunicationModalProps {
  open: boolean;
  onClose: () => void;
  clients: Client[];
  onSuccess: () => void;
}

export function LogCommunicationModal({
  open,
  onClose,
  clients,
  onSuccess,
}: LogCommunicationModalProps) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    clientId: '',
    type: 'call' as 'call' | 'whatsapp' | 'email' | 'note',
    direction: 'outbound' as 'inbound' | 'outbound',
    body: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.clientId) {
      toast.error('Please select a client');
      return;
    }
    if (!form.body.trim()) {
      toast.error('Please enter the communication details');
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // 1. Insert into client_communications
      const { data: comm, error } = await supabase
        .from('client_communications')
        .insert({
          client_id: form.clientId,
          type: form.type,
          direction: form.direction,
          body: form.body,
          created_by: user.id,
        })
        .select('*')
        .single();

      if (error) throw error;

      // Fetch client name for logs
      const client = clients.find((c) => c.id === form.clientId);
      const clientName = client ? client.name : 'Client';

      // 2. Log activity
      await supabase.from('activity_log').insert({
        user_id: user.id,
        client_id: form.clientId,
        action: 'log_communication',
        entity_type: 'client_communications',
        entity_id: comm.id,
        title: `📞 Communication logged for ${clientName}`,
        description: `Logged a ${form.direction} ${form.type} communication.`,
      });

      // 3. Log audit trail
      await supabase.from('audit_logs').insert({
        user_id: user.id,
        action: 'INSERT',
        table_name: 'client_communications',
        record_id: comm.id,
        new_values: comm,
      });

      toast.success('Communication logged successfully!');
      setForm({
        clientId: '',
        type: 'call',
        direction: 'outbound',
        body: '',
      });
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to log communication';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="bg-bg-card border border-border/30 text-text-primary max-w-md select-none">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold text-text-primary">Log Client Communication</DialogTitle>
          <DialogDescription className="text-xs text-text-secondary">
            Record details of a call, email, WhatsApp chat, or meeting note with this client.
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
            >
              <option value="">-- Choose Client --</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.is_agency_self ? '(My Agency)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Type */}
            <div className="space-y-1">
              <label className="label">Communication Channel *</label>
              <select
                value={form.type}
                onChange={(e) => setForm((p) => ({ ...p, type: e.target.value as 'call' | 'whatsapp' | 'email' | 'note' }))}
                className="input h-9"
              >
                <option value="call">Phone Call</option>
                <option value="whatsapp">WhatsApp Message</option>
                <option value="email">Email</option>
                <option value="note">Meeting / General Note</option>
              </select>
            </div>

            {/* Direction */}
            <div className="space-y-1">
              <label className="label">Direction *</label>
              <select
                value={form.direction}
                onChange={(e) => setForm((p) => ({ ...p, direction: e.target.value as 'inbound' | 'outbound' }))}
                className="input h-9"
              >
                <option value="outbound">Outbound (Agency → Client)</option>
                <option value="inbound">Inbound (Client → Agency)</option>
              </select>
            </div>
          </div>

          {/* Body */}
          <div className="space-y-1">
            <label className="label">Communication Details *</label>
            <textarea
              value={form.body}
              onChange={(e) => setForm((p) => ({ ...p, body: e.target.value }))}
              rows={4}
              placeholder="What was discussed or noted during this interaction?"
              className="input resize-none"
              required
            />
          </div>

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
              {loading ? 'Logging...' : 'Log Communication'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
