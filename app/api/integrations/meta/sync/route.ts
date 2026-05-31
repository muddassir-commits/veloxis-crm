// app/api/integrations/meta/sync/route.ts
// POST /api/integrations/meta/sync — Trigger Meta campaign data sync

import { NextRequest, NextResponse } from 'next/server';
import { syncMetaData } from '@/lib/integrations/meta';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { clientId, monthYear } = body as { clientId: string; monthYear?: string };

    if (!clientId) {
      return NextResponse.json({ error: 'clientId is required' }, { status: 400 });
    }

    const result = await syncMetaData(clientId, monthYear);

    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Meta sync failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
