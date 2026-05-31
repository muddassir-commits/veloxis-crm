import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LoadingSkeleton } from './loading-skeleton';

interface StatCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  value: React.ReactNode;
  change?: number;
  changeType?: 'up' | 'down' | 'neutral';
  icon?: LucideIcon;
  loading?: boolean;
  valueClassName?: string;
  subtext?: React.ReactNode;
}

export function StatCard({
  title,
  value,
  change,
  changeType = 'neutral',
  icon: Icon,
  loading = false,
  className,
  valueClassName,
  subtext,
  ...props
}: StatCardProps) {
  if (loading) {
    return <LoadingSkeleton variant="card" className={className} {...props} />;
  }

  return (
    <div
      className={cn(
        "bg-[#0D1829] border border-[#1E3352] rounded-[10px] p-[20px] md:p-[24px] relative transition-all duration-200 hover:border-[#1A2D47] flex flex-col justify-between shadow-sm",
        className
      )}
      {...props}
    >
      {/* Icon placed in the top-right corner */}
      {Icon && (
        <div className="absolute top-[20px] right-[24px] text-[#4A6480] opacity-40 shrink-0 select-none">
          <Icon size={18} className="stroke-[1.5]" />
        </div>
      )}

      <div>
        {/* Title */}
        <div className="text-[11px] uppercase tracking-[0.06em] text-[#4A6480] font-semibold select-none">
          {title}
        </div>

        {/* Change stats row, positioned below the title */}
        {change !== undefined && (
          <div className="flex items-center gap-1 text-[11px] mt-0.5 select-none">
            <span
              className={cn(
                "font-semibold",
                changeType === 'up' && "text-[#22C55E]",
                changeType === 'down' && "text-[#EF4444]",
                changeType === 'neutral' && "text-[#8BA3C7]"
              )}
            >
              {changeType === 'up' ? '↑ ' : changeType === 'down' ? '↓ ' : ''}
              {change}%
            </span>
            <span className="text-[#8BA3C7] opacity-60 font-normal">vs last month</span>
          </div>
        )}
      </div>

      {/* Value */}
      <div className={cn("text-[28px] font-bold font-mono text-[#F0F4FF] mt-3 tracking-tight select-all leading-none", valueClassName)}>
        {value}
      </div>

      {subtext && (
        <div className="text-[11px] text-[#8BA3C7] opacity-60 font-normal mt-2 select-none">
          {subtext}
        </div>
      )}
    </div>
  );
}
export default StatCard;
