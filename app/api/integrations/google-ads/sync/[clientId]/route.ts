// app/api/integrations/google-ads/sync/[clientId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { syncGoogleAdsData } from '@/lib/integrations/google-ads';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const { clientId } = await params;
    const body = await request.json().catch(() => ({}));
    const { monthYear } = body as { monthYear?: string };

    if (!clientId) {
      return NextResponse.json({ error: 'clientId is required' }, { status: 400 });
    }

    const result = await syncGoogleAdsData(clientId, monthYear);
    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Google Ads sync failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
