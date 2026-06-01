/* eslint-disable */
'use client';

import React from 'react';
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
} from '@dnd-kit/core';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { ContentItem, Client, Profile } from '@/types';
import { Calendar, User, FileText, CheckCircle2, Link2, AlertCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface ContentKanbanProps {
  items: ContentItem[];
  clients: Client[];
  employees: Profile[];
  onItemUpdated: () => void;
  onCardClick: (item: ContentItem) => void;
}

const COLUMNS = [
  { id: 'idea', label: 'Idea / Topic', status: 'idea', color: 'border-t-purple-500' },
  { id: 'brief', label: 'Brief Generated', status: 'brief', color: 'border-t-blue-500' },
  { id: 'writing', label: 'Writing In Progress', status: 'writing', color: 'border-t-amber-500' },
  { id: 'review', label: 'Editor Review', status: 'review', color: 'border-t-pink-500' },
  { id: 'published', label: 'Published / Live', status: 'published', color: 'border-t-emerald-500' },
];

// Droppable Column Component
interface DroppableColumnProps {
  id: string;
  label: string;
  count: number;
  colorClass: string;
  children: React.ReactNode;
}

function DroppableColumn({ id, label, count, colorClass, children }: DroppableColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={`rounded-[10px] bg-[#0D1829] border border-[#1E3352] border-t-2 ${colorClass} p-3 flex flex-col min-h-[500px] w-[265px] shrink-0 transition-all ${
        isOver ? 'bg-[#132035]/80 border-[#1B4FD8]' : ''
      }`}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between mb-3 border-b border-[#1E3352]/30 pb-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-[#8BA3C7] select-none">
          {label}
        </span>
        <span className="text-[10px] font-mono bg-[#1E3352]/30 text-[#F0F4FF] px-2 py-0.5 rounded-full select-none font-bold">
          {count}
        </span>
      </div>

      {/* Cards list */}
      <div className="space-y-3 flex-1 flex flex-col">
        {children}
      </div>
    </div>
  );
}

// Draggable Card Component
interface DraggableCardProps {
  id: string;
  item: ContentItem;
  clientName: string;
  assigneeName: string;
  assigneeAvatar: string | null;
  onCardClick: (item: ContentItem) => void;
}

function DraggableCard({
  id,
  item,
  clientName,
  assigneeName,
  assigneeAvatar,
  onCardClick,
}: DraggableCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: id,
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        opacity: isDragging ? 0.3 : 1,
        zIndex: isDragging ? 50 : undefined,
      }
    : undefined;

  // Word count percentage
  const targetWords = item.word_count_target || 1000;
  const currentWords = item.word_count_current || 0;
  const wordPercentage = Math.min(Math.round((currentWords / targetWords) * 100), 100);

  // Due date formatting & urgency check
  const isOverdue = item.due_date && new Date(item.due_date) < new Date() && item.status !== 'published';
  const formattedDueDate = item.due_date
    ? new Date(item.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : null;

  // Content type badge color
  const getTypeBadge = (type: string | null) => {
    switch (type) {
      case 'blog':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'landing_page':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'case_study':
        return 'bg-pink-500/10 text-pink-400 border-pink-500/20';
      case 'email':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      default:
        return 'bg-[#1E3352]/30 text-[#8BA3C7] border-[#1E3352]/50';
    }
  };

  // Get Initials
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={() => onCardClick(item)}
      className={`group rounded-[8px] bg-[#060D1A] border border-[#1E3352] p-3 hover:border-[#1B4FD8] transition-all duration-200 cursor-pointer shadow-md select-none relative ${
        isDragging ? 'shadow-2xl border-[#1B4FD8]' : ''
      }`}
    >
      <div className="space-y-2">
        {/* Client Name & Type Badge */}
        <div className="flex justify-between items-start gap-2">
          <span className="text-[10px] font-bold text-[#4D90FE] uppercase truncate max-w-[120px]">
            {clientName}
          </span>
          <span
            className={`text-[9px] px-1.5 py-0.5 rounded border font-semibold capitalize tracking-wider ${getTypeBadge(
              item.content_type
            )}`}
          >
            {item.content_type?.replace('_', ' ') || 'Blog'}
          </span>
        </div>

        {/* Keyword & Title */}
        <div className="space-y-0.5">
          <h4 className="text-xs font-bold text-[#F0F4FF] line-clamp-1 group-hover:text-[#4D90FE] transition-colors">
            {item.keyword}
          </h4>
          {item.title && item.title !== item.keyword && (
            <p className="text-[10px] text-[#8BA3C7] line-clamp-2 leading-relaxed">
              {item.title}
            </p>
          )}
        </div>

        {/* Word count tracking for writing and review stages */}
        {(item.status === 'writing' || item.status === 'review' || item.status === 'published') && (
          <div className="space-y-1 pt-1">
            <div className="flex justify-between items-center text-[9px] text-[#8BA3C7]">
              <span>Progress</span>
              <span className="font-mono text-[#F0F4FF] font-medium">
                {currentWords} / {targetWords} words ({wordPercentage}%)
              </span>
            </div>
            <Progress value={wordPercentage} className="h-1 bg-[#132035]" indicatorClassName="bg-[#1B4FD8]" />
          </div>
        )}

        {/* Card Footer: Due Date, Brief indicator, Draft URL, Assignee */}
        <div className="flex items-center justify-between pt-2 border-t border-[#1E3352]/20 mt-1">
          {/* Due date and Link indicators */}
          <div className="flex items-center gap-2">
            {formattedDueDate && (
              <span
                className={`flex items-center gap-1 text-[9px] font-semibold px-1 rounded ${
                  isOverdue
                    ? 'text-red-400 bg-red-500/10 border border-red-500/20 animate-pulse'
                    : 'text-[#8BA3C7]'
                }`}
              >
                {isOverdue ? <AlertCircle size={9} /> : <Calendar size={9} />}
                {formattedDueDate}
              </span>
            )}

            {item.brief && (
              <span className="text-[#8BA3C7]" title="Brief available">
                <FileText size={10} />
              </span>
            )}

            {item.draft_url && (
              <span className="text-[#22C55E]" title="Draft link attached">
                <Link2 size={10} />
              </span>
            )}
          </div>

          {/* Assignee Avatar */}
          <div>
            {assigneeName ? (
              <div
                className="w-5 h-5 rounded-full bg-[#1E3352] text-[#F0F4FF] text-[8px] font-bold flex items-center justify-center border border-[#060D1A]"
                title={`Assigned to: ${assigneeName}`}
              >
                {getInitials(assigneeName)}
              </div>
            ) : (
              <div
                className="w-5 h-5 rounded-full border border-dashed border-[#1E3352] text-[#4A6480] flex items-center justify-center"
                title="Unassigned"
              >
                <User size={8} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ContentKanban({
  items,
  clients,
  employees,
  onItemUpdated,
  onCardClick,
}: ContentKanbanProps) {
  const supabase = createClient();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const itemId = String(active.id);
    const targetStatus = over.id as ContentItem['status'];

    const item = items.find((i) => i.id === itemId);
    if (!item) return;

    if (item.status === targetStatus) return;

    try {
      const { error } = await supabase
        .from('content_items')
        .update({
          status: targetStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', itemId);

      if (error) throw error;

      toast.success(`Content status moved to "${targetStatus.toUpperCase()}"`);
      onItemUpdated();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to update content status');
    }
  };

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="flex gap-4 items-start overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-[#1E3352] scrollbar-track-transparent">
        {COLUMNS.map((col) => {
          const colItems = items.filter((item) => item.status === col.status);

          return (
            <DroppableColumn
              key={col.id}
              id={col.id}
              label={col.label}
              count={colItems.length}
              colorClass={col.color}
            >
              {colItems.map((item) => {
                const client = clients.find((c) => c.id === item.client_id);
                const clientName = client?.name || 'Unknown Client';
                const assignee = employees.find((e) => e.id === item.assigned_to);
                const assigneeName = assignee?.full_name || '';
                const assigneeAvatar = assignee?.avatar_url || null;

                return (
                  <DraggableCard
                    key={item.id}
                    id={item.id}
                    item={item}
                    clientName={clientName}
                    assigneeName={assigneeName}
                    assigneeAvatar={assigneeAvatar}
                    onCardClick={onCardClick}
                  />
                );
              })}

              {colItems.length === 0 && (
                <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-[#1E3352]/20 rounded-[8px] p-6 text-center text-[10px] text-[#4A6480] min-h-[140px] select-none">
                  <CheckCircle2 size={16} className="mb-1 opacity-40 text-[#4A6480]" />
                  No items in stage
                </div>
              )}
            </DroppableColumn>
          );
        })}
      </div>
    </DndContext>
  );
}

export default ContentKanban;
