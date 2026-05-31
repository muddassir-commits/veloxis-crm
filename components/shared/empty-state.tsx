import React from 'react';
import { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center p-8 md:p-12 space-y-4 min-h-[220px] select-none",
        className
      )}
      {...props}
    >
      {/* Icon with custom opacity and styling */}
      {Icon && (
        <div className="text-[#4A6480] opacity-25 shrink-0">
          <Icon size={32} className="stroke-[1.5]" />
        </div>
      )}

      {/* Text Details */}
      <div className="space-y-1.5 max-w-md">
        <h3 className="text-base font-semibold text-[#F0F4FF] tracking-tight">
          {title}
        </h3>
        <p className="text-sm text-[#8BA3C7] leading-relaxed">
          {description}
        </p>
      </div>

      {/* Action Button */}
      {actionLabel && onAction && (
        <Button
          onClick={onAction}
          size="sm"
          className="bg-[#1B4FD8] hover:bg-[#2563EB] text-white text-xs font-semibold px-4 py-2 rounded-md transition-colors"
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
export default EmptyState;
