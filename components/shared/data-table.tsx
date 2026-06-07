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
      <div className="w-full overflow-x-auto border border-border/30 rounded-[10px] bg-bg-card p-[20px]">
        <div className="min-w-full">
          <LoadingSkeleton rows={5} columns={columns.length + (rowActions ? 1 : 0)} height={24} />
        </div>
      </div>
    );
  }

  // If empty, render EmptyState component
  if (!data || data.length === 0) {
    return (
      <div className="w-full border border-border/30 rounded-[10px] bg-bg-card overflow-hidden">
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
    <div className="w-full overflow-x-auto border border-border/30 rounded-[10px] bg-bg-card shadow-sm select-none">
      <table className={cn("w-full border-collapse text-left", className)} {...props}>
        <thead>
          <tr className="border-b border-border/30 bg-bg-card">
            {columns.map((col) => (
              <th
                key={col.key}
                className="p-4 text-[11px] font-semibold text-text-tertiary uppercase tracking-[0.06em] whitespace-nowrap"
                style={{ width: col.width }}
              >
                {col.header}
              </th>
            ))}
            {rowActions && (
              <th className="p-4 text-[11px] font-semibold text-text-tertiary uppercase tracking-[0.06em] text-right w-[60px]">
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
                "group text-[13px] text-text-secondary transition-colors duration-150",
                onRowClick ? "hover:bg-bg-card-hover/20 hover:text-text-primary cursor-pointer" : "hover:bg-bg-card-hover/20/50"
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
                          <button className="text-text-secondary hover:text-text-primary p-1 rounded hover:bg-bg-card-hover/40 transition-all cursor-pointer">
                            <MoreHorizontal size={16} className="stroke-[1.5]" />
                          </button>
                        }
                      />
                      <DropdownMenuContent
                        align="end"
                        className="bg-bg-card border-border/30 text-text-primary shadow-xl p-1 w-36 z-40"
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
