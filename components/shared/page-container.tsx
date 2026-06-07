import React from 'react';
import { cn } from '@/lib/utils';

interface PageContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  title?: string;
  description?: string;
  actions?: React.ReactNode;
}

export function PageContainer({ children, className, title, description, actions, ...props }: PageContainerProps) {
  return (
    <div
      className={cn("page-enter flex-grow overflow-auto p-6 space-y-6", className)}
      {...props}
    >
      {title && (
        <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between pb-4 border-b border-border/20 select-none">
          <div>
            <h2 className="text-[16px] md:text-[20px] font-bold text-text-primary tracking-tight">{title}</h2>
            {description && <p className="text-xs text-text-secondary mt-0.5">{description}</p>}
          </div>
          {actions && <div className="flex items-center gap-2 mt-2 md:mt-0">{actions}</div>}
        </div>
      )}
      <div className="space-y-6">
        {children}
      </div>
    </div>
  );
}
