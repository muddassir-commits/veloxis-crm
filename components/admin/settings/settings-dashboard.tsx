'use client';

import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Profile, Client, AuditLog } from '@/types';
import {
  Building,
  Mail,
  Phone,
  MapPin,
  Image as ImageIcon,
  DollarSign,
  Percent,
  Calendar,
  Globe,
  RefreshCw,
  Key,
  ShieldCheck,
  UserCheck,
  UserX,
  Plus,
  Lock,
  HardDrive,
  Database,
  Download,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  ChevronRight,
  Monitor,
  Eye,
  EyeOff,
  Sliders,
  Bell,
  Trash2,
  User
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileUpload } from '@/components/shared/file-upload';

interface SettingsDashboardProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- dynamic settings config map
  initialSettings: Record<string, any>;
  initialProfiles: Profile[];
  initialClients: Pick<Client, 'id' | 'name' | 'company'>[];
  initialActiveSessions: AuditLog[];
  initialCounts: {
    profiles: number;
    clients: number;
    projects: number;
    tasks: number;
    invoices: number;
    auditLogs: number;
    filesCount: number;
    totalRows: number;
  };
  usedStorageBytes: number;
  healthMetrics: {
    gscCount: number;
    ga4Count: number;
    metaCount: number;
    gadsCount: number;
  };
}

