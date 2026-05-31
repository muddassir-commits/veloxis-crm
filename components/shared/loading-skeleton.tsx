import React from 'react';
import { cn } from '@/lib/utils';

interface LoadingSkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  rows?: number;
  columns?: number;
  height?: string | number;
  variant?: 'table' | 'card';
}

export function LoadingSkeleton({
  rows = 5,
  columns = 4,
  height = 40,
  variant = 'table',
  className,
  ...props
}: LoadingSkeletonProps) {
  if (variant === 'card') {
    return (
      <div
        className={cn(
          "bg-[#0D1829] border border-[#1E3352] rounded-[10px] p-[20px] md:p-[24px] space-y-4 shadow-sm",
          className
        )}
        {...props}
      >
        {/* Title skeleton */}
        <div className="skeleton h-[11px] w-[35%] bg-[#132035]" />
        
        {/* Value skeleton */}
        <div className="skeleton h-[28px] w-[60%] bg-[#132035]" />
        
        {/* Subtext/Change skeleton */}
        <div className="skeleton h-[14px] w-[25%] bg-[#132035]" />
      </div>
    );
  }

  // Table variant
  const widths = ['w-[60%]', 'w-[40%]', 'w-[80%]', 'w-[30%]', 'w-[50%]'];

  return (
    <div className={cn("w-full space-y-3", className)} {...props}>
      {Array.from({ length: rows }).map((_, rIndex) => (
        <div
          key={rIndex}
          className="flex items-center gap-4 py-2 border-b border-[#1E3352]/20 last:border-0"
        >
          {Array.from({ length: columns }).map((_, cIndex) => {
            const widthClass = widths[(rIndex + cIndex) % widths.length];
            return (
              <div
                key={cIndex}
                className="flex-1 flex justify-start items-center"
              >
                <div
                  className={cn(
                    "skeleton bg-[#132035]",
                    widthClass
                  )}
                  style={{ height: typeof height === 'number' ? `${height}px` : height }}
                />
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
