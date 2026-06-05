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
      <DialogContent className="sm:max-w-[550px] bg-[#0D1829] text-white border border-[#1E3352]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-white">
            {template ? 'Edit Template' : 'Create Template'}
          </DialogTitle>
          <DialogDescription className="text-sm text-[#8BA3C7]">
            Define reusable templates for email or WhatsApp campaigns.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Template Name */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#8BA3C7]">Template Name</label>
            <input
              type="text"
              placeholder="e.g. June Newsletter, Client Onboarding Sequence"
              className="w-full bg-[#132237] border border-[#1E3352] rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder-[#4B5E7D]"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              disabled={loading}
              required
            />
          </div>

          {/* Template Type */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#8BA3C7]">Template Type</label>
            <select
              className="w-full bg-[#132237] border border-[#1E3352] rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              value={form.type}
              onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value as 'email' | 'whatsapp' }))}
              disabled={loading}
            >
              <option value="email">Email Template</option>
              <option value="whatsapp">WhatsApp Template</option>
            </select>
          </div>

          {/* Email Subject */}
          {form.type === 'email' && (
            <div className="space-y-1 animate-fadeIn">
              <label className="text-xs font-semibold text-[#8BA3C7]">Subject Line</label>
              <input
                type="text"
                placeholder="e.g. Discover your new dashboard!"
                className="w-full bg-[#132237] border border-[#1E3352] rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder-[#4B5E7D]"
                value={form.subject}
                onChange={(e) => setForm((prev) => ({ ...prev, subject: e.target.value }))}
                disabled={loading}
              />
            </div>
          )}

          {/* Template Body */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#8BA3C7]">Template Body</label>
            <textarea
              placeholder={
                form.type === 'email'
                  ? 'Write your HTML or plain text email body template here...'
                  : 'Write your WhatsApp message template here. Use {{1}}, {{2}} for dynamic parameters...'
              }
              rows={6}
              className="w-full bg-[#132237] border border-[#1E3352] rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder-[#4B5E7D] font-mono text-xs"
              value={form.body}
              onChange={(e) => setForm((prev) => ({ ...prev, body: e.target.value }))}
              disabled={loading}
              required
            />
          </div>

          <DialogFooter className="pt-4 border-t border-[#1E3352]">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="border-[#1E3352] text-[#8BA3C7] hover:bg-[#132237] hover:text-white"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-500 text-white"
            >
              {loading ? 'Saving...' : 'Save Template'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
