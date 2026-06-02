import { PageContainer } from '@/components/shared/page-container';
import { LoadingSkeleton } from '@/components/shared/loading-skeleton';

export default function Loading() {
  return (
    <PageContainer title="Syncing Workspace..." description="Veloxis operating hub is assembling live database configurations and third-party metrics.">
      <div className="rounded-lg border border-[#1E3352] bg-[#0D1829] p-8 shadow-sm">
        <LoadingSkeleton rows={6} variant="table" />
      </div>
    </PageContainer>
  );
}
