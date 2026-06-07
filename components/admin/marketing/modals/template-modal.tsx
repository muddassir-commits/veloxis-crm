'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { MessageTemplate } from '@/types';
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

interface TemplateModalProps {
  open: boolean;
  onClose: () => void;
  template: MessageTemplate | null;
  onSuccess: () => void;
}

export function TemplateModal({
  open,
  onClose,
  template,
  onSuccess,
}: TemplateModalProps) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '',
    type: 'email' as 'email' | 'whatsapp',
    subject: '',
    body: '',
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      if (template) {
        setForm({
          name: template.name,
          type: template.type,
          subject: template.subject || '',
          body: template.body,
        });
      } else {
        setForm({
          name: '',
          type: 'email',
          subject: '',
          body: '',
        });
      }
    }, 0);

    return () => clearTimeout(timer);
  }, [template, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('Please enter a template name');
      return;
    }
    if (!form.body.trim()) {
      toast.error('Please enter the template body');
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      let resultTemplate: MessageTemplate;

      if (template) {
        // Edit template
        const { data, error } = await supabase
          .from('message_templates')
          .update({
            name: form.name,
            type: form.type,
            subject: form.type === 'email' ? form.subject || null : null,
            body: form.body,
            updated_at: new Date().toISOString(),
          })
          .eq('id', template.id)
          .select('*')
          .single();

        if (error) throw error;
        resultTemplate = data;

        // Log activity
        await supabase.from('activity_log').insert({
          user_id: user.id,
          action: 'update_template',
          entity_type: 'message_templates',
          entity_id: template.id,
          title: `📝 Template updated: "${form.name}"`,
          description: `Marketing template for ${form.type} was edited.`,
        });

        // Audit log
        await supabase.from('audit_logs').insert({
          user_id: user.id,
          action: 'UPDATE',
          table_name: 'message_templates',
          record_id: template.id,
          new_values: resultTemplate,
          old_values: template,
        });

        toast.success('Template updated successfully!');
      } else {
        // Create template
        const { data, error } = await supabase
          .from('message_templates')
          .insert({
            name: form.name,
            type: form.type,
            subject: form.type === 'email' ? form.subject || null : null,
            body: form.body,
            created_by: user.id,
          })
          .select('*')
          .single();

        if (error) throw error;
        resultTemplate = data;

        // Log activity
        await supabase.from('activity_log').insert({
          user_id: user.id,
          action: 'create_template',
          entity_type: 'message_templates',
          entity_id: resultTemplate.id,
          title: `📝 Template created: "${form.name}"`,
          description: `New marketing template created for ${form.type}.`,
        });

        // Audit log
        await supabase.from('audit_logs').insert({
          user_id: user.id,
          action: 'INSERT',
          table_name: 'message_templates',
          record_id: resultTemplate.id,
          new_values: resultTemplate,
        });

        toast.success('Template created successfully!');
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      console.error('Failed to save template:', err);
      const message = err instanceof Error ? err.message : 'Failed to save template';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[550px] select-none">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-text-primary">
            {template ? 'Edit Template' : 'Create Template'}
          </DialogTitle>
          <DialogDescription className="text-xs text-text-secondary">
            Define reusable templates for email or WhatsApp campaigns.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2 text-xs">
          {/* Template Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-text-secondary">Template Name</label>
            <input
              type="text"
              placeholder="e.g. June Newsletter, Client Onboarding Sequence"
              className="w-full bg-bg-dark border border-border/30 rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-primary/50 focus:bg-bg-card/70 transition-all duration-200 placeholder:text-text-tertiary"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              disabled={loading}
              required
            />
          </div>

          {/* Template Type */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-text-secondary">Template Type</label>
            <select
              className="w-full bg-bg-dark border border-border/30 rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-primary/50 focus:bg-bg-card/70 transition-all duration-200"
              value={form.type}
              onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value as 'email' | 'whatsapp' }))}
              disabled={loading}
            >
              <option value="email" className="bg-bg-card">Email Template</option>
              <option value="whatsapp" className="bg-bg-card">WhatsApp Template</option>
            </select>
          </div>

          {/* Email Subject */}
          {form.type === 'email' && (
            <div className="space-y-1.5 animate-fadeIn">
              <label className="text-xs font-semibold text-text-secondary">Subject Line</label>
              <input
                type="text"
                placeholder="e.g. Discover your new dashboard!"
                className="w-full bg-bg-dark border border-border/30 rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-primary/50 focus:bg-bg-card/70 transition-all duration-200 placeholder:text-text-tertiary"
                value={form.subject}
                onChange={(e) => setForm((prev) => ({ ...prev, subject: e.target.value }))}
                disabled={loading}
              />
            </div>
          )}

          {/* Template Body */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-text-secondary">Template Body</label>
            <textarea
              placeholder={
                form.type === 'email'
                  ? 'Write your HTML or plain text email body template here...'
                  : 'Write your WhatsApp message template here. Use {{1}}, {{2}} for dynamic parameters...'
              }
              rows={6}
              className="w-full bg-bg-dark border border-border/30 rounded-md px-3 py-2 text-text-primary focus:outline-none focus:border-primary/50 focus:bg-bg-card/70 transition-all duration-200 placeholder:text-text-tertiary font-mono text-xs"
              value={form.body}
              onChange={(e) => setForm((prev) => ({ ...prev, body: e.target.value }))}
              disabled={loading}
              required
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
              {loading ? 'Saving...' : 'Save Template'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
