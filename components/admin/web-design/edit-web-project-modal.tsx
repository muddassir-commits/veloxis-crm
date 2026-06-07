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
import { toast } from 'sonner';
import { WebProject, Client } from '@/types';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { Trash2, Save } from 'lucide-react';

interface EditWebProjectModalProps {
  project: WebProject | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  clients: Client[];
}

export function EditWebProjectModal({
  project,
  open,
  onOpenChange,
  onSuccess,
  clients
}: EditWebProjectModalProps) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Form States
  const [clientId, setClientId] = useState('');
  const [name, setName] = useState('');
  const [projectType, setProjectType] = useState('landing_page');
  const [status, setStatus] = useState<'scope' | 'design' | 'development' | 'review' | 'live'>('scope');
  const [budget, setBudget] = useState<number>(0);
  const [startDate, setStartDate] = useState('');
  const [deadline, setDeadline] = useState('');
  const [scope, setScope] = useState('');
  const [notes, setNotes] = useState('');
  const [keyContacts, setKeyContacts] = useState('');

  useEffect(() => {
    if (project) {
      setClientId(project.client_id || '');
      setName(project.name || '');
      setProjectType(project.project_type || 'landing_page');
      setStatus(project.status || 'scope');
      setBudget(project.budget || 0);
      setStartDate(project.start_date || '');
      setDeadline(project.deadline || '');
      setScope(project.scope || '');
      setNotes(project.notes || '');
      setKeyContacts(project.key_contacts || '');
    }
  }, [project, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project) return;
    if (!name) {
      toast.error('Project name is required');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('web_projects')
        .update({
          client_id: clientId,
          name,
          project_type: projectType,
          status,
          budget: budget || 0,
          start_date: startDate || null,
          deadline: deadline || null,
          scope: scope || null,
          notes: notes || null,
          key_contacts: keyContacts || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', project.id);

      if (error) throw error;

      toast.success('Project details updated successfully!');
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to update project');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!project) return;

    try {
      const { error } = await supabase
        .from('web_projects')
        .delete()
        .eq('id', project.id);

      if (error) throw error;

      toast.success('Web project deleted successfully');
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to delete web project');
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[600px] select-none max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-md font-bold text-text-primary">Edit Web Project</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 py-2 text-xs">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-text-secondary text-[11px] font-medium">Select Client *</Label>
                <Select value={clientId} onValueChange={(val) => setClientId(val || '')}>
                  <SelectTrigger className="bg-bg-dark border-border/30 text-text-primary text-xs h-9">
                    <SelectValue />
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
                <Label className="text-text-secondary text-[11px] font-medium">Project Name *</Label>
                <Input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-bg-dark border-border/30 text-text-primary text-xs h-9"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-text-secondary text-[11px] font-medium">Project Stage</Label>
                <Select value={status} onValueChange={(val: any) => setStatus(val)}>
                  <SelectTrigger className="bg-bg-dark border-border/30 text-text-primary text-xs h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-bg-card border-border/30 text-text-primary">
                    <SelectItem value="scope" className="text-xs">Scope Stage</SelectItem>
                    <SelectItem value="design" className="text-xs">Design Stage</SelectItem>
                    <SelectItem value="development" className="text-xs">Development Stage</SelectItem>
                    <SelectItem value="review" className="text-xs">Review Stage</SelectItem>
                    <SelectItem value="live" className="text-xs">Live Website</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-text-secondary text-[11px] font-medium">Project Type</Label>
                <Select value={projectType} onValueChange={(val) => setProjectType(val || 'landing_page')}>
                  <SelectTrigger className="bg-bg-dark border-border/30 text-text-primary text-xs h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-bg-card border-border/30 text-text-primary">
                    <SelectItem value="landing_page" className="text-xs">Landing Page</SelectItem>
                    <SelectItem value="ecommerce" className="text-xs">E-Commerce Website</SelectItem>
                    <SelectItem value="corporate" className="text-xs">Corporate Website</SelectItem>
                    <SelectItem value="saas_app" className="text-xs">SaaS Application</SelectItem>
                    <SelectItem value="custom" className="text-xs">Custom Portal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-text-secondary text-[11px] font-medium">Budget (₹ INR)</Label>
                <Input
                  type="number"
                  value={budget}
                  onChange={(e) => setBudget(Number(e.target.value))}
                  className="bg-bg-dark border-border/30 text-text-primary text-xs h-9"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-text-secondary text-[11px] font-medium">Deadline</Label>
                <Input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="bg-bg-dark border-border/30 text-text-primary text-xs h-9"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-text-secondary text-[11px] font-medium">Key Client Contacts</Label>
              <Input
                type="text"
                value={keyContacts}
                onChange={(e) => setKeyContacts(e.target.value)}
                className="bg-bg-dark border-border/30 text-text-primary text-xs h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-text-secondary text-[11px] font-medium">Project Scope & Deliverables</Label>
              <Textarea
                value={scope}
                onChange={(e) => setScope(e.target.value)}
                className="bg-bg-dark border-border/30 text-text-primary text-xs min-h-[80px]"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-text-secondary text-[11px] font-medium">Internal Notes</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="bg-bg-dark border-border/30 text-text-primary text-xs min-h-[80px]"
              />
            </div>

            <DialogFooter className="mt-4 pt-2 border-t border-border/30/30 flex justify-between items-center sm:justify-between w-full">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setDeleteDialogOpen(true)}
                className="text-error hover:bg-red-500/10 hover:text-red-400 border border-red-500/20 bg-red-500/5 text-xs h-9 cursor-pointer animate-none"
              >
                <Trash2 size={13} className="mr-1.5" /> Delete Project
              </Button>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  className="border-border/30 hover:bg-bg-card-hover/20 text-text-secondary text-xs h-9 cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="bg-primary hover:bg-primary-light text-white text-xs h-9 cursor-pointer"
                >
                  <Save size={13} className="mr-1.5" /> Save Changes
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        title="Delete Web Project"
        description="Are you absolutely sure you want to delete this web design project? This action is permanent and cannot be undone."
        onConfirm={handleDelete}
        variant="danger"
      />
    </>
  );
}
export default EditWebProjectModal;