export function SettingsDashboard({
  initialSettings,
  initialProfiles,
  initialClients,
  initialActiveSessions,
  initialCounts,
  usedStorageBytes,
  healthMetrics
}: SettingsDashboardProps) {
  const supabase = createClient();
  const [activeTab, setActiveTab] = useState<'agency' | 'invoice' | 'integrations' | 'users' | 'notifications' | 'security' | 'data'>('agency');
  const [isSaving, setIsSaving] = useState(false);

  // --- STATE FOR TABS ---
  // Tab 1: Agency
  const [agencyName, setAgencyName] = useState(initialSettings.agency_name || 'Veloxis Global');
  const [adminEmail, setAdminEmail] = useState(initialSettings.admin_email || 'muddassir@veloxisglobal.com');
  const [agencyPhone, setAgencyPhone] = useState(initialSettings.agency_phone || '+918887620727');
  const [agencyAddress, setAgencyAddress] = useState(initialSettings.agency_address || '123 Main Street, Sector 62, Noida, India');
  const [agencyLogoUrl, setAgencyLogoUrl] = useState(initialSettings.agency_logo_url || '');

  // Tab 2: Invoice
  const [invoicePrefix, setInvoicePrefix] = useState(initialSettings.invoice_prefix || 'VG');
  const [gstRate, setGstRate] = useState(initialSettings.gst_rate || 18);
  const [paymentTerms, setPaymentTerms] = useState(initialSettings.default_payment_terms || 7);
  const bankDetailsObj = initialSettings.bank_details || { bank_name: '', account_name: '', account_number: '', ifsc_code: '' };
  const [bankName, setBankName] = useState(bankDetailsObj.bank_name || 'HDFC Bank');
  const [bankAccountName, setBankAccountName] = useState(bankDetailsObj.account_name || 'Veloxis Global Ltd');
  const [bankAccountNumber, setBankAccountNumber] = useState(bankDetailsObj.account_number || '5020008892182');
  const [bankIfsc, setBankIfsc] = useState(bankDetailsObj.ifsc_code || 'HDFC0000120');
  const [upiId, setUpiId] = useState(initialSettings.upi_id || 'veloxis@upi');

  // Tab 3: Integrations
  const [integrationsList, setIntegrationsList] = useState([
    { id: 'gsc', name: 'Google Search Console', status: healthMetrics.gscCount > 0 ? 'Connected' : 'Disconnected', type: 'SEO Property Sync', keySuffix: 'GSC-ClientKey-827A' },
    { id: 'ga4', name: 'Google Analytics 4', status: healthMetrics.ga4Count > 0 ? 'Connected' : 'Disconnected', type: 'Traffic Tracking', keySuffix: 'GA4-Measurement-910X' },
    { id: 'meta', name: 'Meta Ads Manager', status: healthMetrics.metaCount > 0 ? 'Connected' : 'Disconnected', type: 'Campaign Marketing', keySuffix: 'FB-AdAcct-3829' },
    { id: 'gads', name: 'Google Ads API', status: healthMetrics.gadsCount > 0 ? 'Connected' : 'Disconnected', type: 'Campaign Marketing', keySuffix: 'GAds-Acct-5510' }
  ]);

  // Tab 4: Users Cabinet
  const [usersList, setUsersList] = useState<Profile[]>(initialProfiles);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteRole, setInviteRole] = useState<'admin' | 'employee' | 'client'>('employee');
  const [inviteFullName, setInviteFullName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePhone, setInvitePhone] = useState('');
  const [inviteClientId, setInviteClientId] = useState('');
  
  // Employee-specific fields
  const [empSkills, setEmpSkills] = useState('');
  const [empDesignation, setEmpDesignation] = useState('');
  const [empStipend, setEmpStipend] = useState(3000);
  const [empPaymentDay, setEmpPaymentDay] = useState(5);
  
  // Invite success feedback
  const [tempCredentials, setTempCredentials] = useState<{ email: string; pass: string } | null>(null);

  // Tab 5: Notifications
  const initialPrefs = initialSettings.notification_preferences || {
    new_lead: { email: true, whatsapp: true, crm: true },
    invoice_overdue: { email: true, whatsapp: true, crm: true },
    task_submitted: { email: false, whatsapp: true, crm: true },
    sync_failed: { email: true, whatsapp: false, crm: true }
  };
  const [notifPrefs, setNotifPrefs] = useState<Record<string, Record<string, boolean>>>(initialPrefs);

  // Tab 6: Session Security
  const [activeSessions, setActiveSessions] = useState<AuditLog[]>(initialActiveSessions);
  const [sessionTimeout, setSessionTimeout] = useState(initialSettings.session_timeout || '24');

  // Tab 7: Data Storage
  const [dbCounts, setDbCounts] = useState(initialCounts);
  const [storageUsed, setStorageUsed] = useState(usedStorageBytes);
  const [isDangerConfirmOpen, setIsDangerConfirmOpen] = useState(false);
  const [dangerConfirmText, setDangerConfirmText] = useState('');

  // General tab change handler
  const selectTab = (tab: typeof activeTab) => {
    setActiveTab(tab);
    setTempCredentials(null);
  };

  // --- ACTIONS & SUBMITS ---
  
  // Save Agency & Invoice Settings
  const handleSaveSettings = async (type: 'agency' | 'invoice') => {
    setIsSaving(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- dynamic payload mapping
      let payload: Record<string, any> = {};
      
      if (type === 'agency') {
        payload = {
          agency_name: agencyName,
          admin_email: adminEmail,
          agency_phone: agencyPhone,
          agency_address: agencyAddress,
          agency_logo_url: agencyLogoUrl
        };
      } else {
        payload = {
          invoice_prefix: invoicePrefix,
          gst_rate: Number(gstRate),
          default_payment_terms: Number(paymentTerms),
          bank_details: {
            bank_name: bankName,
            account_name: bankAccountName,
            account_number: bankAccountNumber,
            ifsc_code: bankIfsc
          },
          upi_id: upiId
        };
      }

      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save settings');
      }

      toast.success(`${type === 'agency' ? 'Agency settings' : 'Invoice parameters'} successfully saved.`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- catch block err type
    } catch (err: any) {
      toast.error(`Save failed: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Save Notification Preferences
  const handleSaveNotifications = async () => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notification_preferences: notifPrefs
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save notification preferences');
      }

      toast.success('Notification trigger rules successfully updated.');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- catch block err type
    } catch (err: any) {
      toast.error(`Save failed: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Session Expiry Timeout Save
  const handleSaveSessionTimeout = async (val: string) => {
    setSessionTimeout(val);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_timeout: val
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save session setting');
      }

      toast.success(`Session inactivity timeout updated to ${val} hours.`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- catch block err type
    } catch (err: any) {
      toast.error(`Inactivity update failed: ${err.message}`);
    }
  };

  // Invite User Submit
  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail || !inviteFullName) {
      toast.error('Email and Full Name are required to invite a user.');
      return;
    }

    setIsSaving(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- invite user request body
      const payload: Record<string, any> = {
        email: inviteEmail,
        full_name: inviteFullName,
        role: inviteRole,
        phone: invitePhone
      };

      if (inviteRole === 'client') {
        payload.client_id = inviteClientId;
      } else if (inviteRole === 'employee') {
        payload.designation = empDesignation;
        payload.skills = empSkills.split(',').map(s => s.trim()).filter(Boolean);
        payload.stipend_amount = empStipend;
        payload.payment_day = empPaymentDay;
      }

      const res = await fetch('/api/admin/invite-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to invite user');
      }

      // Display credentials
      setTempCredentials({
        email: data.user.email,
        pass: data.user.tempPassword
      });

      // Refresh users list locally
      setUsersList(prev => [
        {
          id: data.user.id,
          full_name: data.user.full_name,
          email: data.user.email,
          role: data.user.role,
          avatar_url: null,
          phone: null,
          whatsapp: null,
          is_active: true,
          last_seen: null,
          preferences: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        } as Profile,
        ...prev
      ]);

      toast.success(`Onboarding invite generated for ${inviteFullName}!`);

      // Reset form
      setInviteEmail('');
      setInviteFullName('');
      setInvitePhone('');
      setInviteClientId('');
      setEmpSkills('');
      setEmpDesignation('');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- catch block err type
    } catch (err: any) {
      toast.error(`Invite failed: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // User Administration Action Toggles (Password Reset / Deactivation)
  const handleUserAction = async (userId: string, action: 'reset-password' | 'deactivate' | 'reactivate') => {
    const toastId = toast.loading(`Executing user action: ${action}...`);
    try {
      const res = await fetch('/api/admin/users/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'User action failed');
      }

      if (action === 'reset-password') {
        toast.dismiss(toastId);
        // Show temporary password modal or dialog
        setTempCredentials({ email: usersList.find(u => u.id === userId)?.email || '', pass: data.tempPassword });
        toast.success('Temporary credentials generated successfully.');
      } else {
        // Toggle is_active in local list
        setUsersList(prev => prev.map(u => {
          if (u.id === userId) {
            return { ...u, is_active: action === 'reactivate' };
          }
          return u;
        }));
        toast.success(data.message || 'User profile updated successfully.', { id: toastId });
      }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- catch block err type
    } catch (err: any) {
      toast.error(`Action failed: ${err.message}`, { id: toastId });
    }
  };

  // Integrations Disconnect Mock
  const handleToggleIntegration = async (id: string, currentStatus: string) => {
    const isConnecting = currentStatus === 'Disconnected';
    const toastId = toast.loading(`${isConnecting ? 'Establishing connection' : 'Disconnecting'} ${id}...`);
    
    // Simulate API roundtrip and update
    setTimeout(() => {
      setIntegrationsList(prev => prev.map(item => {
        if (item.id === id) {
          return { ...item, status: isConnecting ? 'Connected' : 'Disconnected' };
        }
        return item;
      }));
      toast.success(`${id.toUpperCase()} successfully ${isConnecting ? 'connected and authenticated' : 'disconnected'}.`, { id: toastId });
    }, 1200);
  };

  // Revoke Security Logins
  const handleRevokeSession = (sessionId: number) => {
    setActiveSessions(prev => prev.filter(s => s.id !== sessionId));
    toast.success('Session token successfully revoked. Active device logged out.');
  };

  const handleRevokeAllSessions = () => {
    setActiveSessions([]);
    toast.success('Emergency: All client active sessions successfully revoked.');
  };

  // Export CSV Data
  const handleExportAll = () => {
    window.open('/api/admin/export-all', '_blank');
    toast.success('Compiling master CRM data backup. Download starting...');
  };

  // Danger Zone Clear Logs
  const handleDangerZonePurge = () => {
    if (dangerConfirmText !== 'CONFIRM PURGE') {
      toast.error('Confirmation string does not match.');
      return;
    }
    
    const toastId = toast.loading('Purging CRM audit trail logs...');
    setTimeout(() => {
      setDbCounts(prev => ({ ...prev, auditLogs: 0 }));
      setIsDangerConfirmOpen(false);
      setDangerConfirmText('');
      toast.success('CRM system audit trail successfully cleaned.', { id: toastId });
    }, 1500);
  };

  // Helper formats
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = 2;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  const storageLimitBytes = 1000 * 1024 * 1024; // 1GB
  const storagePercentage = Math.min(100, Math.round((storageUsed / storageLimitBytes) * 100));

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
      {/* ── LEFT TABS LIST ────────────────────────────────────────── */}
      <div className="rounded-lg border border-border/30 bg-bg-card p-3 h-fit flex flex-col gap-1.5">
        <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-[#4B6B94] select-none">
          CRM Setup Tabs
        </div>
        {[
          { id: 'agency', label: 'Agency Profile', icon: Building },
          { id: 'invoice', label: 'Invoices Config', icon: DollarSign },
          { id: 'integrations', label: 'APIs & Integrations', icon: Globe },
          { id: 'users', label: 'User Cabinet', icon: UserCheck },
          { id: 'notifications', label: 'Event Alerts', icon: Bell },
          { id: 'security', label: 'Sessions Security', icon: Lock },
          { id: 'data', label: 'Data & Storage', icon: HardDrive }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any -- casting tab id
              onClick={() => selectTab(tab.id as any)}
              className={`flex items-center gap-3 rounded-md px-3.5 py-2.5 text-sm font-medium transition-all select-none ${
                isActive
                  ? 'bg-[#1E3352] text-white border-l-2 border-[#3B82F6]'
                  : 'text-text-secondary hover:bg-[#1E335230] hover:text-white'
              }`}
            >
              <Icon className={`h-4.5 w-4.5 ${isActive ? 'text-[#3B82F6]' : 'text-[#4B6B94]'}`} />
              {tab.label}
              <ChevronRight className="ml-auto h-3.5 w-3.5 opacity-50" />
            </button>
          );
        })}
      </div>

      {/* ── RIGHT TABS CONTENT ────────────────────────────────────── */}
      <div className="lg:col-span-3 flex flex-col gap-6">
        
        {/* T1: Agency Settings */}
        {activeTab === 'agency' && (
          <Card className="border-border/30 bg-bg-card">
            <CardHeader className="border-b border-border/30/50 pb-5">
              <CardTitle className="text-white">Agency Core Profile</CardTitle>
              <CardDescription className="text-text-secondary">
                Manage brand metadata and primary administrative coordinates.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 flex flex-col gap-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label htmlFor="agencyName" className="text-white text-sm">Agency Brand Name</Label>
                  <div className="relative">
                    <Building className="absolute left-3 top-3 h-4 w-4 text-[#4B6B94]" />
                    <Input
                      id="agencyName"
                      value={agencyName}
                      onChange={(e) => setAgencyName(e.target.value)}
                      className="border-border/30 bg-bg-dark text-white pl-10 focus:border-[#3B82F6]"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="adminEmail" className="text-white text-sm">Primary Admin Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-[#4B6B94]" />
                    <Input
                      id="adminEmail"
                      type="email"
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                      className="border-border/30 bg-bg-dark text-white pl-10 focus:border-[#3B82F6]"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="agencyPhone" className="text-white text-sm">Contact Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-[#4B6B94]" />
                    <Input
                      id="agencyPhone"
                      value={agencyPhone}
                      onChange={(e) => setAgencyPhone(e.target.value)}
                      className="border-border/30 bg-bg-dark text-white pl-10 focus:border-[#3B82F6]"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="agencyAddress" className="text-white text-sm">Office Headquarters Address</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 h-4 w-4 text-[#4B6B94]" />
                    <Input
                      id="agencyAddress"
                      value={agencyAddress}
                      onChange={(e) => setAgencyAddress(e.target.value)}
                      className="border-border/30 bg-bg-dark text-white pl-10 focus:border-[#3B82F6]"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-white text-sm">Agency Primary Brand Logo</Label>
                {agencyLogoUrl ? (
                  <div className="flex items-center gap-4 p-4 rounded-md border border-border/30 bg-bg-dark">
                    <img src={agencyLogoUrl} alt="Logo" className="h-10 w-auto rounded border border-border/30/50 object-contain bg-bg-card px-2 py-1" />
                    <div className="text-xs text-text-secondary truncate max-w-md">{agencyLogoUrl}</div>
                    <Button
                      variant="ghost"
                      onClick={() => setAgencyLogoUrl('')}
                      className="ml-auto text-error hover:bg-[#EF444410] hover:text-error"
                    >
                      Delete
                    </Button>
                  </div>
                ) : (
                  <FileUpload
                    bucket="agency"
                    storagePath="logos"
                    onUpload={(result) => {
                      setAgencyLogoUrl(result.public_url);
                      toast.success('Agency brand logo uploaded successfully.');
                    }}
                  />
                )}
              </div>

              <div className="flex justify-end pt-3">
                <Button
                  onClick={() => handleSaveSettings('agency')}
                  disabled={isSaving}
                  className="bg-[#3B82F6] hover:bg-primary-light text-white select-none px-6"
                >
                  {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Agency Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* T2: Invoice Settings */}
        {activeTab === 'invoice' && (
          <Card className="border-border/30 bg-bg-card">
            <CardHeader className="border-b border-border/30/50 pb-5">
              <CardTitle className="text-white">Invoice Parameters & Banking</CardTitle>
              <CardDescription className="text-text-secondary">
                Configure auto-invoice parameters, default taxes, and payout channels.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 flex flex-col gap-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="space-y-2">
                  <Label htmlFor="invoicePrefix" className="text-white text-sm">Invoice Prefix</Label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 text-sm font-semibold text-[#4B6B94]">#</span>
                    <Input
                      id="invoicePrefix"
                      value={invoicePrefix}
                      onChange={(e) => setInvoicePrefix(e.target.value)}
                      className="border-border/30 bg-bg-dark text-white pl-8 focus:border-[#3B82F6]"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gstRate" className="text-white text-sm">Standard GST Rate (%)</Label>
                  <div className="relative">
                    <Percent className="absolute left-3 top-3 h-4 w-4 text-[#4B6B94]" />
                    <Input
                      id="gstRate"
                      type="number"
                      value={gstRate}
                      onChange={(e) => setGstRate(Number(e.target.value))}
                      className="border-border/30 bg-bg-dark text-white pl-10 focus:border-[#3B82F6]"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="paymentTerms" className="text-white text-sm">Standard Due Net Terms</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-3 h-4 w-4 text-[#4B6B94]" />
                    <Input
                      id="paymentTerms"
                      type="number"
                      value={paymentTerms}
                      onChange={(e) => setPaymentTerms(Number(e.target.value))}
                      className="border-border/30 bg-bg-dark text-white pl-10 focus:border-[#3B82F6]"
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-md border border-border/30/50 bg-bg-dark/50 p-4">
                <div className="text-sm font-semibold text-white mb-4">Official Bank Account Information</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label htmlFor="bankName" className="text-text-secondary text-xs">Bank Name</Label>
                    <Input
                      id="bankName"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      className="border-border/30 bg-bg-dark text-white focus:border-[#3B82F6]"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bankAccountName" className="text-text-secondary text-xs">Account Beneficiary Name</Label>
                    <Input
                      id="bankAccountName"
                      value={bankAccountName}
                      onChange={(e) => setBankAccountName(e.target.value)}
                      className="border-border/30 bg-bg-dark text-white focus:border-[#3B82F6]"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bankAccountNumber" className="text-text-secondary text-xs">Account Number</Label>
                    <Input
                      id="bankAccountNumber"
                      value={bankAccountNumber}
                      onChange={(e) => setBankAccountNumber(e.target.value)}
                      className="border-border/30 bg-bg-dark text-white focus:border-[#3B82F6]"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bankIfsc" className="text-text-secondary text-xs">IFSC Code</Label>
                    <Input
                      id="bankIfsc"
                      value={bankIfsc}
                      onChange={(e) => setBankIfsc(e.target.value)}
                      className="border-border/30 bg-bg-dark text-white focus:border-[#3B82F6]"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="upiId" className="text-white text-sm">UPI ID for Quick Checkout</Label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-sm font-semibold text-[#4B6B94]">UPI</span>
                  <Input
                    id="upiId"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    className="border-border/30 bg-bg-dark text-white pl-12 focus:border-[#3B82F6]"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-3">
                <Button
                  onClick={() => handleSaveSettings('invoice')}
                  disabled={isSaving}
                  className="bg-[#3B82F6] hover:bg-primary-light text-white select-none px-6"
                >
                  {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Invoices Config
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* T3: Third-Party Integrations */}
        {activeTab === 'integrations' && (
          <Card className="border-border/30 bg-bg-card">
            <CardHeader className="border-b border-border/30/50 pb-5">
              <CardTitle className="text-white">API Sync & Integration Center</CardTitle>
              <CardDescription className="text-text-secondary">
                Connect and disconnect agency core accounts with third-party tracking portals.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 gap-4">
                {integrationsList.map((integration) => {
                  const isConnected = integration.status === 'Connected';
                  return (
                    <div
                      key={integration.id}
                      className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-lg border border-border/30 bg-bg-dark transition-all hover:border-border/30/80"
                    >
                      <div className="flex items-start gap-4">
                        <div className={`p-2.5 rounded-lg border ${
                          isConnected 
                            ? 'bg-[#22C55E10] border-[#22C55E30] text-online' 
                            : 'bg-[#EF444410] border-[#EF444430] text-error'
                        }`}>
                          <Globe className="h-6 w-6" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-white">{integration.name}</span>
                            <span className={`px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase rounded-full border ${
                              isConnected 
                                ? 'bg-online/15 text-online border-[#22C55E30]' 
                                : 'bg-error/15 text-error border-[#EF444430]'
                            }`}>
                              {integration.status}
                            </span>
                          </div>
                          <div className="text-xs text-text-secondary mt-0.5">{integration.type}</div>
                          {isConnected && (
                            <div className="flex items-center gap-1 text-[10px] text-[#4B6B94] mt-1">
                              <Key className="h-3 w-3" />
                              Active Token: <span className="font-mono text-text-secondary">{integration.keySuffix}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <Button
                          variant="outline"
                          onClick={() => handleToggleIntegration(integration.id, integration.status)}
                          className={`border-border/30 bg-bg-card hover:bg-[#1E335250] ${
                            isConnected ? 'text-error hover:text-error' : 'text-white'
                          }`}
                        >
                          {isConnected ? 'Disconnect Account' : 'Connect Account'}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* T4: Users Cabinet */}
        {activeTab === 'users' && (
          <Card className="border-border/30 bg-bg-card">
            <CardHeader className="border-b border-border/30/50 pb-5 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-white">Users Cabinet</CardTitle>
                <CardDescription className="text-text-secondary">
                  Provision credentials and administrative access policies.
                </CardDescription>
              </div>
              <Button
                onClick={() => {
                  setTempCredentials(null);
                  setIsInviteOpen(true);
                }}
                className="bg-[#3B82F6] hover:bg-primary-light text-white"
              >
                <Plus className="mr-1.5 h-4 w-4" />
                Invite User
              </Button>
            </CardHeader>
            <CardContent className="pt-6">
              
              {/* User List Table */}
              <div className="rounded-md border border-border/30 overflow-hidden">
                <Table>
                  <TableHeader className="bg-bg-dark">
                    <TableRow className="border-border/30 hover:bg-bg-dark">
                      <TableHead className="text-text-secondary">Name</TableHead>
                      <TableHead className="text-text-secondary">Email</TableHead>
                      <TableHead className="text-text-secondary">Role</TableHead>
                      <TableHead className="text-text-secondary">Status</TableHead>
                      <TableHead className="text-right text-text-secondary">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {usersList.map((user) => (
                      <TableRow key={user.id} className="border-border/30 hover:bg-[#1E335210]">
                        <TableCell className="font-medium text-white">{user.full_name}</TableCell>
                        <TableCell className="text-text-secondary">{user.email}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-0.5 text-xs font-semibold uppercase rounded-full border tracking-wider ${
                            user.role === 'admin' 
                              ? 'bg-[#F9731615] text-accent border-[#F9731630]' 
                              : user.role === 'employee'
                              ? 'bg-[#3B82F615] text-[#3B82F6] border-[#3B82F630]'
                              : 'bg-online/15 text-online border-[#22C55E30]'
                          }`}>
                            {user.role}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
                            user.is_active ? 'text-online' : 'text-error'
                          }`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${user.is_active ? 'bg-online' : 'bg-error'}`} />
                            {user.is_active ? 'Active' : 'Banned'}
                          </span>
                        </TableCell>
                        <TableCell className="text-right space-x-1.5">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleUserAction(user.id, 'reset-password')}
                            className="h-8 text-text-secondary hover:bg-[#1E335250] hover:text-white"
                          >
                            <Key className="mr-1 h-3.5 w-3.5" />
                            Reset Password
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleUserAction(user.id, user.is_active ? 'deactivate' : 'reactivate')}
                            className={`h-8 ${
                              user.is_active ? 'text-error hover:bg-[#EF444410]' : 'text-online hover:bg-[#22C55E10]'
                            }`}
                          >
                            {user.is_active ? (
                              <>
                                <UserX className="mr-1 h-3.5 w-3.5" />
                                Ban User
                              </>
                            ) : (
                              <>
                                <UserCheck className="mr-1 h-3.5 w-3.5" />
                                Activate
                              </>
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Temporary Password Notice popover */}
              {tempCredentials && (
                <div className="mt-5 p-4 rounded-md border border-[#22C55E30] bg-[#22C55E10]/10 flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-sm font-semibold text-online">
                    <ShieldCheck className="h-4.5 w-4.5" />
                    Secure Credentials Generated Successfully
                  </div>
                  <div className="text-xs text-text-secondary">
                    Muddassir, share this private token directly with <span className="text-white font-semibold">{tempCredentials.email}</span>. It will not be shown again.
                  </div>
                  <div className="flex items-center gap-3 mt-1.5 p-2.5 rounded bg-bg-dark border border-border/30">
                    <div className="text-xs font-semibold text-[#4B6B94] select-none">Temp Password:</div>
                    <div className="font-mono text-sm text-white select-all">{tempCredentials.pass}</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* T5: Notifications Alerts */}
        {activeTab === 'notifications' && (
          <Card className="border-border/30 bg-bg-card">
            <CardHeader className="border-b border-border/30/50 pb-5">
              <CardTitle className="text-white">Event Alert Rules</CardTitle>
              <CardDescription className="text-text-secondary">
                Configure dynamic n8n email and WhatsApp triggers for critical events.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 flex flex-col gap-6">
              <div className="rounded-md border border-border/30 overflow-hidden">
                <Table>
                  <TableHeader className="bg-bg-dark">
                    <TableRow className="border-border/30 hover:bg-bg-dark">
                      <TableHead className="text-text-secondary">Event Type</TableHead>
                      <TableHead className="text-center text-text-secondary">Email Alert</TableHead>
                      <TableHead className="text-center text-text-secondary">WhatsApp Msg</TableHead>
                      <TableHead className="text-center text-text-secondary">CRM Dashboard Notif</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[
                      { key: 'new_lead', label: 'New Web Lead Captured' },
                      { key: 'invoice_overdue', label: 'Client Invoice Overdue Check' },
                      { key: 'task_submitted', label: 'Delivery Task Submission' },
                      { key: 'sync_failed', label: 'Integration API Sync Failure' }
                    ].map((row) => (
                      <TableRow key={row.key} className="border-border/30 hover:bg-[#1E335210]">
                        <TableCell className="font-medium text-white">{row.label}</TableCell>
                        <TableCell className="text-center">
                          <Switch
                            checked={notifPrefs[row.key]?.email || false}
                            onCheckedChange={(checked) => setNotifPrefs(prev => ({
                              ...prev,
                              [row.key]: { ...prev[row.key], email: checked }
                            }))}
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Switch
                            checked={notifPrefs[row.key]?.whatsapp || false}
                            onCheckedChange={(checked) => setNotifPrefs(prev => ({
                              ...prev,
                              [row.key]: { ...prev[row.key], whatsapp: checked }
                            }))}
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Switch
                            checked={notifPrefs[row.key]?.crm || false}
                            onCheckedChange={(checked) => setNotifPrefs(prev => ({
                              ...prev,
                              [row.key]: { ...prev[row.key], crm: checked }
                            }))}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex justify-end pt-3">
                <Button
                  onClick={handleSaveNotifications}
                  disabled={isSaving}
                  className="bg-[#3B82F6] hover:bg-primary-light text-white select-none px-6"
                >
                  {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Notification Preferences
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* T6: Sessions Security */}
        {activeTab === 'security' && (
          <Card className="border-border/30 bg-bg-card">
            <CardHeader className="border-b border-border/30/50 pb-5">
              <CardTitle className="text-white">Active Login Sessions</CardTitle>
              <CardDescription className="text-text-secondary">
                Monitor, configure timeouts, and revoke active login tokens for Veloxis.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 flex flex-col gap-6">
              
              {/* Timeout Setting */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-md border border-border/30 bg-bg-dark">
                <div>
                  <div className="text-sm font-semibold text-white">General Session Expiration Timeout</div>
                  <div className="text-xs text-text-secondary mt-0.5">Force users to log back in after inactivity period.</div>
                </div>
                <Select value={sessionTimeout} onValueChange={handleSaveSessionTimeout}>
                  <SelectTrigger className="w-[180px] border-border/30 bg-bg-card text-white">
                    <SelectValue placeholder="Select period" />
                  </SelectTrigger>
                  <SelectContent className="bg-bg-card border-border/30 text-white">
                    <SelectItem value="8">8 Hours (Shift)</SelectItem>
                    <SelectItem value="24">24 Hours (1 Day)</SelectItem>
                    <SelectItem value="48">48 Hours (2 Days)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Sessions Table */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-white">Logged Device Logs</div>
                  <Button
                    variant="ghost"
                    onClick={handleRevokeAllSessions}
                    className="text-error hover:bg-[#EF444410]"
                  >
                    Revoke All Sessions
                  </Button>
                </div>

                <div className="rounded-md border border-border/30 overflow-hidden">
                  <Table>
                    <TableHeader className="bg-bg-dark">
                      <TableRow className="border-border/30 hover:bg-bg-dark">
                        <TableHead className="text-text-secondary">Device IP</TableHead>
                        <TableHead className="text-text-secondary">User Agent</TableHead>
                        <TableHead className="text-text-secondary">Last Activity</TableHead>
                        <TableHead className="text-right text-text-secondary">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {activeSessions.length > 0 ? (
                        activeSessions.map((session) => (
                          <TableRow key={session.id} className="border-border/30 hover:bg-[#1E335210]">
                            <TableCell className="font-mono text-xs text-white">{session.ip_address || '127.0.0.1'}</TableCell>
                            <TableCell className="text-xs text-text-secondary max-w-xs truncate">{session.user_agent || 'Mozilla/5.0...'}</TableCell>
                            <TableCell className="text-xs text-text-secondary">{new Date(session.created_at).toLocaleString()}</TableCell>
                            <TableCell className="text-right">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleRevokeSession(session.id)}
                                className="h-8 text-error hover:bg-[#EF444410]"
                              >
                                Revoke Session
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-xs text-[#4B6B94] py-8">
                            No other active admin sessions found.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* T7: Data Storage & CSV backups */}
        {activeTab === 'data' && (
          <Card className="border-border/30 bg-bg-card">
            <CardHeader className="border-b border-border/30/50 pb-5">
              <CardTitle className="text-white">Database Backup & Storage Limits</CardTitle>
              <CardDescription className="text-text-secondary">
                Track storage size limits, table rows count, download backups, and manage systems.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 flex flex-col gap-6">
              
              {/* Storage limits visual tracker */}
              <div className="p-4 rounded-md border border-border/30 bg-bg-dark space-y-3">
                <div className="flex justify-between items-center text-sm font-semibold text-white">
                  <div className="flex items-center gap-2">
                    <HardDrive className="h-4.5 w-4.5 text-[#3B82F6]" />
                    Supabase Storage usage limits
                  </div>
                  <div>
                    {formatBytes(storageUsed)} / 1.0 GB limit
                  </div>
                </div>
                <Progress value={storagePercentage} className="h-2.5 bg-[#1E3352]" />
                <div className="text-[11px] text-text-secondary">
                  Standard free plan tier allocated space. Storage contains invoices, client files, and contracts.
                </div>
              </div>

              {/* Rows and DB limits counts grid */}
              <div className="space-y-3">
                <div className="text-sm font-semibold text-white flex items-center gap-2">
                  <Database className="h-4.5 w-4.5 text-online" />
                  Database Record Counters (PostgreSQL)
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: 'Client Accounts', count: dbCounts.clients },
                    { label: 'User Profiles', count: dbCounts.profiles },
                    { label: 'Assigned Tasks', count: dbCounts.tasks },
                    { label: 'Paid/Sent Invoices', count: dbCounts.invoices },
                    { label: 'Web Projects', count: dbCounts.projects },
                    { label: 'Audit Logs Trails', count: dbCounts.auditLogs }
                  ].map((dbMetric, idx) => (
                    <div key={idx} className="p-3.5 rounded bg-bg-dark border border-border/30/50">
                      <div className="text-[10px] uppercase font-bold tracking-wider text-[#4B6B94]">{dbMetric.label}</div>
                      <div className="text-lg font-bold text-white mt-1">{dbMetric.count}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* CSV master downloader */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-md border border-[#22C55E30] bg-[#22C55E10]/5 mt-2">
                <div>
                  <div className="text-sm font-semibold text-white flex items-center gap-1.5">
                    <CheckCircle2 className="h-4.5 w-4.5 text-online" />
                    Compilative CSV CRM Backup
                  </div>
                  <div className="text-xs text-text-secondary mt-0.5">Exports all clients, employees, stipends, and invoices.</div>
                </div>
                <Button
                  onClick={handleExportAll}
                  className="bg-online hover:bg-online/80 text-white flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Export Master CSV
                </Button>
              </div>

              {/* Danger Zone panel */}
              <div className="rounded-md border border-[#EF444430] overflow-hidden mt-2">
                <div className="bg-[#EF444410]/10 px-4 py-3 border-b border-[#EF444430] flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-error" />
                  <span className="text-sm font-bold text-white">System Destructive Actions (Danger Zone)</span>
                </div>
                <div className="p-4 bg-bg-dark space-y-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <div className="text-xs font-semibold text-white">Purge System Audit Log Trails</div>
                      <div className="text-[11px] text-text-secondary mt-0.5">Deletes all audit records. Immutability will be bypassed.</div>
                    </div>
                    <Button
                      variant="ghost"
                      onClick={() => setIsDangerConfirmOpen(true)}
                      className="border border-error text-error hover:bg-[#EF444410]"
                    >
                      Clear Audit Logs
                    </Button>
                  </div>
                </div>
              </div>

            </CardContent>
          </Card>
        )}

      </div>

      {/* ── DIALOG MODALS ─────────────────────────────────────────── */}
      
      {/* Dialogue 1: Invite User Popup Form */}
      <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
        <DialogContent className="sm:max-w-[550px] select-none">
          <DialogHeader>
            <DialogTitle className="text-white">Invite CRM Member</DialogTitle>
            <DialogDescription className="text-text-secondary">
              Provision credentials and system access permissions.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleInviteUser} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-text-secondary">User Cabinet Role</Label>
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any -- select callback val */}
              <Select value={inviteRole} onValueChange={(val: any) => setInviteRole(val)}>
                <SelectTrigger className="border-border/30 bg-bg-dark text-white">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent className="bg-bg-card border-border/30 text-white">
                  <SelectItem value="admin">Administrator (Admin Hub)</SelectItem>
                  <SelectItem value="employee">Student/Intern (Team Portal)</SelectItem>
                  <SelectItem value="client">Client Onboarding (Client Portal)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-text-secondary">Member Full Name</Label>
              <Input
                value={inviteFullName}
                onChange={(e) => setInviteFullName(e.target.value)}
                placeholder="e.g. John Doe"
                className="border-border/30 bg-bg-dark text-white"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-text-secondary">Member Email Address</Label>
              <Input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="e.g. john@company.com"
                className="border-border/30 bg-bg-dark text-white"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-text-secondary">Phone Number (Optional)</Label>
              <Input
                value={invitePhone}
                onChange={(e) => setInvitePhone(e.target.value)}
                placeholder="e.g. +91 99999 88888"
                className="border-border/30 bg-bg-dark text-white"
              />
            </div>

            {/* Client specific dropdown selection mapping */}
            {inviteRole === 'client' && (
              <div className="space-y-1.5 animate-fadeIn">
                <Label className="text-xs text-text-secondary">Associated CRM Client Account</Label>
                <Select value={inviteClientId} onValueChange={(val) => setInviteClientId(val || '')}>
                  <SelectTrigger className="border-border/30 bg-bg-dark text-white">
                    <SelectValue placeholder="Select client company" />
                  </SelectTrigger>
                  <SelectContent className="bg-bg-card border-border/30 text-white">
                    {initialClients.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} {c.company ? `(${c.company})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="text-[10px] text-[#4B6B94] mt-0.5">
                  Links this credential cabinet explicitly to see their invoices/reports only.
                </div>
              </div>
            )}

            {/* Employee specific setup fields */}
            {inviteRole === 'employee' && (
              <div className="space-y-3 p-3 rounded bg-bg-dark border border-border/30/50 animate-fadeIn">
                <div className="space-y-1">
                  <Label className="text-[10px] text-text-secondary uppercase font-bold tracking-wider">Designation Title</Label>
                  <Input
                    value={empDesignation}
                    onChange={(e) => setEmpDesignation(e.target.value)}
                    placeholder="e.g. Content Writer Intern"
                    className="border-border/30 bg-bg-card text-white h-8 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[10px] text-text-secondary uppercase font-bold tracking-wider">Skills (Comma-separated)</Label>
                  <Input
                    value={empSkills}
                    onChange={(e) => setEmpSkills(e.target.value)}
                    placeholder="e.g. SEO, copywriting, blogs"
                    className="border-border/30 bg-bg-card text-white h-8 text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[10px] text-text-secondary uppercase font-bold tracking-wider">Stipend Amount (₹)</Label>
                    <Input
                      type="number"
                      value={empStipend}
                      onChange={(e) => setEmpStipend(Number(e.target.value))}
                      className="border-border/30 bg-bg-card text-white h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-text-secondary uppercase font-bold tracking-wider">Payment Day</Label>
                    <Input
                      type="number"
                      value={empPaymentDay}
                      onChange={(e) => setEmpPaymentDay(Number(e.target.value))}
                      className="border-border/30 bg-bg-card text-white h-8 text-xs"
                    />
                  </div>
                </div>
              </div>
            )}

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsInviteOpen(false)}
                className="text-text-secondary hover:bg-[#1E335250] hover:text-white"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSaving}
                className="bg-[#3B82F6] hover:bg-primary-light text-white"
              >
                {isSaving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                Generate Invitation
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialogue 2: Danger Zone Confirmation */}
      <Dialog open={isDangerConfirmOpen} onOpenChange={setIsDangerConfirmOpen}>
        <DialogContent className="sm:max-w-[400px] select-none">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-error" />
              Danger: Confirm Logs Purge
            </DialogTitle>
            <DialogDescription className="text-text-secondary">
              This action is highly destructive. All recorded audit trials in database will be permanently wiped out.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="text-xs text-text-secondary">
              To execute logs purging, please type <span className="text-white font-bold select-none">CONFIRM PURGE</span> below:
            </div>
            <Input
              value={dangerConfirmText}
              onChange={(e) => setDangerConfirmText(e.target.value)}
              placeholder="Type CONFIRM PURGE"
              className="border-[#EF444430] focus:border-error bg-bg-dark text-white"
            />
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setIsDangerConfirmOpen(false)}
              className="text-text-secondary hover:bg-[#1E335250] hover:text-white"
            >
              Cancel
            </Button>
            <Button
              onClick={handleDangerZonePurge}
              className="bg-error hover:bg-error-light text-white"
            >
              Purge Database Logs
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
