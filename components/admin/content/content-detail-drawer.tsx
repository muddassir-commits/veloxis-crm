/* eslint-disable */
'use client';

import React, { useState, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { createClient } from '@/lib/supabase/client';
import { Sparkles, Loader2, ExternalLink, Trash2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { ContentItem, Client, Profile } from '@/types';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';

interface ContentDetailDrawerProps {
  item: ContentItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  clients: Client[];
  employees: Profile[];
}

export function ContentDetailDrawer({
  item,
  open,
  onOpenChange,
  onSuccess,
  clients,
  employees,
}: ContentDetailDrawerProps) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [generatingBrief, setGeneratingBrief] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Form States
  const [clientId, setClientId] = useState('');
  const [keyword, setKeyword] = useState('');
  const [title, setTitle] = useState('');
  const [contentType, setContentType] = useState('blog');
  const [wordCountTarget, setWordCountTarget] = useState(1000);
  const [wordCountCurrent, setWordCountCurrent] = useState(0);
  const [assignedTo, setAssignedTo] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [brief, setBrief] = useState('');
  const [draftUrl, setDraftUrl] = useState('');
  const [status, setStatus] = useState<'idea' | 'brief' | 'writing' | 'review' | 'published'>('idea');

  // Load values when item changes
  useEffect(() => {
    if (item) {
      setClientId(item.client_id || '');
      setKeyword(item.keyword || '');
      setTitle(item.title || '');
      setContentType(item.content_type || 'blog');
      setWordCountTarget(item.word_count_target || 1000);
      setWordCountCurrent(item.word_count_current || 0);
      setAssignedTo(item.assigned_to || 'unassigned');
      setDueDate(item.due_date || '');
      setBrief(item.brief || '');
      setDraftUrl(item.draft_url || '');
      setStatus(item.status || 'idea');
    }
  }, [item, open]);

  const handleGenerateBrief = async () => {
    if (!keyword) {
      toast.error('Keyword is required to generate brief');
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
      toast.success('AI Brief regenerated!');
    } catch (err: any) {
      console.error(err);
      toast.error('AI brief generation failed, using draft outline template instead.');
      // Fallback
      setBrief(`AI BRIEF OUTLINE FOR KEYWORD: "${keyword}"\n\n1. GOAL: Rank for keyword "${keyword}" in the ${industry} industry.\n2. AUDIENCE: Target demographics interested in ${contentType} content.\n3. STRUCTURE:\n   - Catchy Title introducing ${keyword}\n   - Body Section 1: Why "${keyword}" matters\n   - Body Section 2: Key steps/benefits\n   - Conclusion & CTA: Direct readers to ${clientName}.`);
    } finally {
      setGeneratingBrief(false);
    }
  };

  const handleSave = async () => {
    if (!item) return;

    if (!keyword) {
      toast.error('Keyword is required');
      return;
    }

    setLoading(true);
    try {
      const updateData = {
        client_id: clientId,
        keyword,
        title: title || keyword,
        content_type: contentType,
        word_count_target: wordCountTarget,
        word_count_current: wordCountCurrent,
        assigned_to: assignedTo === 'unassigned' ? null : assignedTo,
        due_date: dueDate || null,
        brief,
        draft_url: draftUrl || null,
        status,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('content_items')
        .update(updateData)
        .eq('id', item.id);

      if (error) throw error;

      toast.success('Content item updated successfully!');
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to update content item');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!item) return;

    try {
      const { error } = await supabase
        .from('content_items')
        .delete()
        .eq('id', item.id);

      if (error) throw error;

      toast.success('Content item deleted successfully');
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to delete content item');
    }
  };

  const clientName = clients.find((c) => c.id === clientId)?.name || 'Client';

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="bg-[#0D1829] border-l border-[#1E3352] text-[#F0F4FF] sm:max-w-md md:max-w-lg w-full flex flex-col p-0 overflow-hidden select-none">
          <SheetHeader className="p-4 border-b border-[#1E3352]/40 bg-[#060D1A]">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-[#4D90FE] uppercase tracking-wider">
                  {clientName}
                </span>
                <SheetTitle className="text-sm font-bold text-[#F0F4FF] line-clamp-1 mt-0.5">
                  Content Details
                </SheetTitle>
              </div>
            </div>
          </SheetHeader>

          {/* Form scroll area */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs scrollbar-thin scrollbar-thumb-[#1E3352] scrollbar-track-transparent">
            {/* Target Keyword & Title */}
            <div className="space-y-1.5">
              <Label className="text-[#8BA3C7] text-[11px] font-medium">Target Keyword *</Label>
              <Input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className="bg-[#060D1A] border-[#1E3352] text-[#F0F4FF] text-xs h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[#8BA3C7] text-[11px] font-medium">Suggested Title</Label>
              <Input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="bg-[#060D1A] border-[#1E3352] text-[#F0F4FF] text-xs h-9"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Status */}
              <div className="space-y-1.5">
                <Label className="text-[#8BA3C7] text-[11px] font-medium">Status</Label>
                <Select
                  value={status}
                  onValueChange={(val: any) => setStatus(val)}
                >
                  <SelectTrigger className="bg-[#060D1A] border-[#1E3352] text-[#F0F4FF] text-xs h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0D1829] border-[#1E3352] text-[#F0F4FF]">
                    <SelectItem value="idea" className="text-xs">Idea</SelectItem>
                    <SelectItem value="brief" className="text-xs">Brief</SelectItem>
                    <SelectItem value="writing" className="text-xs">Writing</SelectItem>
                    <SelectItem value="review" className="text-xs">Review</SelectItem>
                    <SelectItem value="published" className="text-xs">Published</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Content Type */}
              <div className="space-y-1.5">
                <Label className="text-[#8BA3C7] text-[11px] font-medium">Content Type</Label>
                <Select value={contentType} onValueChange={(val) => setContentType(val || 'blog')}>
                  <SelectTrigger className="bg-[#060D1A] border-[#1E3352] text-[#F0F4FF] text-xs h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0D1829] border-[#1E3352] text-[#F0F4FF]">
                    <SelectItem value="blog" className="text-xs">Blog Article</SelectItem>
                    <SelectItem value="landing_page" className="text-xs">Landing Page</SelectItem>
                    <SelectItem value="case_study" className="text-xs">Case Study</SelectItem>
                    <SelectItem value="email" className="text-xs">Email newsletter</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Word Target */}
              <div className="space-y-1.5">
                <Label className="text-[#8BA3C7] text-[11px] font-medium">Word Target</Label>
                <Input
                  type="number"
                  value={wordCountTarget}
                  onChange={(e) => setWordCountTarget(Number(e.target.value))}
                  className="bg-[#060D1A] border-[#1E3352] text-[#F0F4FF] text-xs h-9"
                />
              </div>

              {/* Word Current */}
              <div className="space-y-1.5">
                <Label className="text-[#8BA3C7] text-[11px] font-medium">Current Words</Label>
                <Input
                  type="number"
                  value={wordCountCurrent}
                  onChange={(e) => setWordCountCurrent(Number(e.target.value))}
                  className="bg-[#060D1A] border-[#1E3352] text-[#F0F4FF] text-xs h-9"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Assignee */}
              <div className="space-y-1.5">
                <Label className="text-[#8BA3C7] text-[11px] font-medium">Assignee (Intern)</Label>
                <Select value={assignedTo} onValueChange={(val) => setAssignedTo(val || '')}>
                  <SelectTrigger className="bg-[#060D1A] border-[#1E3352] text-[#F0F4FF] text-xs h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0D1829] border-[#1E3352] text-[#F0F4FF]">
                    <SelectItem value="unassigned" className="text-xs">Unassigned</SelectItem>
                    {employees.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id} className="text-xs">
                        {emp.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Due Date */}
              <div className="space-y-1.5">
                <Label className="text-[#8BA3C7] text-[11px] font-medium">Due Date</Label>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="bg-[#060D1A] border-[#1E3352] text-[#F0F4FF] text-xs h-9"
                />
              </div>
            </div>

            {/* Google Doc / Draft URL */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <Label className="text-[#8BA3C7] text-[11px] font-medium">Google Doc / Draft URL</Label>
                {draftUrl && (
                  <a
                    href={draftUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[10px] text-[#4D90FE] hover:underline font-bold"
                  >
                    Open Link <ExternalLink size={10} />
                  </a>
                )}
              </div>
              <Input
                type="url"
                value={draftUrl}
                onChange={(e) => setDraftUrl(e.target.value)}
                placeholder="e.g. https://docs.google.com/document/d/..."
                className="bg-[#060D1A] border-[#1E3352] text-[#F0F4FF] text-xs h-9"
              />
            </div>

            {/* Brief outline */}
            <div className="space-y-1.5 pt-2 border-t border-[#1E3352]/20">
              <div className="flex justify-between items-center">
                <Label className="text-[#8BA3C7] text-[11px] font-medium">Content Brief Outline</Label>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleGenerateBrief}
                  disabled={generatingBrief}
                  className="h-6 text-[10px] text-[#4D90FE] hover:text-[#F0F4FF] hover:bg-[#1B4FD8]/15 px-2 rounded flex items-center gap-1 font-bold border border-[#1B4FD8]/20 bg-[#1B4FD8]/5"
                >
                  {generatingBrief ? (
                    <>
                      <Loader2 size={10} className="animate-spin" /> Drafting...
                    </>
                  ) : (
                    <>
                      <Sparkles size={10} /> AI Regenerate
                    </>
                  )}
                </Button>
              </div>
              <Textarea
                value={brief}
                onChange={(e) => setBrief(e.target.value)}
                placeholder="Content brief details..."
                className="bg-[#060D1A] border-[#1E3352] text-[#F0F4FF] text-xs min-h-[220px] font-mono leading-relaxed"
              />
            </div>
          </div>

          {/* Footer actions */}
          <SheetFooter className="p-4 border-t border-[#1E3352]/40 bg-[#060D1A] flex items-center justify-between sm:justify-between w-full">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setDeleteDialogOpen(true)}
              className="text-[#EF4444] hover:bg-red-500/10 hover:text-red-400 border border-red-500/20 bg-red-500/5 text-xs h-9 cursor-pointer"
            >
              <Trash2 size={13} className="mr-1.5" /> Delete
            </Button>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="border-[#1E3352] hover:bg-[#132035] text-[#8BA3C7] text-xs h-9 cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSave}
                disabled={loading}
                className="bg-[#1B4FD8] hover:bg-[#2563EB] text-white text-xs h-9 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 size={13} className="animate-spin mr-1.5" /> Saving...
                  </>
                ) : (
                  <>
                    <Save size={13} className="mr-1.5" /> Save Changes
                  </>
                )}
              </Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        title="Delete Content Item"
        description="Are you absolutely sure you want to delete this content item? This action is permanent and cannot be undone."
        onConfirm={handleDelete}
        variant="danger"
      />
    </>
  );
}

export default ContentDetailDrawer;
