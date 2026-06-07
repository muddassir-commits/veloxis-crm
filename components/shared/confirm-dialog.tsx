import React from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  loading?: boolean;
  variant?: 'default' | 'danger';
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  loading = false,
  variant = 'default',
}: ConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={(isOpen) => { if (!isOpen && !loading) onClose(); }}>
      <AlertDialogContent 
        className="bg-bg-card border border-border/30 text-text-primary rounded-xl max-w-sm p-6 shadow-2xl backdrop-blur-md z-50"
      >
        <AlertDialogHeader className="text-left">
          <AlertDialogTitle className="text-base font-semibold text-text-primary tracking-tight">
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-xs text-text-secondary mt-1.5 leading-relaxed">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter className="mt-6 flex flex-row justify-end gap-2.5">
          <Button
            variant="outline"
            disabled={loading}
            onClick={onClose}
            className="border-border/30 bg-transparent hover:bg-bg-card-hover/20 text-text-secondary hover:text-text-primary text-xs font-semibold px-4 h-9 cursor-pointer transition-colors"
          >
            Cancel
          </Button>
          
          <Button
            onClick={onConfirm}
            disabled={loading}
            className={cn(
              "text-xs font-semibold text-white px-4 h-9 rounded-md transition-colors flex items-center justify-center gap-1.5 cursor-pointer min-w-[70px]",
              variant === 'danger'
                ? "bg-error hover:bg-error-light"
                : "bg-primary hover:bg-primary-light"
            )}
          >
            {loading && <Loader2 className="h-3 w-3 animate-spin shrink-0" />}
            <span>{confirmLabel}</span>
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
export default ConfirmDialog;
