'use client';

/* eslint-disable */

import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import {
  FileText,
  AlertTriangle,
  Upload,
  Download,
  Calendar,
  User,
  Plus,
  Trash2,
  Lock,
  Building,
  Users
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { FileUpload } from '@/components/shared/file-upload';
import { DataTable } from '@/components/shared/data-table';
import { Client, Profile } from '@/types';

interface LegalDashboardProps {
  initialContracts: any[] | null;
  clients: Client[] | null;
  employees: Profile[] | null;
}

export function LegalDashboard({
  initialContracts,
  clients,
  employees,
}: LegalDashboardProps) {
  const supabase = createClient();
  const [contracts, setContracts] = useState<any[]>(initialContracts || []);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [partyType, setPartyType] = useState<'client' | 'employee' | 'other'>('client');
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [customPartyName, setCustomPartyName] = useState('');
  const [contractType, setContractType] = useState('client_agreement');
  const [signedDate, setSignedDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [notes, setNotes] = useState('');
  const [uploadedFile, setUploadedFile] = useState<any>(null);

  const fetchContracts = async () => {
    try {
      const { data, error } = await supabase
        .from('contracts')
        .select(`
          *,
          files (
            id,
            name,
            storage_path,
            public_url
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setContracts(data || []);
    } catch {
      toast.error('Failed to reload agreements.');
    }
  };

  const handleUploadComplete = (fileData: any) => {
    setUploadedFile(fileData);
    toast.success(`Contract document '${fileData.name}' uploaded successfully.`);
  };

  const handleSubmitContract = async () => {
    if (!uploadedFile) {
      toast.error('Please upload a signed document first.');
      return;
    }

    let partyName = '';
    let clientId: string | null = null;
    let employeeId: string | null = null;

    if (partyType === 'client') {
      const clientObj = clients?.find((c) => c.id === selectedClientId);
      if (!clientObj) {
        toast.error('Please select a client.');
        return;
      }
      partyName = clientObj.company || clientObj.name;
      clientId = clientObj.id;
    } else if (partyType === 'employee') {
      const empObj = employees?.find((e) => e.id === selectedEmployeeId);
      if (!empObj) {
        toast.error('Please select an employee.');
        return;
      }
      partyName = empObj.full_name;
      employeeId = empObj.id;
    } else {
      if (!customPartyName.trim()) {
        toast.error('Please enter a party name.');
        return;
      }
      partyName = customPartyName;
    }

    setIsSubmitting(true);
    const toastId = toast.loading('Registering contract in legal cabinet...');

    try {
      // 1. Ingest metadata into files table
      const { data: dbFile, error: fileError } = await supabase
        .from('files')
        .insert({
          name: uploadedFile.name,
          original_name: uploadedFile.name,
          mime_type: 'application/pdf',
          size_bytes: uploadedFile.size,
          bucket: 'agency',
          storage_path: `legal/${uploadedFile.name}`,
          public_url: uploadedFile.url,
          department: 'legal',
          client_id: clientId,
          employee_id: employeeId,
          tags: ['contract', 'legal', contractType],
          uploaded_by: (await supabase.auth.getUser()).data.user?.id || null,
        })
        .select('*')
        .single();

      if (fileError) throw fileError;

      // 2. Ingest metadata into contracts table
      const { error: contractError } = await supabase
        .from('contracts')
        .insert({
          type: contractType,
          party_name: partyName,
          client_id: clientId,
          employee_id: employeeId,
          status: expiryDate && new Date(expiryDate).getTime() < Date.now() ? 'expired' : 'signed',
          signed_date: signedDate || null,
          expiry_date: expiryDate || null,
          file_id: dbFile.id,
          notes: notes || null,
        });

      if (contractError) throw contractError;

      toast.success('Contract archived successfully.', { id: toastId });
      setUploadModalOpen(false);
      
      // Reset form state
      setPartyType('client');
      setSelectedClientId('');
      setSelectedEmployeeId('');
      setCustomPartyName('');
      setContractType('client_agreement');
      setSignedDate('');
      setExpiryDate('');
      setNotes('');
      setUploadedFile(null);

      fetchContracts();
    } catch (err: any) {
      toast.error(`Archive failed: ${err.message}`, { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadContract = async (contract: any) => {
    if (!contract.files || !contract.files.storage_path) {
      toast.error('Document file path missing.');
      return;
    }
    try {
      const { data, error } = await supabase.storage
        .from('agency')
        .createSignedUrl(contract.files.storage_path, 3600); // 1 hr link
      if (error) throw error;
      window.open(data.signedUrl, '_blank');
    } catch {
      toast.error('Failed to load contract download link.');
    }
  };

  const handleDeleteContract = async (contract: any, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Are you sure you want to delete contract for '${contract.party_name}'?`)) return;

    try {
      if (contract.files?.storage_path) {
        // Delete from storage
        await supabase.storage.from('agency').remove([contract.files.storage_path]);
      }

      // Delete from contracts table
      const { error: dbError } = await supabase
        .from('contracts')
        .delete()
        .eq('id', contract.id);

      if (dbError) throw dbError;

      // Delete from files table if exists
      if (contract.file_id) {
        await supabase.from('files').delete().eq('id', contract.file_id);
      }

      toast.success('Agreement deleted from legal cabinet.');
      fetchContracts();
    } catch {
      toast.error('Failed to delete agreement.');
    }
  };

  // Expiry Alerts logic: active signed contracts expiring within 30 days
  const expiringContracts = contracts.filter((c) => {
    if (c.status !== 'signed' || !c.expiry_date) return false;
    const daysLeft = Math.ceil((new Date(c.expiry_date).getTime() - Date.now()) / (24 * 3600 * 1000));
    return daysLeft >= 0 && daysLeft <= 30;
  });

  const columns = [
    {
      key: 'party_name',
      header: 'Signing Party',
      render: (val: any, row: any) => {
        let icon = <Building size={14} className="text-[#3B82F6]" />;
        if (row.type === 'nda' || row.type === 'student') {
          icon = <User size={14} className="text-[#F97316]" />;
        } else if (row.type === 'freelancer') {
          icon = <Users size={14} className="text-[#22C55E]" />;
        }
        return (
          <div className="flex items-center gap-2 select-none font-semibold text-[#F0F4FF] text-xs sm:text-sm">
            {icon}
            <span>{row.party_name}</span>
          </div>
        );
      }
    },
    {
      key: 'type',
      header: 'Agreement Type',
      render: (val: any) => {
        let typeLabel = 'Client Contract';
        let color = 'bg-[#3B82F610] text-[#3B82F6] border-[#3B82F620]';
        if (val === 'nda') {
          typeLabel = 'NDA / Confidentiality';
          color = 'bg-[#8B5CF610] text-[#8B5CF6] border-[#8B5CF620]';
        } else if (val === 'freelancer') {
          typeLabel = 'Freelancer Agreement';
          color = 'bg-[#22C55E10] text-[#22C55E] border-[#22C55E20]';
        } else if (val === 'student') {
          typeLabel = 'Student Internship';
          color = 'bg-[#F9731610] text-[#F97316] border-[#F9731620]';
        }
        return (
          <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-semibold border ${color}`}>
            {typeLabel}
          </span>
        );
      }
    },
    {
      key: 'signed_date',
      header: 'Signed On',
      render: (val: any) => val ? new Date(val).toLocaleDateString() : '-'
    },
    {
      key: 'expiry_date',
      header: 'Expiration Date',
      render: (val: any) => {
        if (!val) return 'Indefinite';
        const dateStr = new Date(val).toLocaleDateString();
        const isExp = new Date(val).getTime() < Date.now();
        return (
          <span className={isExp ? 'text-[#EF4444] font-semibold' : ''}>
            {dateStr} {isExp && '(Expired)'}
          </span>
        );
      }
    },
    {
      key: 'status',
      header: 'Status Badge',
      render: (val: any, row: any) => {
        const isExpired = row.expiry_date && new Date(row.expiry_date).getTime() < Date.now();
        const status = isExpired ? 'expired' : val;
        let badgeColor = 'bg-[#22C55E15] text-[#22C55E] border-[#22C55E20]';
        let label = 'Active Signed';

        if (status === 'draft') {
          badgeColor = 'bg-[#1E335220] text-[#8BA3C7] border-[#1E335230]';
          label = 'Draft';
        } else if (status === 'expired') {
          badgeColor = 'bg-[#EF444415] text-[#EF4444] border-[#EF444420]';
          label = 'Expired';
        } else if (status === 'sent') {
          badgeColor = 'bg-[#F59E0B15] text-[#F59E0B] border-[#F59E0B20]';
          label = 'Out for Signature';
        }

        return (
          <span className={`inline-flex px-1.5 py-0.5 rounded-full text-[10px] font-semibold border ${badgeColor}`}>
            {label}
          </span>
        );
      }
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (val: any, row: any) => (
        <div className="flex items-center gap-2 select-none">
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleDownloadContract(row)}
            className="bg-[#132035] hover:bg-[#1A2D47] border border-[#1E3352] text-[#8BA3C7] hover:text-[#F0F4FF] text-[11px] h-7 px-2"
          >
            <Download size={11} className="mr-1" />
            <span>Fetch PDF</span>
          </Button>
          <Button
            size="sm"
            onClick={(e) => handleDeleteContract(row, e)}
            className="bg-[#EF444415] hover:bg-[#EF444430] border border-[#EF444420] text-[#EF4444] text-[11px] h-7 px-2 cursor-pointer"
          >
            <Trash2 size={11} />
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6 select-none">
      {/* ━━━ EXPIRY ALERT BANNER ━━━ */}
      {expiringContracts.length > 0 && (
        <div className="rounded-lg border border-[#EF444430] bg-[#EF44440c] p-4 flex gap-3 text-xs select-none">
          <AlertTriangle size={18} className="text-[#EF4444] shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-semibold text-[#F0F4FF]">Contract Expiry Warnings ({expiringContracts.length})</h4>
            <p className="text-[#8BA3C7] leading-relaxed">
              The following signed agreements are scheduled to expire within the next 30 days. Review terms or prepare renewal schedules immediately.
            </p>
            <ul className="list-disc pl-4 space-y-0.5 text-[#F0F4FF] mt-2 font-semibold">
              {expiringContracts.map((c) => {
                const days = Math.ceil((new Date(c.expiry_date).getTime() - Date.now()) / (24 * 3600 * 1000));
                return (
                  <li key={c.id}>
                    {c.party_name} — {c.type === 'client_agreement' ? 'Client retainer agreement' : 'HR/Vendor agreement'} (expires in {days} days on {new Date(c.expiry_date).toLocaleDateString()})
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}

      {/* ━━━ HEADER SECTION ━━━ */}
      <div className="flex items-center justify-between border-b border-[#1E3352]/40 pb-2 select-none">
        <div>
          <h2 className="text-base font-semibold text-[#F0F4FF] flex items-center gap-1.5">
            <Lock size={16} className="text-[#3B82F6]" />
            <span>Signed Agreements Cabinet</span>
          </h2>
          <p className="text-xs text-[#8BA3C7] mt-0.5">Secure custody of client contracts, student non-disclosure agreements, and freelancer retainers.</p>
        </div>
        <Button
          onClick={() => setUploadModalOpen(true)}
          size="sm"
          className="bg-[#1B4FD8] hover:bg-[#2563EB] text-white text-xs h-9 gap-1.5 font-semibold cursor-pointer"
        >
          <Upload size={13} />
          <span>Upload Signed Contract</span>
        </Button>
      </div>

      <div className="w-full">
        <DataTable
          columns={columns}
          data={contracts}
          onRowClick={handleDownloadContract}
          emptyState={{
            icon: FileText,
            title: 'No Agreements Registered',
            description: 'Archiving a signed agreement logs it here and checks for expiries automatically.',
            actionLabel: 'Archive First Contract',
            onAction: () => setUploadModalOpen(true)
          }}
        />
      </div>

      {/* ━━━ MODAL: ARCHIVE SIGNED CONTRACT ━━━ */}
      <Dialog open={uploadModalOpen} onOpenChange={setUploadModalOpen}>
        <DialogContent className="bg-[#0D1829] border border-[#1E3352] text-[#F0F4FF] max-w-lg select-none">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-[#F0F4FF]">Archive Signed Agreement</DialogTitle>
            <DialogDescription className="text-xs text-[#8BA3C7]">
              Select a signed PDF contract, NDA, or vendor agreement to securely register in the legal cabinet.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4 my-2 text-xs">
            <div className="space-y-1">
              <label className="label">Signing Party Category *</label>
              <select
                value={partyType}
                onChange={(e: any) => setPartyType(e.target.value)}
                className="input h-9"
              >
                <option value="client">Paying Client</option>
                <option value="employee">Student / Intern</option>
                <option value="other">Other Vendor / Specialty Party</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="label">Agreement Type *</label>
              <select
                value={contractType}
                onChange={(e) => setContractType(e.target.value)}
                className="input h-9"
              >
                <option value="client_agreement">Client Service Retainer Contract</option>
                <option value="nda">Non-Disclosure Agreement (NDA)</option>
                <option value="freelancer">Outsourced Freelancer Agreement</option>
                <option value="student">Student Internship Agreement</option>
              </select>
            </div>

            {partyType === 'client' && (
              <div className="col-span-2 space-y-1">
                <label className="label">Select Client *</label>
                <select
                  value={selectedClientId}
                  onChange={(e) => setSelectedClientId(e.target.value)}
                  className="input h-9"
                >
                  <option value="">Choose Client...</option>
                  {clients?.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.company ? `${c.company} (${c.name})` : c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {partyType === 'employee' && (
              <div className="col-span-2 space-y-1">
                <label className="label">Select Employee Profile *</label>
                <select
                  value={selectedEmployeeId}
                  onChange={(e) => setSelectedEmployeeId(e.target.value)}
                  className="input h-9"
                >
                  <option value="">Choose Profile...</option>
                  {employees?.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.full_name} ({(emp as any).designation || 'Intern'})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {partyType === 'other' && (
              <div className="col-span-2 space-y-1">
                <label className="label">Signing Party Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Hostinger, AWS, External Consultant"
                  value={customPartyName}
                  onChange={(e) => setCustomPartyName(e.target.value)}
                  className="input h-9"
                />
              </div>
            )}

            <div className="space-y-1">
              <label className="label">Execution Signed Date</label>
              <input
                type="date"
                value={signedDate}
                onChange={(e) => setSignedDate(e.target.value)}
                className="input h-9"
              />
            </div>

            <div className="space-y-1">
              <label className="label">Agreement Expiration Date</label>
              <input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="input h-9"
              />
            </div>

            <div className="col-span-2 space-y-1">
              <label className="label">Brief Audit Notes / Conditions</label>
              <textarea
                placeholder="Enter specialized retainers terms, stipulations, or remarks..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="input resize-none"
              />
            </div>

            <div className="col-span-2 space-y-1 pt-2">
              <label className="label">Signed Document Upload *</label>
              <FileUpload
                bucket="agency"
                storagePath="legal"
                accept="application/pdf"
                onUpload={handleUploadComplete}
              />
              {uploadedFile && (
                <div className="text-[10px] text-[#22C55E] font-semibold mt-1">
                  ✓ File uploaded: {uploadedFile.name}
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => setUploadModalOpen(false)}
              className="bg-transparent border-[#1E3352] text-[#8BA3C7] hover:bg-[#132035] hover:text-[#F0F4FF] cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitContract}
              disabled={isSubmitting || !uploadedFile}
              className="bg-[#1B4FD8] hover:bg-[#2563EB] text-white cursor-pointer"
            >
              {isSubmitting ? 'Registering...' : 'Archive Agreement'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
export default LegalDashboard;
