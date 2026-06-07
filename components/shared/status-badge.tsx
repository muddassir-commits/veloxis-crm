import React from 'react';
import { cn } from '@/lib/utils';

interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  status: string;
}

export function StatusBadge({ status, className, ...props }: StatusBadgeProps) {
  const normalizedStatus = status.toLowerCase().replace(/[\s-]/g, '_');

  let badgeStyle = "bg-border/10 text-text-muted";
  let label = status;
  let showDot = false;

  switch (normalizedStatus) {
    case 'active':
      badgeStyle = "bg-online/15 text-online";
      label = "Active";
      showDot = true;
      break;
    case 'paused':
      badgeStyle = "bg-warning/15 text-warning";
      label = "Paused";
      break;
    case 'churned':
      badgeStyle = "bg-text-muted/10 text-text-muted";
      label = "Churned";
      break;
    case 'lost':
      badgeStyle = "bg-text-muted/10 text-text-muted";
      label = "Lost";
      break;
    case 'lead':
      badgeStyle = "bg-purple-500/10 text-purple-500";
      label = "Lead";
      break;
    case 'new':
      badgeStyle = "bg-purple-500/10 text-purple-500";
      label = "New";
      break;
    case 'paid':
      badgeStyle = "bg-online/15 text-online";
      label = "Paid";
      break;
    case 'done':
      badgeStyle = "bg-online/15 text-online";
      label = "Done";
      break;
    case 'approved':
      badgeStyle = "bg-online/15 text-online";
      label = "Approved";
      break;
    case 'pending':
      badgeStyle = "bg-warning/15 text-warning";
      label = "Pending";
      break;
    case 'in_progress':
      badgeStyle = "bg-warning/15 text-warning";
      label = "In Progress";
      break;
    case 'overdue':
      badgeStyle = "bg-error/15 text-error";
      label = "Overdue";
      break;
    case 'urgent':
      badgeStyle = "bg-error/15 text-error";
      label = "Urgent";
      break;
    case 'todo':
      badgeStyle = "bg-border/10 text-text-muted";
      label = "To Do";
      break;
    case 'planning':
      badgeStyle = "bg-border/10 text-text-muted";
      label = "Planning";
      break;
    case 'review':
      badgeStyle = "bg-primary/10 text-primary";
      label = "In Review";
      break;
    case 'won':
      badgeStyle = "bg-online/15 text-online";
      label = "★ Won";
      break;
    case 'completed':
      badgeStyle = "bg-online/15 text-online";
      label = "Completed";
      break;
    case 'agency_self':
      badgeStyle = "bg-accent/10 text-accent";
      label = "My Agency";
      break;
    default:
      // Fallback formatting
      label = status.charAt(0).toUpperCase() + status.slice(1);
      break;
  }

  return (
    <span
      className={cn(
        "badge inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold tracking-[0.03em] select-none shrink-0",
        badgeStyle,
        className
      )}
      {...props}
    >
      {showDot && (
        <span className="text-[8px] leading-none text-current">●</span>
      )}
      <span>{label}</span>
    </span>
  );
}
export default StatusBadge;
