/* eslint-disable */
'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createClient } from '@/lib/supabase/client';
import { Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Client, Profile } from '@/types';

interface NewContentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  clients: Client[];
}

export function NewContentModal({
  open,
  onOpenChange,
  onSuccess,
  clients
}: NewContentModalProps) {
  const supabase = createClient();
  const [employees, setEmployees] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [generatingBrief, setGeneratingBrief] = useState(false);

  // Form States
  const [clientId, setClientId] = useState('');
  const [keyword, setKeyword] = useState('');
  const [title, setTitle] = useState('');
  const [contentType, setContentType] = useState('blog');
  const [wordCountTarget, setWordCountTarget] = useState(1000);
  const [assignedTo, setAssignedTo] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [brief, setBrief] = useState('');

  useEffect(() => {
    async function loadEmployees() {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .in('role', ['employee', 'admin'])
        .eq('is_active', true);
      setEmployees(data || []);
    }

    if (open) {
      loadEmployees();
      // Reset form
      setClientId('');
      setKeyword('');
      setTitle('');
      setContentType('blog');
      setWordCountTarget(1000);
      setAssignedTo('');
      setDueDate('');
      setBrief('');
    }
  }, [open]);

  // Handle keyword changes to suggest title
  useEffect(() => {
    if (keyword && !title) {
      const suggested = `How to Leverage ${keyword.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')} for Growth`;
      setTitle(suggested);
    }
  }, [keyword]);

  const handleGenerateBrief = async () => {
    if (!keyword) {
      toast.error('Please enter a target keyword first');
      return;
    }

    const selectedClientObj = clients.find((c) => c.id === clientId);
    const clientName = selectedClientObj?.name || 'our target company';
    const industry = selectedClientObj?.industry || 'digital marketing';

    setGeneratingBrief(true);
    try {
      const response = await fetch('/api/content/generate-brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword, clientName, industry, contentType }),
      });

      if (!response.ok) throw new Error('Brief generation failed');
      const data = await response.json();
      setBrief(data.brief || '');
      toast.success('AI Brief Generated!');
    } catch (err: any) {
      console.error(err);
      toast.error('AI brief generation failed, using draft outline template instead.');
      // Fallback
      setBrief(`AI BRIEF OUTLINE FOR KEYWORD: "${keyword}"\n\n1. GOAL: Rank for keyword "${keyword}" in the ${industry} industry.\n2. AUDIENCE: Target demographics interested in ${contentType} content.\n3. STRUCTURE:\n   - Catchy Title introducing ${keyword}\n   - Body Section 1: Why "${keyword}" matters\n   - Body Section 2: Key steps/benefits\n   - Conclusion & CTA: Direct readers to ${clientName}.`);
    } finally {
      setGeneratingBrief(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId) {
      toast.error('Please select a client');
      return;
    }
    if (!keyword) {
      toast.error('Please enter a target keyword');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from('content_items').insert({
        client_id: clientId,
        keyword,
        title: title || keyword,
        content_type: contentType,
        word_count_target: wordCountTarget,
        assigned_to: assignedTo || null,
        due_date: dueDate || null,
        brief,
        status: 'idea',
      });

      if (error) throw error;

      toast.success('Content pipeline item created successfully!');
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to create content item');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] select-none max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-md font-bold text-text-primary">Add New Pipeline Content</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2 text-xs">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-text-secondary text-[11px] font-medium">Select Client *</Label>
              <Select value={clientId} onValueChange={(val) => setClientId(val || '')}>
                <SelectTrigger className="bg-bg-dark border-border/30 text-text-primary text-xs h-9">
                  <SelectValue placeholder="Select client" />
                </SelectTrigger>
                <SelectContent className="bg-bg-card border-border/30 text-text-primary">
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id} className="text-xs">
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-text-secondary text-[11px] font-medium">Target Keyword *</Label>
              <Input
                type="text"
                required
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="e.g. Kanpur SEO agency"
                className="bg-bg-dark border-border/30 text-text-primary text-xs h-9"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-text-secondary text-[11px] font-medium">Suggested Title</Label>
            <Input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Suggested post title"
              className="bg-bg-dark border-border/30 text-text-primary text-xs h-9"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-text-secondary text-[11px] font-medium">Content Type</Label>
              <Select value={contentType} onValueChange={(val) => setContentType(val || 'blog')}>
                <SelectTrigger className="bg-bg-dark border-border/30 text-text-primary text-xs h-9">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent className="bg-bg-card border-border/30 text-text-primary">
                  <SelectItem value="blog" className="text-xs">Blog Article</SelectItem>
                  <SelectItem value="landing_page" className="text-xs">Landing Page</SelectItem>
                  <SelectItem value="case_study" className="text-xs">Case Study</SelectItem>
                  <SelectItem value="email" className="text-xs">Email newsletter</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-text-secondary text-[11px] font-medium">Word Count Target</Label>
              <Input
                type="number"
                value={wordCountTarget}
                onChange={(e) => setWordCountTarget(Number(e.target.value))}
                className="bg-bg-dark border-border/30 text-text-primary text-xs h-9"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-text-secondary text-[11px] font-medium">Assignee (Intern)</Label>
              <Select value={assignedTo} onValueChange={(val) => setAssignedTo(val || '')}>
                <SelectTrigger className="bg-bg-dark border-border/30 text-text-primary text-xs h-9">
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent className="bg-bg-card border-border/30 text-text-primary">
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id} className="text-xs">
                      {emp.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-text-secondary text-[11px] font-medium">Due Date</Label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="bg-bg-dark border-border/30 text-text-primary text-xs h-9"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <Label className="text-text-secondary text-[11px] font-medium">Content Brief Outline</Label>
              <Button
                type="button"
                variant="ghost"
                onClick={handleGenerateBrief}
                disabled={generatingBrief}
                className="h-6 text-[10px] text-primary-light hover:text-text-primary hover:bg-primary/15 px-2 rounded flex items-center gap-1 font-bold border border-primary/20 bg-primary/5"
              >
                {generatingBrief ? (
                  <>
                    <Loader2 size={10} className="animate-spin" /> Drafting...
                  </>
                ) : (
                  <>
                    <Sparkles size={10} /> AI Generate Brief
                  </>
                )}
              </Button>
            </div>
            <Textarea
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
              placeholder="Outline target audience, key sections, reference links, and key points..."
              className="bg-bg-dark border-border/30 text-text-primary text-xs min-h-[140px]"
            />
          </div>

          <DialogFooter className="mt-4 pt-2 border-t border-border/30/30">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-border/30 hover:bg-bg-card-hover/20 text-text-secondary text-xs h-9"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-primary hover:bg-primary-light text-white text-xs h-9"
            >
              {loading ? 'Adding...' : 'Add to Pipeline'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
export default NewContentModal;
