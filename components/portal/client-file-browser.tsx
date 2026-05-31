'use client';

import React, { useState } from 'react';
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
  Download,
  Eye,
  ExternalLink,
} from 'lucide-react';
import { formatBytes, formatDate } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface FileRecord {
  id: string;
  name: string;
  mime_type: string | null;
  size_bytes: number | null;
  bucket: string;
  storage_path: string;
  public_url: string | null;
  department: string | null;
  created_at: string;
  tags: string[];
  description: string | null;
}

interface ClientFileBrowserProps {
  files: FileRecord[];
}

export function ClientFileBrowser({ files }: ClientFileBrowserProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [previewFile, setPreviewFile] = useState<FileRecord | null>(null);
  const [selectedDept, setSelectedDept] = useState<string>('all');

  const departments = [
    { key: 'all', name: 'All Departments' },
    { key: 'seo', name: 'SEO & Search' },
    { key: 'social', name: 'Social Media' },
    { key: 'google_ads', name: 'Google Ads' },
    { key: 'meta_ads', name: 'Meta Ads' },
    { key: 'content', name: 'Content Marketing' },
    { key: 'finance', name: 'Billing & Invoices' },
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

  // Filter files based on department and search query
  const filteredFiles = files.filter((file) => {
    if (selectedDept !== 'all' && file.department !== selectedDept) {
      return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const nameMatch = file.name.toLowerCase().includes(q);
      const tagMatch = file.tags?.some((t) => t.toLowerCase().includes(q)) || false;
      const descMatch = file.description?.toLowerCase().includes(q) || false;
      return nameMatch || tagMatch || descMatch;
    }

    return true;
  });

  return (
    <div className="flex flex-col lg:flex-row gap-6 min-h-[500px] select-none">
      {/* 1. Left Sidebar: Department Tags Filter */}
      <div className="w-full lg:w-[240px] shrink-0 bg-white border border-[#E2E8F4] rounded-[10px] p-4 flex flex-col space-y-1 h-fit shadow-xs">
        <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider px-2.5 pb-2">
          Filter By Department
        </p>
        {departments.map((dept) => {
          const count = dept.key === 'all' 
            ? files.length 
            : files.filter((f) => f.department === dept.key).length;
          
          return (
            <button
              key={dept.key}
              onClick={() => setSelectedDept(dept.key)}
              className={`flex items-center justify-between w-full px-2.5 py-2 rounded-[6px] text-xs font-semibold border transition-all cursor-pointer ${
                selectedDept === dept.key
                  ? 'bg-brand-blue-muted border-transparent text-[#1B4FD8] font-bold'
                  : 'bg-transparent border-transparent text-[#475569] hover:bg-[#F1F5F9] hover:text-[#0A1628]'
              }`}
            >
              <span className="truncate">{dept.name}</span>
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                selectedDept === dept.key ? 'bg-[#1B4FD8]/20 text-[#1B4FD8]' : 'bg-[#F1F5F9] text-[#94A3B8]'
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* 2. Main File Explorer */}
      <div className="flex-1 space-y-4">
        {/* Navigation & Toolbar Header */}
        <div className="bg-white border border-[#E2E8F4] rounded-[10px] p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="text-xs">
            <span className="text-[#94A3B8] font-semibold">Shared Vault</span>
            <span className="text-[#94A3B8] mx-1.5">/</span>
            <span className="text-[#0A1628] font-bold">
              {departments.find((d) => d.key === selectedDept)?.name || 'All Files'}
            </span>
            <span className="ml-2 text-[9px] bg-slate-100 text-[#475569] px-2 py-0.5 rounded-full font-bold">
              {filteredFiles.length} files
            </span>
          </div>

          {/* Action Tools */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Search Input */}
            <div className="relative w-full sm:w-[220px]">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[#94A3B8]" />
              <input
                type="text"
                placeholder="Search file name/tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#F8FAFF] border border-[#E2E8F4] text-[#0A1628] text-xs pl-8 pr-3 py-1.5 rounded-[7px] focus:outline-none focus:border-[#1B4FD8]"
              />
            </div>

            {/* View switcher Grid/List */}
            <div className="flex items-center bg-[#F1F5F9] border border-[#E2E8F4] rounded p-0.5">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1 rounded-[5px] transition-colors cursor-pointer ${
                  viewMode === 'grid' ? 'bg-[#1B4FD8] text-white shadow-xs' : 'text-[#475569] hover:text-[#0A1628]'
                }`}
                title="Grid view"
              >
                <Grid size={13} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1 rounded-[5px] transition-colors cursor-pointer ${
                  viewMode === 'list' ? 'bg-[#1B4FD8] text-white shadow-xs' : 'text-[#475569] hover:text-[#0A1628]'
                }`}
                title="List view"
              >
                <List size={13} />
              </button>
            </div>
          </div>
        </div>

        {/* Files Grid or List Display */}
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
                    className="bg-white border border-[#E2E8F4] rounded-[8px] p-4 flex flex-col justify-between hover:border-[#1B4FD8]/30 hover:shadow-xs transition-all relative group h-[160px]"
                  >
                    {/* Top row */}
                    <div className="flex items-start justify-between">
                      {isImg && file.public_url ? (
                        <div className="h-10 w-10 rounded border border-[#E2E8F4] overflow-hidden bg-[#F8FAFF] flex items-center justify-center">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={file.public_url}
                            alt={file.name}
                            className="object-cover h-full w-full"
                          />
                        </div>
                      ) : (
                        <div className="h-10 w-10 rounded bg-[#F8FAFF] border border-[#E2E8F4]/50 flex items-center justify-center shrink-0">
                          {getFileIcon(file.mime_type, file.name)}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                        {file.public_url && (
                          <button
                            onClick={() => setPreviewFile(file)}
                            className="p-1 rounded hover:bg-[#F1F5F9] text-[#475569] hover:text-[#0A1628] cursor-pointer"
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
                          className="p-1 rounded hover:bg-[#F1F5F9] text-[#475569] hover:text-[#0A1628] cursor-pointer"
                          title="Download file"
                        >
                          <Download size={12} />
                        </a>
                      </div>
                    </div>

                    {/* Middle info */}
                    <div className="mt-3 min-w-0">
                      <p className="font-bold text-xs text-[#0A1628] truncate" title={file.name}>
                        {file.name}
                      </p>
                      <p className="text-[9px] text-[#94A3B8] mt-0.5 font-mono">
                        {formatBytes(file.size_bytes)} • {formatDate(file.created_at)}
                      </p>
                      {file.description && (
                        <p className="text-[10px] text-[#475569] mt-1.5 line-clamp-1 italic">
                          {file.description}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* LIST VIEW */
            <div className="bg-white border border-[#E2E8F4] rounded-[10px] overflow-hidden shadow-xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#E2E8F4] bg-[#F8FAFF] text-[9px] font-bold text-[#475569] uppercase tracking-wider">
                    <th className="p-3 pl-4">Name</th>
                    <th className="p-3">Size</th>
                    <th className="p-3">Department</th>
                    <th className="p-3">Uploaded Date</th>
                    <th className="p-3 text-right pr-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F4]/50 text-xs">
                  {filteredFiles.map((file) => (
                    <tr key={file.id} className="hover:bg-[#F8FAFF] text-[#475569] transition-colors">
                      <td className="p-3 pl-4 font-semibold text-[#0A1628] max-w-[220px] truncate">
                        <div className="flex items-center gap-2">
                          {getFileIcon(file.mime_type, file.name)}
                          <span className="truncate" title={file.name}>{file.name}</span>
                        </div>
                      </td>
                      <td className="p-3 font-mono text-[10px]">{formatBytes(file.size_bytes)}</td>
                      <td className="p-3 capitalize">{file.department?.replace('_', ' ') || 'General'}</td>
                      <td className="p-3 font-mono text-[10px]">{formatDate(file.created_at)}</td>
                      <td className="p-3 text-right pr-4">
                        <div className="flex items-center justify-end gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                          {file.public_url && (
                            <button
                              onClick={() => setPreviewFile(file)}
                              className="p-1 rounded hover:bg-[#F1F5F9] text-[#475569] hover:text-[#0A1628] cursor-pointer"
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
                            className="p-1 rounded hover:bg-[#F1F5F9] text-[#475569] hover:text-[#0A1628] cursor-pointer"
                            title="Download"
                          >
                            <Download size={12} />
                          </a>
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
          <div className="bg-white border border-[#E2E8F4] border-dashed rounded-[10px] p-12 text-center text-[#94A3B8] space-y-2 shadow-xs">
            <Folder size={32} className="mx-auto text-[#E2E8F4]" />
            <p className="font-bold text-sm text-[#0A1628]">No shared files found</p>
            <p className="text-xs max-w-xs mx-auto">
              There are no documents uploaded under this category yet, or nothing matches your current search.
            </p>
          </div>
        )}
      </div>

      {/* 3. Preview Lightbox Dialog */}
      <Dialog open={previewFile !== null} onOpenChange={(open) => !open && setPreviewFile(null)}>
        <DialogContent className="bg-white border border-[#E2E8F4] text-[#0A1628] max-w-3xl max-h-[85vh] overflow-y-auto shadow-2xl p-4">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-[#0A1628] truncate flex items-center justify-between pr-6 border-b border-[#F1F5F9] pb-2">
              <span>{previewFile?.name}</span>
              {previewFile?.public_url && (
                <a
                  href={previewFile.public_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[10px] text-[#1B4FD8] hover:underline flex items-center gap-1 font-semibold ml-4"
                >
                  <span>Open in browser tab</span>
                  <ExternalLink size={10} />
                </a>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col items-center justify-center p-2 bg-[#F8FAFF] rounded border border-[#E2E8F4]/50 min-h-[250px] mt-3">
            {previewFile?.public_url ? (
              previewFile.mime_type?.startsWith('image/') || 
              ['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(previewFile.name.split('.').pop()?.toLowerCase() || '') ? (
                /* Image preview */
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewFile.public_url}
                  alt={previewFile.name}
                  className="max-h-[50vh] object-contain rounded"
                />
              ) : previewFile.mime_type === 'application/pdf' || previewFile.name.endsWith('.pdf') ? (
                /* PDF preview */
                <iframe
                  src={previewFile.public_url}
                  className="w-full h-[55vh] rounded"
                  title="PDF Preview"
                />
              ) : (
                /* Non-previewable file type fallback */
                <div className="text-center p-8 space-y-3">
                  <div className="h-16 w-16 rounded-full bg-white border border-[#E2E8F4] flex items-center justify-center mx-auto text-[#475569]">
                    {getFileIcon(previewFile.mime_type, previewFile.name)}
                  </div>
                  <p className="text-xs font-bold text-[#0A1628]">{previewFile.name}</p>
                  <p className="text-[10px] text-[#94A3B8]">Preview not supported for this document type.</p>
                  <a
                    href={previewFile.public_url}
                    download
                    className="inline-flex items-center gap-1.5 text-xs bg-[#1B4FD8] hover:bg-[#2563EB] text-white px-4 py-2 rounded-[7px] font-bold transition-all shadow-xs"
                  >
                    <Download size={12} /> Download Copy
                  </a>
                </div>
              )
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
