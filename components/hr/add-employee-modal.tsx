'use client';

/* eslint-disable react-hooks/set-state-in-effect */

import React, { useState, useEffect } from 'react';
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
import { X, Copy, Check } from 'lucide-react';

interface AddEmployeeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AddEmployeeModal({ open, onOpenChange, onSuccess }: AddEmployeeModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [skillInput, setSkillInput] = useState('');
  const [skillsList, setSkillsList] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  // Success credentials state
  const [createdCredentials, setCreatedCredentials] = useState<{
    email: string;
    tempPassword: string;
    full_name: string;
  } | null>(null);

  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    designation: 'Digital Marketing Intern',
    join_date: '',
    stipend_amount: '3000',
    payment_day: '5',
    notes: '',
  });

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setForm({
        full_name: '',
        email: '',
        phone: '',
        designation: 'Digital Marketing Intern',
        join_date: new Date().toISOString().split('T')[0],
        stipend_amount: '3000',
        payment_day: '5',
        notes: '',
      });
      setSkillsList([]);
      setSkillInput('');
      setCreatedCredentials(null);
      setCopied(false);
    }
  }, [open]);

  const handleSkillKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const val = skillInput.trim();
      if (val && !skillsList.includes(val)) {
        setSkillsList([...skillsList, val]);
        setSkillInput('');
      }
    }
  };

  const removeSkill = (indexToRemove: number) => {
    setSkillsList(skillsList.filter((_, idx) => idx !== indexToRemove));
  };

  const handleCopyPassword = () => {
    if (!createdCredentials) return;
    navigator.clipboard.writeText(
      `Email: ${createdCredentials.email}\nPassword: ${createdCredentials.tempPassword}`
    );
    setCopied(true);
    toast.success('Credentials copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = async () => {
    if (!form.full_name.trim()) {
      toast.error('Full Name is required.');
      return;
    }
    if (!form.email.trim()) {
      toast.error('Email is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/hr/employee', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...form,
          skills: skillsList,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create employee profile.');
      }

      toast.success(`Account created for ${form.full_name}`);
      setCreatedCredentials({
        email: data.employee.email,
        tempPassword: data.employee.tempPassword,
        full_name: data.employee.full_name,
      });

      onSuccess();
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : 'Failed to save employee profile.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      // Prevent closing clicking outside if we just created credentials
      if (createdCredentials) return;
      onOpenChange(isOpen);
    }}>
      <DialogContent className="sm:max-w-[600px] select-none max-h-[90vh] overflow-y-auto">
        
        {/* State 1: Show temporary password credentials after success */}
        {createdCredentials ? (
          <div className="space-y-6 py-4">
            <div className="text-center space-y-2">
              <div className="h-12 w-12 rounded-full bg-success/10 text-success flex items-center justify-center mx-auto text-xl font-bold">
                ✓
              </div>
              <DialogTitle className="text-base font-bold">
                Employee Account Created!
              </DialogTitle>
              <DialogDescription className="text-xs">
                The employee profile has been seeded. Please send these credentials to the user.
              </DialogDescription>
            </div>

            <div className="bg-bg-card-hover/20 border border-border/20 rounded p-4 space-y-3 font-mono text-xs select-all">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-text-secondary uppercase font-bold tracking-wider">Full Name</span>
                <span className="text-text-primary font-semibold">{createdCredentials.full_name}</span>
              </div>
              <div className="flex flex-col gap-1 border-t border-border/20 pt-2">
                <span className="text-[10px] text-text-secondary uppercase font-bold tracking-wider">Login Email</span>
                <span className="text-text-primary font-semibold">{createdCredentials.email}</span>
              </div>
              <div className="flex flex-col gap-1 border-t border-border/20 pt-2 relative">
                <span className="text-[10px] text-text-secondary uppercase font-bold tracking-wider">Temporary Password</span>
                <span className="text-accent font-bold text-sm tracking-widest">{createdCredentials.tempPassword}</span>
              </div>
            </div>

            <div className="bg-error/10 border border-error/20 rounded p-3 text-[10px] text-error flex flex-col gap-1 leading-relaxed">
              <span className="font-bold">⚠️ CRITICAL WARNING:</span>
              <span>This password will only be displayed once. Copy it now and share it securely with the employee. It is not saved anywhere in clear text.</span>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 border-t border-border/20 pt-4">
              <Button
                onClick={handleCopyPassword}
                variant="secondary"
                className="text-xs h-9 cursor-pointer gap-1.5 font-semibold"
              >
                {copied ? <Check size={14} className="text-success" /> : <Copy size={14} />}
                <span>{copied ? 'Copied!' : 'Copy Credentials'}</span>
              </Button>
              <Button
                onClick={handleClose}
                variant="default"
                className="text-xs h-9 cursor-pointer font-semibold"
              >
                Done & Close
              </Button>
            </DialogFooter>
          </div>
        ) : (
          /* State 2: Show Form */
          <>
            <DialogHeader>
              <DialogTitle className="text-base font-bold">Add New Team Member</DialogTitle>
              <DialogDescription className="text-xs">
                Fill out the employee profile. An authentication record will be created automatically.
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-4 my-2 text-xs">
              <div className="col-span-2 space-y-1">
                <label className="text-[11px] font-semibold text-text-secondary tracking-wider uppercase">Full Name *</label>
                <Input
                  type="text"
                  placeholder="e.g. John Doe"
                  value={form.full_name}
                  onChange={(e) => setForm((p) => ({ ...p, full_name: e.target.value }))}
                  className="h-9"
                  required
                />
              </div>

              <div className="col-span-2 space-y-1">
                <label className="text-[11px] font-semibold text-text-secondary tracking-wider uppercase">Email Address *</label>
                <Input
                  type="email"
                  placeholder="e.g. johndoe@company.com"
                  value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  className="h-9 font-mono"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-text-secondary tracking-wider uppercase">Phone Number</label>
                <Input
                  type="text"
                  placeholder="e.g. +91 9876543210"
                  value={form.phone}
                  onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                  className="h-9 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-text-secondary tracking-wider uppercase">Designation</label>
                <Input
                  type="text"
                  placeholder="e.g. SEO Specialist"
                  value={form.designation}
                  onChange={(e) => setForm((p) => ({ ...p, designation: e.target.value }))}
                  className="h-9"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-text-secondary tracking-wider uppercase">Stipend (₹/month)</label>
                <Input
                  type="number"
                  placeholder="e.g. 5000"
                  value={form.stipend_amount}
                  onChange={(e) => setForm((p) => ({ ...p, stipend_amount: e.target.value }))}
                  className="h-9 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-text-secondary tracking-wider uppercase">Join Date</label>
                <Input
                  type="date"
                  value={form.join_date}
                  onChange={(e) => setForm((p) => ({ ...p, join_date: e.target.value }))}
                  className="h-9 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-text-secondary tracking-wider uppercase">Payment Day</label>
                <select
                  value={form.payment_day}
                  onChange={(e) => setForm((p) => ({ ...p, payment_day: e.target.value }))}
                  className="h-9 w-full bg-bg-card/50 border border-border/30 text-text-primary rounded px-3 hover:border-border/60 focus:border-primary/50 focus:shadow-[0_0_16px_rgba(37,99,235,0.15)] transition-all outline-none"
                >
                  <option value="1" className="bg-bg-card text-text-primary">1st of month</option>
                  <option value="5" className="bg-bg-card text-text-primary">5th of month</option>
                  <option value="10" className="bg-bg-card text-text-primary">10th of month</option>
                  <option value="15" className="bg-bg-card text-text-primary">15th of month</option>
                </select>
              </div>

              <div className="col-span-2 space-y-1">
                <label className="text-[11px] font-semibold text-text-secondary tracking-wider uppercase">Skills (Press Enter to Add)</label>
                <div className="flex flex-wrap gap-1.5 p-2 bg-bg-card/50 border border-border/30 rounded min-h-12 w-full">
                  {skillsList.map((skill, index) => (
                    <span
                      key={index}
                      className="bg-bg-card-hover border border-border/30 text-text-primary text-[10px] px-2 py-0.5 rounded-full inline-flex items-center gap-1"
                    >
                      {skill}
                      <button
                        type="button"
                        onClick={() => removeSkill(index)}
                        className="text-text-secondary hover:text-text-primary hover:bg-bg-light/10 rounded-full p-0.5 cursor-pointer"
                      >
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                  <input
                    type="text"
                    placeholder={skillsList.length === 0 ? "e.g. Copywriting, SEO, Analytics" : ""}
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyDown={handleSkillKeyDown}
                    className="flex-1 bg-transparent border-0 outline-none text-text-primary h-6 placeholder-text-tertiary focus:ring-0 min-w-[120px]"
                  />
                </div>
              </div>

              <div className="col-span-2 space-y-1">
                <label className="text-[11px] font-semibold text-text-secondary tracking-wider uppercase">Notes / Bank Details Info</label>
                <textarea
                  placeholder="Banking accounts, upi id details, nda checklist details..."
                  value={form.notes}
                  onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                  rows={2}
                  className="w-full bg-bg-card/50 border border-border/30 text-text-primary rounded p-2 resize-none hover:border-border/60 focus:border-primary/50 focus:shadow-[0_0_16px_rgba(37,99,235,0.15)] transition-all outline-none"
                />
              </div>
            </div>

            <DialogFooter className="mt-4 gap-2 sm:gap-0">
              <Button
                variant="secondary"
                onClick={handleClose}
                className="text-xs h-9 cursor-pointer font-semibold"
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                variant="default"
                className="text-xs h-9 cursor-pointer font-semibold"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Creating...' : 'Add Employee'}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
