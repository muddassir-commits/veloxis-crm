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

interface NpsModalProps {
  open: boolean;
  onClose: () => void;
  clients: Client[];
  onSuccess: () => void;
}

export function NpsModal({ open, onClose, clients, onSuccess }: NpsModalProps) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    clientId: '',
    score: 10,
    feedback: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.clientId) {
      toast.error('Please select a client');
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // 1. Insert into nps_responses
      const { data: nps, error } = await supabase
        .from('nps_responses')
        .insert({
          client_id: form.clientId,
          score: Number(form.score),
          feedback: form.feedback || null,
          created_by: user.id,
        })
        .select('*')
        .single();

      if (error) throw error;

      const client = clients.find((c) => c.id === form.clientId);
      const clientName = client ? client.name : 'Client';

      // Update client's health score based on NPS.
      // E.g., Promoters (9-10) -> Health +10 (max 100).
      // Passives (7-8) -> No change.
      // Detractors (0-6) -> Health -20 (min 0).
      let healthScoreAdjustment = 0;
      if (form.score >= 9) healthScoreAdjustment = 10;
      else if (form.score <= 6) healthScoreAdjustment = -20;

      if (client && healthScoreAdjustment !== 0) {
        const newHealth = Math.min(100, Math.max(0, client.health_score + healthScoreAdjustment));
        await supabase
          .from('clients')
          .update({ health_score: newHealth })
          .eq('id', client.id);
      }

      // 2. Log activity
      await supabase.from('activity_log').insert({
        user_id: user.id,
        client_id: form.clientId,
        action: 'log_nps',
        entity_type: 'nps_responses',
        entity_id: nps.id,
        title: `⭐ NPS Response: ${form.score}/10 from ${clientName}`,
        description: form.feedback ? `Feedback: "${form.feedback}"` : 'No comments provided.',
      });

      // 3. Log audit trail
      await supabase.from('audit_logs').insert({
        user_id: user.id,
        action: 'INSERT',
        table_name: 'nps_responses',
        record_id: nps.id,
        new_values: nps,
      });

      toast.success('NPS feedback logged successfully!');
      setForm({
        clientId: '',
        score: 10,
        feedback: '',
      });
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to log NPS feedback';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="bg-[#0D1829] border border-[#1E3352] text-[#F0F4FF] max-w-md select-none">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold text-[#F0F4FF]">Record NPS Response</DialogTitle>
          <DialogDescription className="text-xs text-[#8BA3C7]">
            Log Net Promoter Score (NPS) gathered from recent calls or surveys.
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

          {/* Score Slider */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="label">NPS Score (0 - 10) *</label>
              <span className={`text-base font-bold font-mono px-2 py-0.5 rounded ${
                form.score >= 9 ? 'bg-[#22C55E]/10 text-[#22C55E]' :
                form.score >= 7 ? 'bg-[#F59E0B]/10 text-[#F59E0B]' : 'bg-[#EF4444]/10 text-[#EF4444]'
              }`}>
                {form.score}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="10"
              step="1"
              value={form.score}
              onChange={(e) => setForm((p) => ({ ...p, score: Number(e.target.value) }))}
              className="w-full h-1.5 bg-[#132035] rounded-lg appearance-none cursor-pointer accent-[#1B4FD8]"
            />
            <div className="flex justify-between text-[9px] text-[#4A6480] font-semibold px-0.5">
              <span>0 (Detractor)</span>
              <span>7 (Passive)</span>
              <span>10 (Promoter)</span>
            </div>
          </div>

          {/* Feedback */}
          <div className="space-y-1">
            <label className="label">Feedback Comments</label>
            <textarea
              value={form.feedback}
              onChange={(e) => setForm((p) => ({ ...p, feedback: e.target.value }))}
              rows={3}
              placeholder="What details or context did the client share?"
              className="input resize-none"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="bg-transparent border-[#1E3352] text-[#8BA3C7] hover:bg-[#132035] hover:text-[#F0F4FF] cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-[#1B4FD8] hover:bg-[#2563EB] text-white cursor-pointer"
            >
              {loading ? 'Logging...' : 'Log NPS Response'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
