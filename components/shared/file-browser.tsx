'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Folder,
  File,
  FileText,
  FileImage,
  FileSpreadsheet,
  Video,
  Music,
  Archive,
  Search,
  Grid,
  List,
  Upload,
  Download,
  Share2,
  Trash2,
  ChevronRight,
  Eye,
  Info,
  CheckCircle,
  ExternalLink,
  ChevronDown
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { FileUpload } from '@/components/shared/file-upload';
import { formatBytes, formatDate } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Client, FileRecord } from '@/types';

// Extend FileRecord type to include the joined profile name from page.tsx fetch
type FileRecordWithProfile = FileRecord & {
  profiles?: {
    full_name: string;
  } | null;
};

interface FileBrowserProps {
  initialClients: Client[];
  initialFiles: FileRecordWithProfile[];
}

export function FileBrowser({
  initialClients,
  initialFiles,
}: FileBrowserProps) {
  const router = useRouter();

  // Navigation state
  const [activeCategory, setActiveCategory] = useState<'all' | 'client' | 'department'>('all');
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [selectedDept, setSelectedDept] = useState<string | null>(null);

  // Layout & UI state
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals state
  const [uploadOpen, setUploadOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<FileRecordWithProfile | null>(null);
  const [deleteFile, setDeleteFile] = useState<FileRecordWithProfile | null>(null);

  // Upload Form details
  const [uploadTarget, setUploadTarget] = useState({
    bucket: 'agency',
    clientId: '',
    department: '',
    tags: '',
    description: '',
  });

  // Collapsible tree navigation states
  const [clientsCollapsed, setClientsCollapsed] = useState(false);
  const [deptsCollapsed, setDeptsCollapsed] = useState(false);

  // Departments List
  const departments = [
    { key: 'seo', name: 'SEO Department' },
    { key: 'social', name: 'Social Media' },
    { key: 'google_ads', name: 'Google Ads' },
    { key: 'meta_ads', name: 'Meta Ads' },
    { key: 'content', name: 'Content Marketing' },
    { key: 'finance', name: 'Finance & Accounts' },
    { key: 'hr', name: 'HR & Team' },
    { key: 'legal', name: 'Legal & Contracts' },
    { key: 'web', name: 'Web Design & Dev' },
  ];

  // Helper to resolve appropriate icon based on mime type
  const getFileIcon = (mimeType: string | null, name: string) => {
    const type = mimeType?.toLowerCase() || '';
    const ext = name.split('.').pop()?.toLowerCase() || '';

    if (type.startsWith('image/') || ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].includes(ext)) {
      return <FileImage className="text-[#38BDF8]" size={20} />;
    }
    if (type === 'application/pdf' || ext === 'pdf') {
      return <FileText className="text-[#F87171]" size={20} />;
    }
    if (
      type.includes('spreadsheet') ||
      type.includes('excel') ||
      type.includes('csv') ||
      ['xlsx', 'xls', 'csv'].includes(ext)
    ) {
      return <FileSpreadsheet className="text-[#34D399]" size={20} />;
    }
    if (type.startsWith('video/') || ['mp4', 'mov', 'avi', 'mkv'].includes(ext)) {
      return <Video className="text-[#A78BFA]" size={20} />;
    }
    if (type.startsWith('audio/') || ['mp3', 'wav', 'aac'].includes(ext)) {
      return <Music className="text-[#F472B6]" size={20} />;
    }
    if (
      type.includes('zip') ||
      type.includes('compressed') ||
      type.includes('tar') ||
      ['zip', 'rar', '7z', 'gz'].includes(ext)
    ) {
      return <Archive className="text-[#FBBF24]" size={20} />;
    }
    return <File className="text-[#94A3B8]" size={20} />;
  };

  // Toggle Sharing state with backend API
  const handleToggleShare = async (file: FileRecordWithProfile) => {
    const toastId = toast.loading('Updating file sharing status...');
    try {
      const res = await fetch(`/api/files/share/${file.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shared: !file.is_shared_with_client }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to update share status');
      }
      toast.success(
        file.is_shared_with_client
          ? 'File hidden from Client Portal.'
          : 'File shared with Client Portal!',
        { id: toastId }
      );
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Sharing update failed';
      toast.error(msg, { id: toastId });
    }
  };

  // Perform delete operation
  const handleDeleteConfirm = async () => {
    if (!deleteFile) return;
    const toastId = toast.loading('Deleting file...');
    try {
      const res = await fetch(`/api/files/delete/${deleteFile.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to delete file');
      }
      toast.success('File deleted successfully.', { id: toastId });
      setDeleteFile(null);
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Deletion failed';
      toast.error(msg, { id: toastId });
    }
  };

  // Filter files based on category, sub-folder selections, and search query
  const filteredFiles = initialFiles.filter((file) => {
    // 1. Category check
    if (activeCategory === 'client') {
      if (file.client_id !== selectedClientId) return false;
    } else if (activeCategory === 'department') {
      if (file.department !== selectedDept) return false;
    }

    // 2. Search query check (name, tags, description)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const nameMatch = file.name.toLowerCase().includes(query);
      const tagMatch = file.tags?.some((t) => t.toLowerCase().includes(query)) || false;
      const descMatch = file.description?.toLowerCase().includes(query) || false;
      return nameMatch || tagMatch || descMatch;
    }

    return true;
  });

  // Calculate stats
  const totalFilesSize = filteredFiles.reduce((sum, f) => sum + Number(f.size_bytes || 0), 0);
  const sharedCount = filteredFiles.filter((f) => f.is_shared_with_client).length;

  // Open upload modal configured with current category pre-fills
  const openUploadModal = () => {
    const isSelfClient = activeCategory === 'client' && selectedClientId
      ? initialClients.find((c) => c.id === selectedClientId)?.is_agency_self
      : false;

    setUploadTarget({
      bucket: activeCategory === 'client' ? 'clients' : isSelfClient ? 'agency' : 'agency',
      clientId: activeCategory === 'client' && selectedClientId ? selectedClientId : '',
      department: activeCategory === 'department' && selectedDept ? selectedDept : '',
      tags: '',
      description: '',
    });
    setUploadOpen(true);
  };

  // Determine path for File Upload component
  const getUploadStoragePath = () => {
    const datePrefix = new Date().getFullYear();
    if (uploadTarget.bucket === 'clients' && uploadTarget.clientId) {
      return `clients/${uploadTarget.clientId}/${uploadTarget.department || 'general'}`;
    }
    if (uploadTarget.bucket === 'employees') {
      return `employees/general`;
    }
    return `agency/${uploadTarget.department || 'general'}/${datePrefix}`;
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 min-h-[600px] select-none">
      {/* ─── SIDEBAR NAVIGATION TREE ─── */}
      <div className="w-full lg:w-[260px] shrink-0 bg-[#0D1829] border border-[#1E3352] rounded-[10px] p-4 flex flex-col space-y-5 h-fit">
        {/* Category: All Files */}
        <button
          onClick={() => {
            setActiveCategory('all');
            setSelectedClientId(null);
            setSelectedDept(null);
          }}
          className={`flex items-center gap-3 w-full px-3 py-2 rounded-[7px] text-xs font-semibold border transition-all cursor-pointer ${
            activeCategory === 'all'
              ? 'bg-[#1B4FD8] border-[#1B4FD8] text-white font-bold'
              : 'bg-[#132035]/30 border-transparent text-[#8BA3C7] hover:bg-[#132035]/60 hover:text-[#F0F4FF]'
          }`}
        >
          <Folder size={15} />
          <span>All Agency Files</span>
        </button>

        {/* Section: By Client */}
        <div className="space-y-1">
          <button
            onClick={() => setClientsCollapsed(!clientsCollapsed)}
            className="flex items-center justify-between w-full px-2 py-1 text-[10px] font-bold text-[#4A6480] uppercase tracking-wider hover:text-[#F0F4FF] cursor-pointer"
          >
            <span>By Client</span>
            {clientsCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
          </button>

          {!clientsCollapsed && (
            <div className="space-y-0.5 pl-2 max-h-[220px] overflow-y-auto pr-1">
              {initialClients.map((client) => (
                <button
                  key={client.id}
                  onClick={() => {
                    setActiveCategory('client');
                    setSelectedClientId(client.id);
                    setSelectedDept(null);
                  }}
                  className={`flex items-center gap-2 w-full text-left px-2.5 py-1.5 rounded-[5px] text-[11px] font-medium transition-all truncate cursor-pointer ${
                    activeCategory === 'client' && selectedClientId === client.id
                      ? 'bg-[#1B4FD8]/20 border border-[#1B4FD8]/40 text-[#4D90FE] font-semibold'
                      : 'border border-transparent text-[#8BA3C7] hover:bg-[#132035] hover:text-[#F0F4FF]'
                  }`}
                >
                  <Folder size={11} className="shrink-0" />
                  <span className="truncate">{client.name}</span>
                  {client.is_agency_self && (
                    <span className="text-[8px] bg-[#F97316]/10 text-[#F97316] px-1 py-0.2 rounded font-bold uppercase ml-auto scale-90 shrink-0">
                      Agency
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Section: By Department */}
        <div className="space-y-1">
          <button
            onClick={() => setDeptsCollapsed(!deptsCollapsed)}
            className="flex items-center justify-between w-full px-2 py-1 text-[10px] font-bold text-[#4A6480] uppercase tracking-wider hover:text-[#F0F4FF] cursor-pointer"
          >
            <span>By Department</span>
            {deptsCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
          </button>

          {!deptsCollapsed && (
            <div className="space-y-0.5 pl-2">
              {departments.map((dept) => (
                <button
                  key={dept.key}
                  onClick={() => {
                    setActiveCategory('department');
                    setSelectedDept(dept.key);
                    setSelectedClientId(null);
                  }}
                  className={`flex items-center gap-2 w-full text-left px-2.5 py-1.5 rounded-[5px] text-[11px] font-medium transition-all truncate cursor-pointer ${
                    activeCategory === 'department' && selectedDept === dept.key
                      ? 'bg-[#1B4FD8]/20 border border-[#1B4FD8]/40 text-[#4D90FE] font-semibold'
                      : 'border border-transparent text-[#8BA3C7] hover:bg-[#132035] hover:text-[#F0F4FF]'
                  }`}
                >
                  <Folder size={11} className="shrink-0" />
                  <span className="truncate">{dept.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ─── MAIN FILE EXPLORER AREA ─── */}
      <div className="flex-1 space-y-4">
        {/* Navigation & Toolbar Header */}
        <div className="bg-[#0D1829] border border-[#1E3352] rounded-[10px] p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Active Folder Path */}
          <div className="text-xs">
            <span className="text-[#4A6480] font-semibold">Root</span>
            <span className="text-[#4A6480] mx-1.5">/</span>
            {activeCategory === 'all' && <span className="text-[#F0F4FF] font-bold">All Agency Files</span>}
            {activeCategory === 'client' && (
              <>
                <span className="text-[#8BA3C7]">Clients</span>
                <span className="text-[#4A6480] mx-1.5">/</span>
                <span className="text-[#F0F4FF] font-bold">
                  {initialClients.find((c) => c.id === selectedClientId)?.name || 'Unknown Client'}
                </span>
              </>
            )}
            {activeCategory === 'department' && (
              <>
                <span className="text-[#8BA3C7]">Departments</span>
                <span className="text-[#4A6480] mx-1.5">/</span>
                <span className="text-[#F0F4FF] font-bold">
                  {departments.find((d) => d.key === selectedDept)?.name || 'Unknown'}
                </span>
              </>
            )}
            <span className="ml-2 text-[10px] text-[#8BA3C7] bg-[#132035] border border-[#1E3352] px-2 py-0.5 rounded-full font-bold">
              {filteredFiles.length} {filteredFiles.length === 1 ? 'file' : 'files'}
            </span>
          </div>

          {/* Action Tools */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Search Input */}
            <div className="relative w-full sm:w-[220px]">
              <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-[#4A6480]" />
              <input
                type="text"
                placeholder="Search file name/tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input pl-8 pr-3 h-8 text-[11px] w-full"
              />
            </div>

            {/* View switcher Grid/List */}
            <div className="flex items-center bg-[#132035] border border-[#1E3352] rounded p-0.5">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1 rounded-[3px] transition-colors cursor-pointer ${
                  viewMode === 'grid' ? 'bg-[#1B4FD8] text-white' : 'text-[#8BA3C7] hover:text-[#F0F4FF]'
                }`}
                title="Grid view"
              >
                <Grid size={13} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1 rounded-[3px] transition-colors cursor-pointer ${
                  viewMode === 'list' ? 'bg-[#1B4FD8] text-white' : 'text-[#8BA3C7] hover:text-[#F0F4FF]'
                }`}
                title="List view"
              >
                <List size={13} />
              </button>
            </div>

            {/* Upload Button */}
            <Button
              onClick={openUploadModal}
              size="sm"
              className="bg-[#1B4FD8] hover:bg-[#2563EB] text-white text-[11px] h-8 gap-1.5 cursor-pointer font-bold transition-all"
            >
              <Upload size={13} />
              <span>Upload</span>
            </Button>
          </div>
        </div>

        {/* Stats Strip */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-[#0D1829] border border-[#1E3352] rounded-[8px] p-3 flex items-center justify-between">
            <div>
              <span className="text-[9px] text-[#4A6480] uppercase tracking-wider block font-bold">Total Files</span>
              <span className="font-bold text-sm text-[#F0F4FF] font-mono mt-0.5">{filteredFiles.length}</span>
            </div>
            <Folder size={18} className="text-[#1B4FD8] opacity-60" />
          </div>
          <div className="bg-[#0D1829] border border-[#1E3352] rounded-[8px] p-3 flex items-center justify-between">
            <div>
              <span className="text-[9px] text-[#4A6480] uppercase tracking-wider block font-bold">Space Occupied</span>
              <span className="font-bold text-sm text-[#F97316] font-mono mt-0.5">{formatBytes(totalFilesSize)}</span>
            </div>
            <Info size={18} className="text-[#F97316] opacity-60" />
          </div>
          <div className="bg-[#0D1829] border border-[#1E3352] rounded-[8px] p-3 flex items-center justify-between">
            <div>
              <span className="text-[9px] text-[#4A6480] uppercase tracking-wider block font-bold">Client Shared</span>
              <span className="font-bold text-sm text-[#22C55E] font-mono mt-0.5">{sharedCount}</span>
            </div>
            <CheckCircle size={18} className="text-[#22C55E] opacity-60" />
          </div>
        </div>

        {/* Files display Grid or List container */}
        {filteredFiles.length > 0 ? (
          viewMode === 'grid' ? (
            /* GRID VIEW */
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredFiles.map((file) => {
                const isImg = file.mime_type?.startsWith('image/') || 
                  ['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(file.name.split('.').pop()?.toLowerCase() || '');
                return (
                  <div
                    key={file.id}
                    className="bg-[#0D1829] border border-[#1E3352] rounded-[8px] p-4 flex flex-col justify-between hover:border-[#1A2D47] transition-all relative group h-[190px]"
                  >
                    {/* Top line metadata */}
                    <div className="flex items-start justify-between">
                      {/* Icon / Thumbnail */}
                      {isImg && file.public_url ? (
                        <div className="h-10 w-10 rounded border border-[#1E3352] overflow-hidden bg-[#060D1A] flex items-center justify-center">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={file.public_url}
                            alt={file.name}
                            className="object-cover h-full w-full"
                          />
                        </div>
                      ) : (
                        <div className="h-10 w-10 rounded bg-[#132035]/60 border border-[#1E3352]/50 flex items-center justify-center shrink-0">
                          {getFileIcon(file.mime_type, file.name)}
                        </div>
                      )}

                      {/* Top actions */}
                      <div className="flex items-center gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                        {file.public_url && (
                          <button
                            onClick={() => setPreviewFile(file)}
                            className="p-1 rounded hover:bg-[#132035] text-[#8BA3C7] hover:text-[#F0F4FF] cursor-pointer"
                            title="Preview file"
                          >
                            <Eye size={12} />
                          </button>
                        )}
                        <a
                          href={file.public_url || '#'}
                          download={file.name}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1 rounded hover:bg-[#132035] text-[#8BA3C7] hover:text-[#F0F4FF] cursor-pointer"
                          title="Download file"
                        >
                          <Download size={12} />
                        </a>
                        <button
                          onClick={() => setDeleteFile(file)}
                          className="p-1 rounded hover:bg-[#EF444415] text-[#8BA3C7] hover:text-[#EF4444] cursor-pointer"
                          title="Delete file"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>

                    {/* Middle info */}
                    <div className="mt-3 min-w-0">
                      <p
                        className="font-bold text-xs text-[#F0F4FF] truncate"
                        title={file.name}
                      >
                        {file.name}
                      </p>
                      <p className="text-[9px] text-[#4A6480] mt-0.5 font-mono">
                        {formatBytes(file.size_bytes)} • {formatDate(file.created_at)}
                      </p>
                      {file.description && (
                        <p className="text-[10px] text-[#8BA3C7] mt-1 line-clamp-1 italic">
                          {file.description}
                        </p>
                      )}
                    </div>

                    {/* Bottom Metadata & sharing controls */}
                    <div className="pt-2 border-t border-[#1E3352]/30 mt-3 flex items-center justify-between text-[9px] font-mono text-[#8BA3C7]">
                      <span>By: {file.profiles?.full_name || 'System'}</span>
                      {file.bucket === 'clients' && (
                        <button
                          onClick={() => handleToggleShare(file)}
                          className={`px-1.5 py-0.5 rounded-[3px] font-bold uppercase transition-colors cursor-pointer ${
                            file.is_shared_with_client
                              ? 'bg-[#22C55E15] text-[#22C55E] border border-[#22C55E30]'
                              : 'bg-[#132035] text-[#4A6480] border border-[#1E3352] hover:text-[#F0F4FF]'
                          }`}
                        >
                          {file.is_shared_with_client ? 'Shared' : 'Private'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* LIST VIEW */
            <div className="bg-[#0D1829] border border-[#1E3352] rounded-[10px] overflow-hidden select-none">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#1E3352] bg-[#132035]/30 text-[10px] font-bold text-[#4A6480] uppercase tracking-wider">
                    <th className="p-3 pl-4">Name</th>
                    <th className="p-3">Size</th>
                    <th className="p-3">Uploaded Date</th>
                    <th className="p-3">Uploaded By</th>
                    <th className="p-3 text-right pr-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1E3352]/30 text-xs">
                  {filteredFiles.map((file) => (
                    <tr
                      key={file.id}
                      className="hover:bg-[#132035]/30 text-[#8BA3C7] group"
                    >
                      <td className="p-3 pl-4 font-semibold text-[#F0F4FF] max-w-[200px] truncate">
                        <div className="flex items-center gap-2">
                          {getFileIcon(file.mime_type, file.name)}
                          <span className="truncate" title={file.name}>{file.name}</span>
                        </div>
                      </td>
                      <td className="p-3 font-mono text-[10px]">{formatBytes(file.size_bytes)}</td>
                      <td className="p-3 font-mono text-[10px]">{formatDate(file.created_at)}</td>
                      <td className="p-3">{file.profiles?.full_name || 'System'}</td>
                      <td className="p-3 text-right pr-4">
                        <div className="flex items-center justify-end gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                          {file.public_url && (
                            <button
                              onClick={() => setPreviewFile(file)}
                              className="p-1 rounded hover:bg-[#132035] text-[#8BA3C7] hover:text-[#F0F4FF] cursor-pointer"
                              title="Preview"
                            >
                              <Eye size={12} />
                            </button>
                          )}
                          <a
                            href={file.public_url || '#'}
                            download={file.name}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1 rounded hover:bg-[#132035] text-[#8BA3C7] hover:text-[#F0F4FF] cursor-pointer"
                            title="Download"
                          >
                            <Download size={12} />
                          </a>
                          {file.bucket === 'clients' && (
                            <button
                              onClick={() => handleToggleShare(file)}
                              className={`p-1 rounded hover:bg-[#132035] cursor-pointer ${
                                file.is_shared_with_client ? 'text-[#22C55E]' : 'text-[#4A6480]'
                              }`}
                              title={file.is_shared_with_client ? 'Make Private' : 'Share with Client'}
                            >
                              <Share2 size={12} />
                            </button>
                          )}
                          <button
                            onClick={() => setDeleteFile(file)}
                            className="p-1 rounded hover:bg-[#EF444415] text-[#8BA3C7] hover:text-[#EF4444] cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          /* EMPTY STATE */
          <div className="bg-[#0D1829] border border-[#1E3352] border-dashed rounded-[10px] p-12 text-center text-[#4A6480] space-y-2 select-none">
            <Folder size={32} className="mx-auto text-[#1E3352]" />
            <p className="font-bold text-sm text-[#8BA3C7]">No files found</p>
            <p className="text-xs max-w-xs mx-auto">
              There are no documents uploaded under this category yet, or nothing matches your current search.
            </p>
            <Button
              onClick={openUploadModal}
              size="sm"
              className="bg-[#1B4FD8]/15 border border-[#1E3352] hover:bg-[#1B4FD8] hover:text-white text-[#4D90FE] text-xs mt-3 cursor-pointer"
            >
              Upload First File
            </Button>
          </div>
        )}
      </div>

      {/* ─── MODAL: UPLOAD FILE ─── */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="bg-[#0D1829] border border-[#1E3352] text-[#F0F4FF] max-w-md select-none">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-[#F0F4FF]">Upload File to Vault</DialogTitle>
            <DialogDescription className="text-xs text-[#8BA3C7]">
              Specify document metadata and select the target folder.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 my-3 text-xs">
            <div className="grid grid-cols-2 gap-3">
              {/* Target Vault Bucket */}
              <div className="space-y-1">
                <label className="label">Storage Vault *</label>
                <select
                  value={uploadTarget.bucket}
                  onChange={(e) =>
                    setUploadTarget((p) => ({
                      ...p,
                      bucket: e.target.value,
                      clientId: e.target.value !== 'clients' ? '' : p.clientId,
                    }))
                  }
                  className="input h-9"
                  required
                >
                  <option value="agency">Agency Brand/Internal</option>
                  <option value="clients">Clients Vault</option>
                  <option value="employees">Employees Vault</option>
                </select>
              </div>

              {/* Department Tagging */}
              <div className="space-y-1">
                <label className="label">Department Tag</label>
                <select
                  value={uploadTarget.department}
                  onChange={(e) => setUploadTarget((p) => ({ ...p, department: e.target.value }))}
                  className="input h-9"
                >
                  <option value="">-- No Department --</option>
                  {departments.map((d) => (
                    <option key={d.key} value={d.key}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Conditionally show Client dropdown */}
            {uploadTarget.bucket === 'clients' && (
              <div className="space-y-1">
                <label className="label">Select Client *</label>
                <select
                  value={uploadTarget.clientId}
                  onChange={(e) => setUploadTarget((p) => ({ ...p, clientId: e.target.value }))}
                  className="input h-9"
                  required
                >
                  <option value="">-- Choose Client --</option>
                  {initialClients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              {/* Tags input */}
              <div className="col-span-2 space-y-1">
                <label className="label">Search Tags (comma separated)</label>
                <input
                  type="text"
                  placeholder="e.g. invoice, report, seo"
                  value={uploadTarget.tags}
                  onChange={(e) => setUploadTarget((p) => ({ ...p, tags: e.target.value }))}
                  className="input h-9"
                />
              </div>

              {/* Description */}
              <div className="col-span-2 space-y-1">
                <label className="label">Brief Description</label>
                <input
                  type="text"
                  placeholder="Brief note about what this file is..."
                  value={uploadTarget.description}
                  onChange={(e) => setUploadTarget((p) => ({ ...p, description: e.target.value }))}
                  className="input h-9"
                />
              </div>
            </div>

            {/* File Drag-and-drop Component */}
            <div className="pt-2 border-t border-[#1E3352]/30">
              <FileUpload
                bucket={uploadTarget.bucket}
                storagePath={getUploadStoragePath()}
                clientId={uploadTarget.bucket === 'clients' ? uploadTarget.clientId : undefined}
                department={uploadTarget.department || undefined}
                tags={uploadTarget.tags ? uploadTarget.tags.split(',').map((t) => t.trim()).filter(Boolean) : []}
                onUpload={() => {
                  toast.success('File uploaded successfully!');
                  setUploadOpen(false);
                  router.refresh();
                }}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setUploadOpen(false)}
              className="bg-transparent border-[#1E3352] text-[#8BA3C7] hover:bg-[#132035] hover:text-[#F0F4FF] cursor-pointer"
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL: PREVIEW FILE LIGHTBOX ─── */}
      <Dialog open={previewFile !== null} onOpenChange={(open) => !open && setPreviewFile(null)}>
        <DialogContent className="bg-[#0D1829] border border-[#1E3352] text-[#F0F4FF] max-w-3xl select-none max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-[#F0F4FF] truncate flex items-center justify-between pr-6">
              <span>{previewFile?.name}</span>
              {previewFile?.public_url && (
                <a
                  href={previewFile.public_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[10px] text-[#4D90FE] hover:underline flex items-center gap-1 font-semibold ml-4"
                >
                  <span>Open in tab</span>
                  <ExternalLink size={10} />
                </a>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col items-center justify-center p-2 bg-[#060D1A] rounded border border-[#1E3352]/40 min-h-[250px]">
            {previewFile?.public_url ? (
              previewFile.mime_type?.startsWith('image/') || 
              ['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(previewFile.name.split('.').pop()?.toLowerCase() || '') ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewFile.public_url}
                    alt={previewFile.name}
                    className="max-h-[50vh] object-contain rounded"
                  />
                </>
              ) : previewFile.mime_type === 'application/pdf' || previewFile.name.endsWith('.pdf') ? (
                <iframe
                  src={previewFile.public_url}
                  className="w-full h-[55vh] rounded"
                  title="PDF Preview"
                />
              ) : (
                <div className="text-center p-8 space-y-3">
                  <div className="h-16 w-16 rounded-full bg-[#132035]/60 border border-[#1E3352] flex items-center justify-center mx-auto text-[#8BA3C7]">
                    {getFileIcon(previewFile.mime_type, previewFile.name)}
                  </div>
                  <p className="text-xs text-[#8BA3C7]">Preview not available for this file type.</p>
                  <a
                    href={previewFile.public_url}
                    download
                    className="inline-flex items-center gap-1 text-[11px] bg-[#1B4FD8] hover:bg-[#2563EB] text-white px-3 py-1.5 rounded font-bold transition-all cursor-pointer"
                  >
                    <Download size={12} />
                    <span>Download File</span>
                  </a>
                </div>
              )
            ) : null}
          </div>

          <DialogFooter className="sm:justify-between text-[10px] font-mono text-[#8BA3C7] items-center border-t border-[#1E3352]/20 pt-3">
            <span>Size: {previewFile ? formatBytes(previewFile.size_bytes) : '-'}</span>
            <span>Uploaded: {previewFile ? formatDate(previewFile.created_at) : '-'}</span>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── DIALOG: DELETE CONFIRMATION ─── */}
      <Dialog open={deleteFile !== null} onOpenChange={(open) => !open && setDeleteFile(null)}>
        <DialogContent className="bg-[#0D1829] border border-[#1E3352] text-[#F0F4FF] max-w-sm select-none">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-[#EF4444]">Confirm File Deletion</DialogTitle>
          </DialogHeader>

          <p className="text-xs text-[#8BA3C7] my-3 leading-relaxed">
            Are you sure you want to permanently delete <strong className="text-[#F0F4FF]">{deleteFile?.name}</strong>?
            This will remove the file metadata and permanently delete the physical asset from storage. This action is irreversible.
          </p>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteFile(null)}
              className="bg-transparent border-[#1E3352] text-[#8BA3C7] hover:bg-[#132035] hover:text-[#F0F4FF] cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeleteConfirm}
              className="bg-[#EF4444] hover:bg-[#DC2626] text-white cursor-pointer font-semibold"
            >
              Delete File
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
export default FileBrowser;
