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
import { FileUpload } from '@/components/shared/file-upload';
import { toast } from 'sonner';
import { Client, Profile } from '@/types';

interface SchedulePostModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  prefilledDate?: Date | null;
  prefilledClientId?: string | null;
}

export function SchedulePostModal({
  open,
  onOpenChange,
  onSuccess,
  prefilledDate,
  prefilledClientId
}: SchedulePostModalProps) {
  const supabase = createClient();
  const [clients, setClients] = useState<Client[]>([]);
  const [employees, setEmployees] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);

  // Form State
  const [clientId, setClientId] = useState('');
  const [platform, setPlatform] = useState('instagram');
  const [contentType, setContentType] = useState('post');
  const [caption, setCaption] = useState('');
  const [hashtags, setHashtags] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('12:00');
  const [designFileId, setDesignFileId] = useState<string | null>(null);
  const [assignedTo, setAssignedTo] = useState('');

  useEffect(() => {
    async function loadData() {
      // Load clients
      const { data: clientsData } = await supabase
        .from('clients')
        .select('*')
        .order('name');
      setClients(clientsData || []);

      // Load employees (profiles with role employee or admin)
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('*')
        .in('role', ['employee', 'admin'])
        .eq('is_active', true);
      setEmployees(profilesData || []);
    }

    if (open) {
      loadData();
      // Reset form
      setClientId(prefilledClientId || '');
      setPlatform('instagram');
      setContentType('post');
      setCaption('');
      setHashtags('');
      setDesignFileId(null);
      setAssignedTo('');

      if (prefilledDate) {
        // Format: YYYY-MM-DD
        const year = prefilledDate.getFullYear();
        const month = String(prefilledDate.getMonth() + 1).padStart(2, '0');
        const day = String(prefilledDate.getDate()).padStart(2, '0');
        setScheduledDate(`${year}-${month}-${day}`);
      } else {
        setScheduledDate('');
      }
    }
  }, [open, prefilledDate, prefilledClientId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId) {
      toast.error('Please select a client');
      return;
    }
    if (!scheduledDate) {
      toast.error('Please select a scheduled date');
      return;
    }

    setLoading(true);
    try {
      const scheduledDateTime = new Date(`${scheduledDate}T${scheduledTime}`);
      const hashtagsArray = hashtags
        .split(/[ ,]+/)
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0)
        .map((tag) => (tag.startsWith('#') ? tag : `#${tag}`));

      const monthYearStr = scheduledDateTime.toLocaleString('en-US', { month: 'short', year: 'numeric' });

      const { error } = await supabase.from('social_posts').insert({
        client_id: clientId,
        platform,
        content_type: contentType,
        caption,
        hashtags: hashtagsArray,
        scheduled_for: scheduledDateTime.toISOString(),
        status: 'draft',
        design_file_id: designFileId || null,
        assigned_to: assignedTo || null,
        month_year: monthYearStr,
      });

      if (error) throw error;

      toast.success('Social post scheduled successfully (saved as Draft)');
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to schedule social post');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-bg-card border border-border/30 text-text-primary">
        <DialogHeader>
          <DialogTitle className="text-md font-bold text-text-primary">Schedule Social Media Post</DialogTitle>
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
                    <SelectItem key={c.id} value={c.id} className="text-xs hover:bg-bg-card-hover/20">
                      {c.name} {c.is_agency_self && '🏢'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-text-secondary text-[11px] font-medium">Platform *</Label>
              <Select value={platform} onValueChange={(val) => setPlatform(val || '')}>
                <SelectTrigger className="bg-bg-dark border-border/30 text-text-primary text-xs h-9">
                  <SelectValue placeholder="Select platform" />
                </SelectTrigger>
                <SelectContent className="bg-bg-card border-border/30 text-text-primary">
                  <SelectItem value="instagram" className="text-xs">Instagram</SelectItem>
                  <SelectItem value="facebook" className="text-xs">Facebook</SelectItem>
                  <SelectItem value="linkedin" className="text-xs">LinkedIn</SelectItem>
                  <SelectItem value="all" className="text-xs">All Platforms</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-text-secondary text-[11px] font-medium">Content Type</Label>
              <Select value={contentType} onValueChange={(val) => setContentType(val || '')}>
                <SelectTrigger className="bg-bg-dark border-border/30 text-text-primary text-xs h-9">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent className="bg-bg-card border-border/30 text-text-primary">
                  <SelectItem value="post" className="text-xs">Post</SelectItem>
                  <SelectItem value="reel" className="text-xs">Reel</SelectItem>
                  <SelectItem value="story" className="text-xs">Story</SelectItem>
                  <SelectItem value="carousel" className="text-xs">Carousel</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-text-secondary text-[11px] font-medium">Assign To</Label>
              <Select value={assignedTo} onValueChange={(val) => setAssignedTo(val || '')}>
                <SelectTrigger className="bg-bg-dark border-border/30 text-text-primary text-xs h-9">
                  <SelectValue placeholder="Select team member" />
                </SelectTrigger>
                <SelectContent className="bg-bg-card border-border/30 text-text-primary">
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id} className="text-xs">
                      {emp.full_name} ({emp.role === 'admin' ? 'Admin' : 'Student'})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-text-secondary text-[11px] font-medium">Scheduled Date *</Label>
              <Input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="bg-bg-dark border-border/30 text-text-primary text-xs h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-text-secondary text-[11px] font-medium">Scheduled Time *</Label>
              <Input
                type="time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                className="bg-bg-dark border-border/30 text-text-primary text-xs h-9"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-text-secondary text-[11px] font-medium">Caption</Label>
            <Textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Write interesting caption copy here..."
              className="bg-bg-dark border-border/30 text-text-primary text-xs min-h-[70px]"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-text-secondary text-[11px] font-medium">Hashtags (space or comma separated)</Label>
            <Input
              type="text"
              value={hashtags}
              onChange={(e) => setHashtags(e.target.value)}
              placeholder="e.g. socialmedia marketing crm Kanpur"
              className="bg-bg-dark border-border/30 text-text-primary text-xs h-9"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-text-secondary text-[11px] font-medium">Design Creative File</Label>
            {clientId ? (
              <FileUpload
                bucket="clients"
                storagePath={`clients/${clientId}/content`}
                clientId={clientId}
                department="social"
                tags={['social', 'post']}
                onUpload={(meta) => setDesignFileId(meta.id)}
                className="h-28"
              />
            ) : (
              <div className="p-3 text-center rounded border border-dashed border-border/30 text-[10px] text-text-tertiary bg-bg-dark">
                Please select a client first to unlock file upload.
              </div>
            )}
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
              {loading ? 'Saving...' : 'Save Draft'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
