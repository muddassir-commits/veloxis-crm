'use client';

import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { MessageSquare, UserCheck, XCircle, Building, User } from 'lucide-react';
import { Lead, Profile } from '@/types';
import { formatCurrency, cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';

interface LeadCardProps {
  lead: Lead;
  assignee?: Profile | null;
  onLogActivity: () => void;
  onConvert: () => void;
  onMarkLost: () => void;
  isDragging?: boolean;
  currentTimestamp: number;
}

export function LeadCard({
  lead,
  assignee,
  onLogActivity,
  onConvert,
  onMarkLost,
  isDragging = false,
  currentTimestamp,
}: LeadCardProps) {
  const score = lead.score || 0;
  const isWon = lead.status === 'won';
  const isLost = lead.status === 'lost';

  // Score circle background styling using theme colors
  const getScoreBg = (val: number) => {
    if (val >= 70) {
      return 'bg-success/15 text-success border border-success/35';
    }
    if (val >= 40) {
      return 'bg-accent/15 text-accent border border-accent/35';
    }
    return 'bg-error/15 text-error border border-error/35';
  };

  // Days in stage calculation
  const getDaysInStage = (updatedAtStr: string) => {
    const updatedAt = new Date(updatedAtStr).getTime();
    const diffTime = Math.abs(currentTimestamp - updatedAt);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays === 1 ? '1 day' : `${diffDays} days`;
  };

  return (
    <Card
      variant="compact"
      className={cn(
        "relative select-none flex flex-col gap-3 p-3.5 transition-all hover:border-border/60",
        isWon && "border-l-[3px] border-l-success",
        isLost && "border-l-[3px] border-l-text-tertiary/50 opacity-50",
        isDragging && "opacity-30"
      )}
    >
      {/* Top Row: Name bold text-text-primary + Source badge */}
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-0.5 min-w-0">
          <h4 className="font-bold text-xs text-text-primary hover:text-primary transition-all break-words pr-4">
            {lead.name}
          </h4>
          {lead.company && (
            <p className="text-[10px] text-text-secondary flex items-center gap-1">
              <Building size={10} className="shrink-0" />
              <span className="truncate">{lead.company}</span>
            </p>
          )}
        </div>

        {lead.source && (
          <span className="text-[8px] font-bold bg-border/20 border border-border/40 text-text-secondary rounded-full px-2 py-0.5 shrink-0 uppercase tracking-wider select-none">
            {lead.source.replace('_', ' ')}
          </span>
        )}
      </div>

      {/* Row: Score circle + Details */}
      <div className="flex items-center justify-between gap-2">
        {/* Score badge circle */}
        <div
          title={`Lead Score: ${score}/100`}
          className={cn(
            "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0",
            getScoreBg(score)
          )}
        >
          {score}
        </div>

        {/* Estimated Value & Days in stage */}
        <div className="flex flex-col items-end text-[11px]">
          <span className="font-semibold font-mono text-accent">
            {formatCurrency(lead.estimated_value || 0)}
          </span>
          <span className="text-text-tertiary text-[10px]">
            {getDaysInStage(lead.updated_at)}
          </span>
        </div>
      </div>

      {/* Bottom: Assignee avatar + 3 quick action icons */}
      <div className="flex items-center justify-between pt-2 border-t border-border/10">
        {/* Assignee Avatar */}
        <div className="flex items-center gap-1.5">
          {assignee ? (
            <div
              title={`Assigned to ${assignee.full_name}`}
              className="h-5 w-5 rounded-full bg-primary text-text-primary flex items-center justify-center font-bold text-[9px] uppercase border border-border/20 shrink-0"
            >
              {assignee.full_name.charAt(0)}
            </div>
          ) : (
            <div
              title="Unassigned"
              className="h-5 w-5 rounded-full bg-bg-card-hover/20 text-text-tertiary flex items-center justify-center border border-border/20 shrink-0"
            >
              <User size={10} />
            </div>
          )}
          {assignee && (
            <span className="text-[10px] text-text-secondary truncate max-w-[65px]">
              {assignee.full_name.split(' ')[0]}
            </span>
          )}
        </div>

        {/* Quick Action Icons */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            title="Log Activity"
            onClick={(e) => {
              e.stopPropagation();
              onLogActivity();
            }}
            className="text-text-secondary hover:text-text-primary p-1 rounded hover:bg-bg-card-hover/40 transition-all cursor-pointer"
          >
            <MessageSquare size={13} className="stroke-[2]" />
          </button>
          {!isWon && (
            <button
              type="button"
              title="Convert to Client"
              onClick={(e) => {
                e.stopPropagation();
                onConvert();
              }}
              className="text-success hover:text-text-primary p-1 rounded hover:bg-success/15 transition-all cursor-pointer"
            >
              <UserCheck size={13} className="stroke-[2]" />
            </button>
          )}
          {!isLost && !isWon && (
            <button
              type="button"
              title="Mark Lost"
              onClick={(e) => {
                e.stopPropagation();
                onMarkLost();
              }}
              className="text-error hover:text-text-primary p-1 rounded hover:bg-error/15 transition-all cursor-pointer"
            >
              <XCircle size={13} className="stroke-[2]" />
            </button>
          )}
        </div>
      </div>
    </Card>
  );
}

interface DraggableLeadCardProps extends LeadCardProps {
  id: string;
}

export function DraggableLeadCard({ id, ...props }: DraggableLeadCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id,
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: 50,
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="cursor-grab active:cursor-grabbing outline-none"
    >
      <LeadCard {...props} isDragging={isDragging} />
    </div>
  );
}
