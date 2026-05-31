// app/api/integrations/gsc/route.ts
// POST /api/integrations/gsc — Start OAuth flow (returns auth URL)
// Supports ?service=gsc (default) or ?service=ga4

import { NextRequest, NextResponse } from 'next/server';
import { getGoogleAuthUrl } from '@/lib/integrations/gsc';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { clientId, service = 'gsc' } = body as { clientId: string; service?: 'gsc' | 'ga4' };

    if (!clientId) {
      return NextResponse.json({ error: 'clientId is required' }, { status: 400 });
    }

    const authUrl = getGoogleAuthUrl(clientId, service);

    return NextResponse.json({ authUrl });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ status: 'GSC Integration API — use POST to get auth URL' });
}
