import { LoadingSkeleton } from '@/components/shared/loading-skeleton';

export default function Loading() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col gap-1.5 select-none">
        <div className="skeleton h-[18px] w-[25%] bg-[#132035]" />
        <div className="skeleton h-[11px] w-[45%] bg-[#132035]" />
      </div>
      <div className="rounded-lg border border-[#1E3352] bg-[#0D1829] p-8 shadow-sm">
        <LoadingSkeleton rows={5} variant="table" />
      </div>
    </div>
  );
}
