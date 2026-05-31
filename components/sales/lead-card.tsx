'use client';

import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { MessageSquare, UserCheck, XCircle, Building, User } from 'lucide-react';
import { Lead, Profile } from '@/types';
import { formatCurrency } from '@/lib/utils';

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

  // Score circle background styling
  const getScoreBg = (val: number) => {
    if (val >= 70) {
      return 'bg-[#22C55E]/20 text-[#22C55E] border border-[#22C55E]/40';
    }
    if (val >= 40) {
      return 'bg-[#F97316]/20 text-[#F97316] border border-[#F97316]/40';
    }
    return 'bg-[#EF4444]/20 text-[#EF4444] border border-[#EF4444]/40';
  };

  // Days in stage calculation
  const getDaysInStage = (updatedAtStr: string) => {
    const updatedAt = new Date(updatedAtStr).getTime();
    const diffTime = Math.abs(currentTimestamp - updatedAt);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays === 1 ? '1 day' : `${diffDays} days`;
  };

  return (
    <div
      className={`relative select-none flex flex-col gap-3 p-[14px] bg-[#132035] border border-[#1E3352] rounded-[8px] transition-all hover:border-[#1A2D47] ${
        isWon ? 'border-l-4 border-l-[#22C55E]' : ''
      } ${isLost ? 'border-l-4 border-l-[#4A6480] opacity-50' : ''} ${
        isDragging ? 'opacity-30' : ''
      }`}
    >
      {/* Top Row: Name bold #F0F4FF + Source badge */}
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-0.5 min-w-0">
          <h4 className="font-bold text-xs text-[#F0F4FF] hover:text-[#1B4FD8] transition-all break-words pr-4">
            {lead.name}
          </h4>
          {lead.company && (
            <p className="text-[10px] text-[#8BA3C7] flex items-center gap-1">
              <Building size={10} className="shrink-0" />
              <span className="truncate">{lead.company}</span>
            </p>
          )}
        </div>

        {lead.source && (
          <span className="text-[8px] font-bold bg-[#1E3352]/40 border border-[#1E3352]/60 text-[#8BA3C7] rounded-full px-2 py-0.5 shrink-0 uppercase tracking-wider select-none">
            {lead.source.replace('_', ' ')}
          </span>
        )}
      </div>

      {/* Row: Score circle + Details */}
      <div className="flex items-center justify-between gap-2">
        {/* Score badge circle */}
        <div
          title={`Lead Score: ${score}/100`}
          className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${getScoreBg(
            score
          )}`}
        >
          {score}
        </div>

        {/* Estimated Value & Days in stage */}
        <div className="flex flex-col items-end text-[11px]">
          <span className="font-semibold font-mono text-[#F97316]">
            {formatCurrency(lead.estimated_value || 0)}
          </span>
          <span className="text-[#4A6480] text-[10px]">
            {getDaysInStage(lead.updated_at)}
          </span>
        </div>
      </div>

      {/* Bottom: Assignee avatar + 3 quick action icons */}
      <div className="flex items-center justify-between pt-2 border-t border-[#1E3352]/20">
        {/* Assignee Avatar */}
        <div className="flex items-center gap-1.5">
          {assignee ? (
            <div
              title={`Assigned to ${assignee.full_name}`}
              className="h-5 w-5 rounded-full bg-[#1B4FD8] text-[#F0F4FF] flex items-center justify-center font-bold text-[9px] uppercase border border-[#1E3352] shrink-0"
            >
              {assignee.full_name.charAt(0)}
            </div>
          ) : (
            <div
              title="Unassigned"
              className="h-5 w-5 rounded-full bg-[#132035] text-[#4A6480] flex items-center justify-center border border-[#1E3352] shrink-0"
            >
              <User size={10} />
            </div>
          )}
          {assignee && (
            <span className="text-[10px] text-[#8BA3C7] truncate max-w-[65px]">
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
            className="text-[#8BA3C7] hover:text-[#F0F4FF] p-1 rounded hover:bg-[#1E3352]/40 transition-all cursor-pointer"
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
              className="text-[#22C55E] hover:text-[#F0F4FF] p-1 rounded hover:bg-[#22C55E]/10 transition-all cursor-pointer"
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
              className="text-[#EF4444] hover:text-[#F0F4FF] p-1 rounded hover:bg-[#EF4444]/10 transition-all cursor-pointer"
            >
              <XCircle size={13} className="stroke-[2]" />
            </button>
          )}
        </div>
      </div>
    </div>
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
