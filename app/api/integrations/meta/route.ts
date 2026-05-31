// app/api/integrations/meta/route.ts
// POST /api/integrations/meta/connect — Connect Meta Ads account for a client
// Body: { clientId, adAccountId }

import { NextRequest, NextResponse } from 'next/server';
import { connectMetaAdAccount } from '@/lib/integrations/meta';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { clientId, adAccountId } = body as { clientId: string; adAccountId: string };

    if (!clientId || !adAccountId) {
      return NextResponse.json(
        { error: 'clientId and adAccountId are required' },
        { status: 400 }
      );
    }

    const result = await connectMetaAdAccount(clientId, adAccountId);

    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to connect Meta Ads';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ status: 'Meta Integration API — use POST to connect ad account' });
}
