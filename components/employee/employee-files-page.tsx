'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  File,
  FileText,
  FileImage,
  FileSpreadsheet,
  Video,
  Archive,
  Upload,
  Download,
  Trash2,
  Search,
  Eye,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { FileUpload } from '@/components/shared/file-upload';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { formatBytes, formatDate } from '@/lib/utils';

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

interface EmployeeFilesPageProps {
  files: FileRecord[];
  employeeId: string;
}

const getFileIcon = (mimeType: string | null, name: string) => {
  const type = mimeType?.toLowerCase() || '';
  const ext = name.split('.').pop()?.toLowerCase() || '';
  if (type.startsWith('image/') || ['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext)) {
    return <FileImage className="text-[#38BDF8]" size={18} />;
  }
  if (type === 'application/pdf' || ext === 'pdf') {
    return <FileText className="text-[#F87171]" size={18} />;
  }
  if (type.includes('spreadsheet') || type.includes('excel') || ['xlsx', 'xls', 'csv'].includes(ext)) {
    return <FileSpreadsheet className="text-[#34D399]" size={18} />;
  }
  if (type.startsWith('video/') || ['mp4', 'mov', 'avi'].includes(ext)) {
    return <Video className="text-[#A78BFA]" size={18} />;
  }
  if (type.includes('zip') || ['zip', 'rar', '7z'].includes(ext)) {
    return <Archive className="text-[#FBBF24]" size={18} />;
  }
  return <File className="text-[#94A3B8]" size={18} />;
};

export function EmployeeFilesPage({ files, employeeId }: EmployeeFilesPageProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<FileRecord | null>(null);
  const [deleteFile, setDeleteFile] = useState<FileRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const filteredFiles = files.filter((f) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      f.name.toLowerCase().includes(q) ||
      f.tags?.some((t) => t.toLowerCase().includes(q)) ||
      f.description?.toLowerCase().includes(q)
    );
  });

  const totalSize = filteredFiles.reduce((sum, f) => sum + Number(f.size_bytes || 0), 0);

  const handleDelete = async () => {
    if (!deleteFile) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/files/delete/${deleteFile.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Deletion failed');
      toast.success('File deleted successfully.');
      setDeleteFile(null);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Deletion failed');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-4 py-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold text-[#F0F4FF]">My Files</h1>
          <p className="text-[10px] text-[#4A6480]">
            {filteredFiles.length} files · {formatBytes(totalSize)}
          </p>
        </div>
        <Button
          onClick={() => setUploadOpen(true)}
          size="sm"
          className="bg-[#1B4FD8] hover:bg-[#2563EB] text-white text-[11px] h-8 gap-1.5 cursor-pointer font-bold"
        >
          <Upload size={12} /> Upload
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[#4A6480]" />
        <input
          type="text"
          placeholder="Search files..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-[#0D1829] border border-[#1E3352] rounded-[8px] pl-9 pr-3 py-2 text-xs text-[#F0F4FF] placeholder-[#4A6480] focus:outline-none focus:border-[#1B4FD8]"
        />
      </div>

      {/* Files */}
      {filteredFiles.length === 0 ? (
        <div className="bg-[#0D1829] border border-[#1E3352] border-dashed rounded-[10px] p-10 text-center">
          <FileText size={28} className="text-[#1E3352] mx-auto mb-2" />
          <p className="text-sm font-semibold text-[#8BA3C7]">No files yet</p>
          <p className="text-xs text-[#4A6480] mt-1 mb-4">Upload files here to keep them organized.</p>
          <Button
            onClick={() => setUploadOpen(true)}
            size="sm"
            className="bg-[#1B4FD8]/15 border border-[#1E3352] hover:bg-[#1B4FD8] hover:text-white text-[#4D90FE] text-xs cursor-pointer"
          >
            Upload First File
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredFiles.map((file) => {
            const isImg =
              file.mime_type?.startsWith('image/') ||
              ['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(file.name.split('.').pop()?.toLowerCase() || '');
            return (
              <div
                key={file.id}
                className="bg-[#0D1829] border border-[#1E3352] rounded-[8px] px-4 py-3 flex items-center gap-3 group hover:border-[#1A2D47] transition-all"
              >
                {/* Icon / thumb */}
                <div className="w-9 h-9 rounded bg-[#132035]/60 border border-[#1E3352]/50 flex items-center justify-center shrink-0 overflow-hidden">
                  {isImg && file.public_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={file.public_url} alt={file.name} className="object-cover w-full h-full" />
                  ) : (
                    getFileIcon(file.mime_type, file.name)
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-[#F0F4FF] truncate">{file.name}</p>
                  <p className="text-[10px] text-[#4A6480] font-mono">
                    {formatBytes(file.size_bytes)} · {formatDate(file.created_at)}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity shrink-0">
                  {file.public_url && (
                    <button
                      onClick={() => setPreviewFile(file)}
                      className="p-1.5 rounded hover:bg-[#132035] text-[#8BA3C7] hover:text-[#F0F4FF] cursor-pointer"
                      title="Preview"
                    >
                      <Eye size={13} />
                    </button>
                  )}
                  <a
                    href={file.public_url || '#'}
                    download={file.name}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 rounded hover:bg-[#132035] text-[#8BA3C7] hover:text-[#F0F4FF] cursor-pointer"
                    title="Download"
                  >
                    <Download size={13} />
                  </a>
                  <button
                    onClick={() => setDeleteFile(file)}
                    className="p-1.5 rounded hover:bg-[#EF444415] text-[#8BA3C7] hover:text-[#EF4444] cursor-pointer"
                    title="Delete"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Upload Dialog */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="bg-[#0D1829] border border-[#1E3352] text-[#F0F4FF] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">Upload File</DialogTitle>
            <DialogDescription className="text-xs text-[#8BA3C7]">
              Upload files to your personal work folder.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <FileUpload
              bucket="employees"
              storagePath={`employees/${employeeId}/files`}
              onUpload={() => {
                toast.success('File uploaded!');
                setUploadOpen(false);
                router.refresh();
              }}
            />
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

      {/* Preview Dialog */}
      <Dialog open={previewFile !== null} onOpenChange={(open) => !open && setPreviewFile(null)}>
        <DialogContent className="bg-[#0D1829] border border-[#1E3352] text-[#F0F4FF] max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold truncate">{previewFile?.name}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center p-2 bg-[#060D1A] rounded border border-[#1E3352]/40 min-h-[200px]">
            {previewFile?.public_url ? (
              previewFile.mime_type?.startsWith('image/') ||
              ['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(previewFile.name.split('.').pop()?.toLowerCase() || '') ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={previewFile.public_url} alt={previewFile.name} className="max-h-[50vh] object-contain rounded" />
              ) : previewFile.mime_type === 'application/pdf' || previewFile.name.endsWith('.pdf') ? (
                <iframe src={previewFile.public_url} className="w-full h-[50vh] rounded" title="PDF Preview" />
              ) : (
                <div className="text-center space-y-3">
                  {getFileIcon(previewFile.mime_type, previewFile.name)}
                  <p className="text-xs text-[#8BA3C7]">Preview not available.</p>
                  <a
                    href={previewFile.public_url}
                    download
                    className="inline-flex items-center gap-1 text-[11px] bg-[#1B4FD8] hover:bg-[#2563EB] text-white px-3 py-1.5 rounded font-bold"
                  >
                    <Download size={12} /> Download
                  </a>
                </div>
              )
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={deleteFile !== null} onOpenChange={(open) => !open && setDeleteFile(null)}>
        <DialogContent className="bg-[#0D1829] border border-[#1E3352] text-[#F0F4FF] max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-[#EF4444]">Delete File?</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-[#8BA3C7] my-3 leading-relaxed">
            Are you sure you want to delete <strong className="text-[#F0F4FF]">{deleteFile?.name}</strong>? This cannot be undone.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteFile(null)}
              className="bg-transparent border-[#1E3352] text-[#8BA3C7] hover:bg-[#132035] cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-[#EF4444] hover:bg-[#DC2626] text-white cursor-pointer"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
