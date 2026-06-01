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
import { Client } from '@/types';

interface NewWebProjectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  clients: Client[];
}

export function NewWebProjectModal({
  open,
  onOpenChange,
  onSuccess,
  clients
}: NewWebProjectModalProps) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);

  // Form States
  const [clientId, setClientId] = useState('');
  const [name, setName] = useState('');
  const [projectType, setProjectType] = useState('landing_page');
  const [budget, setBudget] = useState<number>(0);
  const [startDate, setStartDate] = useState('');
  const [deadline, setDeadline] = useState('');
  const [scope, setScope] = useState('');
  const [notes, setNotes] = useState('');
  const [keyContacts, setKeyContacts] = useState('');

  useEffect(() => {
    if (open) {
      // Reset form on open
      setClientId('');
      setName('');
      setProjectType('landing_page');
      setBudget(0);
      setStartDate(new Date().toISOString().split('T')[0]);
      setDeadline('');
      setScope('');
      setNotes('');
      setKeyContacts('');
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId) {
      toast.error('Please select a client');
      return;
    }
    if (!name) {
      toast.error('Please enter a project name');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from('web_projects').insert({
        client_id: clientId,
        name,
        project_type: projectType,
        status: 'scope',
        budget: budget || 0,
        start_date: startDate || null,
        deadline: deadline || null,
        scope: scope || null,
        notes: notes || null,
        key_contacts: keyContacts || null,
        milestones: {
          discovery_complete: false,
          wireframes_approved: false,
          design_mockup_done: false,
          development_done: false,
          client_review: false,
          go_live: false,
        },
      });

      if (error) throw error;

      toast.success('Web project created successfully!');
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to create web project');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-[#0D1829] border border-[#1E3352] text-[#F0F4FF] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-md font-bold text-[#F0F4FF]">Track New Web Project</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2 text-xs">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-[#8BA3C7] text-[11px] font-medium">Select Client *</Label>
              <Select value={clientId} onValueChange={(val) => setClientId(val || '')}>
                <SelectTrigger className="bg-[#060D1A] border-[#1E3352] text-[#F0F4FF] text-xs h-9">
                  <SelectValue placeholder="Select client" />
                </SelectTrigger>
                <SelectContent className="bg-[#0D1829] border-[#1E3352] text-[#F0F4FF]">
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id} className="text-xs">
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[#8BA3C7] text-[11px] font-medium">Project Name *</Label>
              <Input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. E-Commerce Redesign"
                className="bg-[#060D1A] border-[#1E3352] text-[#F0F4FF] text-xs h-9"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-[#8BA3C7] text-[11px] font-medium">Project Type</Label>
              <Select value={projectType} onValueChange={(val) => setProjectType(val || 'landing_page')}>
                <SelectTrigger className="bg-[#060D1A] border-[#1E3352] text-[#F0F4FF] text-xs h-9">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent className="bg-[#0D1829] border-[#1E3352] text-[#F0F4FF]">
                  <SelectItem value="landing_page" className="text-xs">Landing Page</SelectItem>
                  <SelectItem value="ecommerce" className="text-xs">E-Commerce Website</SelectItem>
                  <SelectItem value="corporate" className="text-xs">Corporate Website</SelectItem>
                  <SelectItem value="saas_app" className="text-xs">SaaS Application</SelectItem>
                  <SelectItem value="custom" className="text-xs">Custom Portal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[#8BA3C7] text-[11px] font-medium">Budget (₹ INR)</Label>
              <Input
                type="number"
                value={budget}
                onChange={(e) => setBudget(Number(e.target.value))}
                className="bg-[#060D1A] border-[#1E3352] text-[#F0F4FF] text-xs h-9"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-[#8BA3C7] text-[11px] font-medium">Start Date</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-[#060D1A] border-[#1E3352] text-[#F0F4FF] text-xs h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[#8BA3C7] text-[11px] font-medium">Deadline</Label>
              <Input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="bg-[#060D1A] border-[#1E3352] text-[#F0F4FF] text-xs h-9"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[#8BA3C7] text-[11px] font-medium">Key Client Contacts</Label>
            <Input
              type="text"
              value={keyContacts}
              onChange={(e) => setKeyContacts(e.target.value)}
              placeholder="e.g. John Doe (CEO - john@company.com)"
              className="bg-[#060D1A] border-[#1E3352] text-[#F0F4FF] text-xs h-9"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-[#8BA3C7] text-[11px] font-medium">Project Scope & Deliverables</Label>
            <Textarea
              value={scope}
              onChange={(e) => setScope(e.target.value)}
              placeholder="Outline custom pages, styling themes, required integrations..."
              className="bg-[#060D1A] border-[#1E3352] text-[#F0F4FF] text-xs min-h-[80px]"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-[#8BA3C7] text-[11px] font-medium">Internal Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Hosting credentials, student assignees, specific technical constraints..."
              className="bg-[#060D1A] border-[#1E3352] text-[#F0F4FF] text-xs min-h-[80px]"
            />
          </div>

          <DialogFooter className="mt-4 pt-2 border-t border-[#1E3352]/30">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-[#1E3352] hover:bg-[#132035] text-[#8BA3C7] text-xs h-9"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-[#1B4FD8] hover:bg-[#2563EB] text-white text-xs h-9"
            >
              {loading ? 'Creating...' : 'Create Web Project'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
export default NewWebProjectModal;
