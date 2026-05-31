// app/api/integrations/ga4/sync/route.ts
// POST /api/integrations/ga4/sync — Trigger GA4 data sync for a client

import { NextRequest, NextResponse } from 'next/server';
import { syncGa4Data } from '@/lib/integrations/ga4';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { clientId, monthYear } = body as { clientId: string; monthYear?: string };

    if (!clientId) {
      return NextResponse.json({ error: 'clientId is required' }, { status: 400 });
    }

    const result = await syncGa4Data(clientId, monthYear);

    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'GA4 sync failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
