// app/api/integrations/ga4/sync/[clientId]/route.ts
// POST /api/integrations/ga4/sync/[clientId] — Pull GA4 data and update seo_campaigns

import { NextRequest, NextResponse } from 'next/server';
import { syncGa4Data } from '@/lib/integrations/ga4';

export const revalidate = 0;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const { clientId } = await params;

    if (!clientId) {
      return NextResponse.json({ error: 'clientId is required' }, { status: 400 });
    }

    const result = await syncGa4Data(clientId);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'GA4 sync failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
