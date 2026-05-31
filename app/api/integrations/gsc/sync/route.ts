// app/api/integrations/gsc/sync/route.ts
// POST /api/integrations/gsc/sync — Manually trigger GSC data sync for a client

import { NextRequest, NextResponse } from 'next/server';
import { syncGscData } from '@/lib/integrations/gsc';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { clientId, monthYear } = body as { clientId: string; monthYear?: string };

    if (!clientId) {
      return NextResponse.json({ error: 'clientId is required' }, { status: 400 });
    }

    const result = await syncGscData(clientId, monthYear);

    return NextResponse.json({
      success: true,
      synced: result,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Sync failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
