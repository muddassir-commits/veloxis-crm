// components/seo/add-keyword-modal.tsx

import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
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
import { Input } from '@/components/ui/input';
import { Client } from '@/types';
import { Loader2 } from 'lucide-react';

interface AddKeywordModalProps {
  isOpen: boolean;
  onClose: () => void;
  clients: Client[];
  monthYear: string;
  onSuccess: () => void;
}

export function AddKeywordModal({
  isOpen,
  onClose,
  clients,
  monthYear,
  onSuccess,
}: AddKeywordModalProps) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState(() => clients[0]?.id || '');

  const [form, setForm] = useState({
    keyword: '',
    target_url: '',
    current_position: '',
    previous_position: '',
    best_position: '',
    search_volume: '',
    keyword_difficulty: '',
    intent: 'informational',
    notes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientId) {
      toast.error('Please select a client.');
      return;
    }
    if (!form.keyword.trim()) {
      toast.error('Keyword is required.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        client_id: selectedClientId,
        keyword: form.keyword.trim(),
        target_url: form.target_url.trim() || null,
        current_position: form.current_position ? Number(form.current_position) : null,
        previous_position: form.previous_position ? Number(form.previous_position) : null,
        best_position: form.best_position ? Number(form.best_position) : (form.current_position ? Number(form.current_position) : null),
        search_volume: form.search_volume ? Number(form.search_volume) : null,
        keyword_difficulty: form.keyword_difficulty ? Number(form.keyword_difficulty) : null,
        intent: form.intent,
        month_year: monthYear,
        source: 'manual',
        notes: form.notes || null,
      };

      const { error } = await supabase.from('seo_keywords').insert(payload);

      if (error) throw error;

      toast.success('Keyword added to tracking list.');
      // Reset form
      setForm({
        keyword: '',
        target_url: '',
        current_position: '',
        previous_position: '',
        best_position: '',
        search_volume: '',
        keyword_difficulty: '',
        intent: 'informational',
        notes: '',
      });
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to add keyword';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px] select-none max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base font-bold">Add Keyword Target</DialogTitle>
          <DialogDescription className="text-xs">
            Manually add a keyword target to track for {monthYear}.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 my-2 text-xs">
          {/* Client Select */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-text-secondary tracking-wider uppercase">Client *</label>
            <select
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              className="h-9 w-full min-w-0 rounded-lg border border-border/30 bg-bg-card/50 px-3 py-1 text-sm text-text-primary backdrop-blur-[8px] outline-none transition-all duration-200 focus:border-primary/50 focus:bg-bg-card/70 focus:shadow-[0_0_16px_rgba(37,99,235,0.15)]"
              required
            >
              {clients.map((c) => (
                <option key={c.id} value={c.id} className="bg-bg-card text-text-primary">
                  {c.name} {c.is_agency_self ? '(My Agency)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Keyword Target */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-text-secondary tracking-wider uppercase">Keyword Target *</label>
            <Input
              type="text"
              value={form.keyword}
              onChange={(e) => handleInputChange('keyword', e.target.value)}
              placeholder="e.g. digital marketing agency kanpur"
              className="h-9"
              required
            />
          </div>

          {/* Target URL */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-text-secondary tracking-wider uppercase">Target URL / Landing Page</label>
            <Input
              type="text"
              value={form.target_url}
              onChange={(e) => handleInputChange('target_url', e.target.value)}
              placeholder="e.g. veloxisglobal.com/services"
              className="h-9"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Current Position */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-text-secondary tracking-wider uppercase">Current Position</label>
              <Input
                type="number"
                value={form.current_position}
                onChange={(e) => handleInputChange('current_position', e.target.value)}
                placeholder="e.g. 15 (leave empty for unranked)"
                className="h-9"
              />
            </div>

            {/* Previous Position */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-text-secondary tracking-wider uppercase">Previous Position</label>
              <Input
                type="number"
                value={form.previous_position}
                onChange={(e) => handleInputChange('previous_position', e.target.value)}
                placeholder="e.g. 18"
                className="h-9"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {/* Volume */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-text-secondary tracking-wider uppercase">Search Volume</label>
              <Input
                type="number"
                value={form.search_volume}
                onChange={(e) => handleInputChange('search_volume', e.target.value)}
                placeholder="320"
                className="h-9"
              />
            </div>

            {/* Difficulty */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-text-secondary tracking-wider uppercase">Difficulty (KD)</label>
              <Input
                type="number"
                value={form.keyword_difficulty}
                onChange={(e) => handleInputChange('keyword_difficulty', e.target.value)}
                placeholder="22"
                className="h-9"
              />
            </div>

            {/* Intent */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-text-secondary tracking-wider uppercase">Search Intent</label>
              <select
                value={form.intent}
                onChange={(e) => handleInputChange('intent', e.target.value)}
                className="h-9 w-full min-w-0 rounded-lg border border-border/30 bg-bg-card/50 px-2.5 py-1 text-sm text-text-primary backdrop-blur-[8px] outline-none transition-all duration-200 focus:border-primary/50 focus:bg-bg-card/70 focus:shadow-[0_0_16px_rgba(37,99,235,0.15)]"
              >
                <option value="commercial" className="bg-bg-card text-text-primary">Commercial</option>
                <option value="transactional" className="bg-bg-card text-text-primary">Transactional</option>
                <option value="informational" className="bg-bg-card text-text-primary">Informational</option>
                <option value="navigational" className="bg-bg-card text-text-primary">Navigational</option>
              </select>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-text-secondary tracking-wider uppercase">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              placeholder="e.g. targeting local services map pack"
              rows={2}
              className="w-full bg-bg-card/50 border border-border/30 text-text-primary rounded p-2 resize-none hover:border-border/60 focus:border-primary/50 focus:shadow-[0_0_16px_rgba(37,99,235,0.15)] transition-all outline-none"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              className="cursor-pointer font-semibold"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              variant="default"
              className="cursor-pointer font-semibold"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin mr-1.5 h-3.5 w-3.5" />
                  <span>Adding...</span>
                </>
              ) : (
                <span>Add Keyword</span>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
