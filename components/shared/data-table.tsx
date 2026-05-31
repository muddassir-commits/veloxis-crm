import React from 'react';
import { MoreHorizontal, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LoadingSkeleton } from './loading-skeleton';
import { EmptyState } from './empty-state';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface TableColumn {
  key: string;
  header: React.ReactNode;
  width?: string | number;
  render?: (value: unknown, row: Record<string, unknown>) => React.ReactNode;
}

interface DataTableProps extends React.TableHTMLAttributes<HTMLTableElement> {
  columns: TableColumn[];
  data: Array<Record<string, unknown>>;
  loading?: boolean;
  onRowClick?: (row: Record<string, unknown>) => void;
  emptyState?: {
    icon?: LucideIcon;
    title: string;
    description: string;
    actionLabel?: string;
    onAction?: () => void;
  };
  rowActions?: (row: Record<string, unknown>) => React.ReactNode; // Optional custom dropdown content/action nodes
}

export function DataTable({
  columns,
  data,
  loading = false,
  onRowClick,
  emptyState,
  rowActions,
  className,
  ...props
}: DataTableProps) {
  // If loading, render LoadingSkeleton inside a clean table skeleton shell
  if (loading) {
    return (
      <div className="w-full overflow-x-auto border border-[#1E3352] rounded-[10px] bg-[#0D1829] p-[20px]">
        <div className="min-w-full">
          <LoadingSkeleton rows={5} columns={columns.length + (rowActions ? 1 : 0)} height={24} />
        </div>
      </div>
    );
  }

  // If empty, render EmptyState component
  if (!data || data.length === 0) {
    return (
      <div className="w-full border border-[#1E3352] rounded-[10px] bg-[#0D1829] overflow-hidden">
        {emptyState ? (
          <EmptyState
            icon={emptyState.icon}
            title={emptyState.title}
            description={emptyState.description}
            actionLabel={emptyState.actionLabel}
            onAction={emptyState.onAction}
          />
        ) : (
          <EmptyState
            title="No data available"
            description="There are currently no records to display."
          />
        )}
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto border border-[#1E3352] rounded-[10px] bg-[#0D1829] shadow-sm select-none">
      <table className={cn("w-full border-collapse text-left", className)} {...props}>
        <thead>
          <tr className="border-b border-[#1E3352] bg-[#0D1829]">
            {columns.map((col) => (
              <th
                key={col.key}
                className="p-4 text-[11px] font-semibold text-[#4A6480] uppercase tracking-[0.06em] whitespace-nowrap"
                style={{ width: col.width }}
              >
                {col.header}
              </th>
            ))}
            {rowActions && (
              <th className="p-4 text-[11px] font-semibold text-[#4A6480] uppercase tracking-[0.06em] text-right w-[60px]">
                Actions
              </th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#1E3352]/30">
          {data.map((row, rowIndex) => (
            <tr
              key={typeof row.id === 'string' ? row.id : rowIndex}
              onClick={() => onRowClick && onRowClick(row)}
              className={cn(
                "group text-[13px] text-[#8BA3C7] transition-colors duration-150",
                onRowClick ? "hover:bg-[#132035] hover:text-[#F0F4FF] cursor-pointer" : "hover:bg-[#132035]/50"
              )}
            >
              {columns.map((col) => {
                const cellValue = row[col.key];
                return (
                  <td key={col.key} className="p-4 align-middle whitespace-nowrap">
                    {col.render ? col.render(cellValue, row) : (cellValue !== null && cellValue !== undefined ? String(cellValue) : '-')}
                  </td>
                );
              })}
              {rowActions && (
                <td
                  className="p-4 align-middle text-right"
                  onClick={(e) => {
                    // Prevent row click navigation when clicking actions
                    e.stopPropagation();
                  }}
                >
                  <div className="inline-flex opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <button className="text-[#8BA3C7] hover:text-[#F0F4FF] p-1 rounded hover:bg-[#1A2D47] transition-all cursor-pointer">
                            <MoreHorizontal size={16} className="stroke-[1.5]" />
                          </button>
                        }
                      />
                      <DropdownMenuContent
                        align="end"
                        className="bg-[#0D1829] border-[#1E3352] text-[#F0F4FF] shadow-xl p-1 w-36 z-40"
                      >
                        {rowActions(row)}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
export default DataTable;
