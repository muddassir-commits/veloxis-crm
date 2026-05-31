import React from 'react';
import { cn } from '@/lib/utils';

interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  status: string;
}

export function StatusBadge({ status, className, ...props }: StatusBadgeProps) {
  const normalizedStatus = status.toLowerCase().replace(/[\s-]/g, '_');

  let badgeStyle = "bg-[#1E335215] text-[#64748B]";
  let label = status;
  let showDot = false;

  switch (normalizedStatus) {
    case 'active':
      badgeStyle = "bg-[#22C55E15] text-[#22C55E]";
      label = "Active";
      showDot = true;
      break;
    case 'paused':
      badgeStyle = "bg-[#F59E0B15] text-[#F59E0B]";
      label = "Paused";
      break;
    case 'churned':
      badgeStyle = "bg-[#64748B15] text-[#64748B]";
      label = "Churned";
      break;
    case 'lost':
      badgeStyle = "bg-[#64748B15] text-[#64748B]";
      label = "Lost";
      break;
    case 'lead':
      badgeStyle = "bg-[#8B5CF615] text-[#8B5CF6]";
      label = "Lead";
      break;
    case 'new':
      badgeStyle = "bg-[#8B5CF615] text-[#8B5CF6]";
      label = "New";
      break;
    case 'paid':
      badgeStyle = "bg-[#22C55E15] text-[#22C55E]";
      label = "Paid";
      break;
    case 'done':
      badgeStyle = "bg-[#22C55E15] text-[#22C55E]";
      label = "Done";
      break;
    case 'approved':
      badgeStyle = "bg-[#22C55E15] text-[#22C55E]";
      label = "Approved";
      break;
    case 'pending':
      badgeStyle = "bg-[#F59E0B15] text-[#F59E0B]";
      label = "Pending";
      break;
    case 'in_progress':
      badgeStyle = "bg-[#F59E0B15] text-[#F59E0B]";
      label = "In Progress";
      break;
    case 'overdue':
      badgeStyle = "bg-[#EF444415] text-[#EF4444]";
      label = "Overdue";
      break;
    case 'urgent':
      badgeStyle = "bg-[#EF444415] text-[#EF4444]";
      label = "Urgent";
      break;
    case 'todo':
      badgeStyle = "bg-[#1E335215] text-[#64748B]";
      label = "To Do";
      break;
    case 'planning':
      badgeStyle = "bg-[#1E335215] text-[#64748B]";
      label = "Planning";
      break;
    case 'review':
      badgeStyle = "bg-[#1B4FD815] text-[#1B4FD8]";
      label = "In Review";
      break;
    case 'won':
      badgeStyle = "bg-[#22C55E15] text-[#22C55E]";
      label = "★ Won";
      break;
    case 'completed':
      badgeStyle = "bg-[#22C55E15] text-[#22C55E]";
      label = "Completed";
      break;
    case 'agency_self':
      badgeStyle = "bg-[#F9731615] text-[#F97316]";
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
