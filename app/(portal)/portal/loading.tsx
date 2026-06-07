import { LoadingSkeleton } from '@/components/shared/loading-skeleton';

export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="bg-bg-light border border-border rounded-[10px] p-8 shadow-sm">
        <LoadingSkeleton rows={5} variant="table" className="[&_.skeleton]:bg-border" />
      </div>
    </div>
  );
}
