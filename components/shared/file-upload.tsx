'use client';

import React, { useState, useRef } from 'react';
import { UploadCloud, File, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface FileUploadProps extends React.HTMLAttributes<HTMLDivElement> {
  onUpload: (fileMetadata: { id: string; name: string; public_url: string; storage_path: string }) => void;
  accept?: string;
  maxSizeMB?: number;
  multiple?: boolean;
  bucket: string;
  storagePath: string; // e.g. "clients/22f3e36f/invoices"
  clientId?: string;
  department?: string;
  tags?: string[];
}

export function FileUpload({
  onUpload,
  accept,
  maxSizeMB = 50,
  multiple = false,
  bucket,
  storagePath,
  clientId,
  department,
  tags = [],
  className,
  ...props
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<{ name: string; size: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = async (file: File) => {
    setError(null);
    setUploadedFile(null);

    // 1. Validation
    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`File is too large. Max size allowed is ${maxSizeMB}MB.`);
      return;
    }

    try {
      setIsUploading(true);
      setUploadProgress(10);

      // Create FormData
      const formData = new FormData();
      formData.append('file', file);
      formData.append('bucket', bucket);
      
      // Determine final path: if path ends with a slash or is empty, combine it with the file name
      const sanitizedPath = storagePath.endsWith('/') ? storagePath : `${storagePath}/`;
      const finalPath = `${sanitizedPath}${Date.now()}-${file.name.replace(/\s+/g, '_')}`;
      formData.append('path', finalPath);

      if (clientId) formData.append('client_id', clientId);
      if (department) formData.append('department', department);
      if (tags.length > 0) formData.append('tags', tags.join(','));

      setUploadProgress(30);

      // 2. Perform upload
      const xhr = new XMLHttpRequest();
      
      // Monitor upload progress
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 70) + 30; // Scale from 30% to 100%
          setUploadProgress(Math.min(percent, 95));
        }
      });

      const responsePromise = new Promise<{ id: string; name: string; public_url: string; storage_path: string }>((resolve, reject) => {
        xhr.onreadystatechange = () => {
          if (xhr.readyState === XMLHttpRequest.DONE) {
            if (xhr.status >= 200 && xhr.status < 300) {
              try {
                const data = JSON.parse(xhr.responseText);
                resolve(data);
              } catch {
                reject(new Error('Invalid response from server'));
              }
            } else {
              try {
                const errData = JSON.parse(xhr.responseText);
                reject(new Error(errData.error || 'Upload failed'));
              } catch {
                reject(new Error(`Upload failed with status ${xhr.status}`));
              }
            }
          }
        };

        xhr.onerror = () => reject(new Error('Network error during upload'));
        
        xhr.open('POST', '/api/files/upload', true);
        xhr.send(formData);
      });

      const result = await responsePromise;
      setUploadProgress(100);
      setUploadedFile({ name: file.name, size: file.size });
      onUpload(result);
    } catch (err) {
      const error = err as Error;
      console.error('File upload failed:', error);
      setError(error.message || 'An error occurred during upload. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!isUploading) setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (isUploading) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      processFile(droppedFile);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  const triggerSelect = () => {
    fileInputRef.current?.click();
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className={cn("w-full space-y-3 select-none", className)} {...props}>
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={isUploading ? undefined : triggerSelect}
        className={cn(
          "border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 min-h-[160px]",
          isDragging
            ? "border-primary bg-primary/5"
            : error
              ? "border-error bg-error/5"
              : "border-border/30 bg-bg-dark hover:bg-bg-card hover:border-border/50"
        )}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept={accept}
          multiple={multiple}
          className="hidden"
          disabled={isUploading}
        />

        {isUploading ? (
          <div className="space-y-3 w-full max-w-xs flex flex-col items-center">
            <Loader2 className="h-7 w-7 text-[#1B4FD8] animate-spin" />
            <div className="text-xs text-text-secondary font-medium">Uploading file...</div>
            <Progress value={uploadProgress} className="h-1.5 w-full bg-bg-card-hover/20" />
          </div>
        ) : (
          <div className="space-y-2 flex flex-col items-center">
            <UploadCloud
              size={32}
              className={cn(
                "stroke-[1.5]",
                isDragging ? "text-[#1B4FD8]" : error ? "text-error" : "text-text-tertiary"
              )}
            />
            <div className="text-xs text-text-secondary">
              <span className="text-primary-light font-semibold">Click to upload</span> or drag and drop
            </div>
            <div className="text-[10px] text-text-tertiary">
              Max file size {maxSizeMB}MB
            </div>
          </div>
        )}
      </div>

      {/* Success State */}
      {uploadedFile && !error && (
        <div className="flex items-center gap-2.5 p-3 rounded-lg border border-online/30 bg-[#22C55E10] text-xs">
          <CheckCircle2 size={16} className="text-online shrink-0 stroke-[1.5]" />
          <div className="min-w-0 flex-1">
            <p className="font-medium text-text-primary truncate">{uploadedFile.name}</p>
            <p className="text-[10px] text-text-secondary mt-0.5">{formatSize(uploadedFile.size)} • Uploaded successfully</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="flex items-center gap-2.5 p-3 rounded-lg border border-error/30 bg-[#EF444410] text-xs">
          <AlertCircle size={16} className="text-error shrink-0 stroke-[1.5]" />
          <p className="font-medium text-error min-w-0 flex-1">{error}</p>
        </div>
      )}
    </div>
  );
}
export default FileUpload;
