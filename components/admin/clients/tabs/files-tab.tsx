'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Client, FileRecord } from '@/types';
import { toast } from 'sonner';
import {
  FileText,
  Image,
  FileVideo,
  FileArchive,
  Upload,
  Download,
  Trash2,
  ExternalLink,
  RefreshCw,
  File,
  Eye,
  EyeOff,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/utils';
import { FileUpload } from '@/components/shared/file-upload';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

interface FilesTabProps {
  client: Client;
}

function formatBytes(bytes: number | null): string {
  if (!bytes) return 'Unknown';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(mimeType: string | null) {
  if (!mimeType) return File;
  if (mimeType.startsWith('image/')) return Image;
  if (mimeType.startsWith('video/')) return FileVideo;
  if (mimeType.includes('pdf') || mimeType.includes('document') || mimeType.includes('text')) return FileText;
  if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('tar')) return FileArchive;
  return File;
}

function getFileIconColor(mimeType: string | null): string {
  if (!mimeType) return 'text-[#4A6480]';
  if (mimeType.startsWith('image/')) return 'text-[#A78BFA]';
  if (mimeType.startsWith('video/')) return 'text-[#F59E0B]';
  if (mimeType.includes('pdf')) return 'text-[#EF4444]';
  if (mimeType.includes('document') || mimeType.includes('word')) return 'text-[#4D90FE]';
  if (mimeType.includes('sheet') || mimeType.includes('excel')) return 'text-[#22C55E]';
  return 'text-[#8BA3C7]';
}

export function FilesTab({ client }: FilesTabProps) {
  const supabase = createClient();
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchFiles = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('files')
        .select('*')
        .eq('client_id', client.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFiles(data || []);
    } catch {
      toast.error('Failed to load files.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchFiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client.id]);

  const handleToggleShare = async (fileRecord: FileRecord) => {
    const nextVal = !fileRecord.is_shared_with_client;
    try {
      const { error } = await supabase
        .from('files')
        .update({ is_shared_with_client: nextVal })
        .eq('id', fileRecord.id);

      if (error) throw error;
      toast.success(nextVal ? 'File shared with client portal.' : 'File unshared.');
      setFiles((prev) =>
        prev.map((f) => (f.id === fileRecord.id ? { ...f, is_shared_with_client: nextVal } : f))
      );
    } catch {
      toast.error('Failed to update share status.');
    }
  };

  const handleDelete = async (fileRecord: FileRecord) => {
    setDeletingId(fileRecord.id);
    try {
      // Delete from storage
      await supabase.storage.from(fileRecord.bucket).remove([fileRecord.storage_path]);

      // Delete DB record
      const { error } = await supabase.from('files').delete().eq('id', fileRecord.id);
      if (error) throw error;

      toast.success(`File "${fileRecord.name}" deleted.`);
      setFiles((prev) => prev.filter((f) => f.id !== fileRecord.id));
    } catch {
      toast.error('Failed to delete file.');
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40 text-[#4A6480] text-xs gap-2">
        <RefreshCw size={14} className="animate-spin" />
        <span>Loading files...</span>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-[#F0F4FF]">Client Files & Documents</h3>
          <p className="text-[10px] text-[#4A6480] mt-0.5">
            {files.length} file{files.length !== 1 ? 's' : ''} stored for this client
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={fetchFiles}
            size="sm"
            className="bg-[#132035] hover:bg-[#1A2D47] border border-[#1E3352] text-[#8BA3C7] text-xs h-8 gap-1.5 cursor-pointer"
          >
            <RefreshCw size={12} />
            <span>Refresh</span>
          </Button>
          <Button
            onClick={() => setUploadOpen(true)}
            size="sm"
            className="bg-[#1B4FD8] hover:bg-[#2563EB] text-white text-xs h-8 gap-1.5 cursor-pointer font-semibold"
          >
            <Upload size={12} />
            <span>Upload File</span>
          </Button>
        </div>
      </div>

      {/* Files Grid */}
      {files.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-[#1E3352] rounded-[10px] bg-[#060D1A]">
          <FileText size={32} className="text-[#1E3352] mb-3" />
          <p className="text-sm font-medium text-[#4A6480]">No Files Uploaded Yet</p>
          <p className="text-xs text-[#2A4060] mt-1 max-w-xs">
            Upload contracts, brand assets, audit reports, or any documents for this client.
          </p>
          <Button
            onClick={() => setUploadOpen(true)}
            size="sm"
            className="mt-4 bg-[#132035] border border-[#1E3352] text-[#8BA3C7] hover:text-[#F0F4FF] text-xs h-8 gap-1.5 cursor-pointer"
          >
            <Upload size={12} />
            <span>Upload First File</span>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {files.map((file) => {
            const IconComponent = getFileIcon(file.mime_type);
            const iconColor = getFileIconColor(file.mime_type);
            const isDeleting = deletingId === file.id;

            return (
              <div
                key={file.id}
                className="bg-[#0D1829] border border-[#1E3352] rounded-[10px] p-4 flex flex-col gap-3 hover:border-[#2A4060] transition-all group"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-[8px] bg-[#060D1A] border border-[#1E3352] flex items-center justify-center shrink-0">
                    <IconComponent size={18} className={iconColor} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-1">
                      <p className="text-xs font-semibold text-[#F0F4FF] truncate leading-tight flex-1">
                        {file.original_name || file.name}
                      </p>
                      {file.is_shared_with_client ? (
                        <span className="text-[8px] font-bold text-[#22C55E] bg-[#22C55E]/10 border border-[#22C55E]/20 rounded px-1 shrink-0 select-none">
                          SHARED
                        </span>
                      ) : (
                        <span className="text-[8px] font-bold text-[#4A6480] bg-[#132035] border border-[#1E3352] rounded px-1 shrink-0 select-none">
                          PRIVATE
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-[#4A6480] mt-0.5">
                      {formatBytes(file.size_bytes)} · {formatDate(file.created_at)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 pt-2 border-t border-[#1E3352]/50">
                  {file.public_url && (
                    <>
                      <a
                        href={file.public_url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 text-[10px] text-[#4D90FE] hover:text-[#7BB3FF] transition-colors"
                      >
                        <ExternalLink size={11} />
                        <span>View</span>
                      </a>
                      <a
                        href={file.public_url}
                        download={file.original_name || file.name}
                        className="flex items-center gap-1 text-[10px] text-[#8BA3C7] hover:text-[#F0F4FF] transition-colors"
                      >
                        <Download size={11} />
                        <span>Download</span>
                      </a>
                    </>
                  )}

                  {/* Share Toggle */}
                  <button
                    onClick={() => handleToggleShare(file)}
                    className="flex items-center gap-1 text-[10px] text-[#8BA3C7] hover:text-[#F0F4FF] transition-colors cursor-pointer"
                  >
                    {file.is_shared_with_client ? (
                      <>
                        <EyeOff size={11} className="text-[#F59E0B]" />
                        <span>Unshare</span>
                      </>
                    ) : (
                      <>
                        <Eye size={11} className="text-[#22C55E]" />
                        <span>Share</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => handleDelete(file)}
                    disabled={isDeleting}
                    className="ml-auto flex items-center gap-1 text-[10px] text-[#EF4444]/60 hover:text-[#EF4444] transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isDeleting ? (
                      <RefreshCw size={11} className="animate-spin" />
                    ) : (
                      <Trash2 size={11} />
                    )}
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ━━━ UPLOAD MODAL DIALOG ━━━ */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="bg-[#0D1829] border border-[#1E3352] text-[#F0F4FF] max-w-sm select-none">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-[#F0F4FF]">Upload Document</DialogTitle>
            <DialogDescription className="text-xs text-[#8BA3C7]">
              Drag and drop any contract or campaign audit assets.
            </DialogDescription>
          </DialogHeader>

          <div className="my-2">
            <FileUpload
              bucket="crm-files"
              storagePath={`clients/${client.id}`}
              clientId={client.id}
              department="clients"
              onUpload={() => {
                toast.success('Document uploaded successfully.');
                setUploadOpen(false);
                fetchFiles();
              }}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default FilesTab;
