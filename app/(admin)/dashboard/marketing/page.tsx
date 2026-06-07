import { PageContainer } from '@/components/shared/page-container';
import { Card } from '@/components/ui/card';

export default function Page() {
  return (
    <PageContainer title="Marketing" description="Monitor marketing campaigns and analytics.">
      <Card variant="default" className="p-8 text-center text-text-secondary select-none">
        Marketing content is coming soon.
      </Card>
    </PageContainer>
  );
}
