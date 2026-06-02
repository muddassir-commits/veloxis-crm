import { LoadingSkeleton } from '@/components/shared/loading-skeleton';

export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="bg-white border border-[#E2E8F4] rounded-[10px] p-8 shadow-sm">
        <LoadingSkeleton rows={5} variant="table" className="[&_.skeleton]:bg-[#E2E8F4]" />
      </div>
    </div>
  );
}
