import { LoadingSkeleton } from '@/components/shared/loading-skeleton';

export default function Loading() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col gap-1.5 select-none">
        <div className="skeleton h-[18px] w-[25%] bg-bg-elevated" />
        <div className="skeleton h-[11px] w-[45%] bg-bg-elevated" />
      </div>
      <div className="rounded-lg border border-border bg-bg-darker p-8 shadow-sm">
        <LoadingSkeleton rows={5} variant="table" />
      </div>
    </div>
  );
}
