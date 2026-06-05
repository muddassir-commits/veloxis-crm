// app/api/integrations/gsc/property/route.ts
// POST /api/integrations/gsc/property — Set or update GSC Property URL for a client
// Body: { clientId, propertyUrl }

import { NextRequest, NextResponse } from 'next/server';
import { setGscPropertyUrl } from '@/lib/integrations/gsc';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { clientId, propertyUrl } = body as { clientId: string; propertyUrl: string };

    if (!clientId || !propertyUrl) {
      return NextResponse.json(
        { error: 'clientId and propertyUrl are required' },
        { status: 400 }
      );
    }

    await setGscPropertyUrl(clientId, propertyUrl);

    return NextResponse.json({ success: true, message: `GSC Property URL set to ${propertyUrl}` });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to update GSC property';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ status: 'GSC Property API — use POST to set property URL' });
}
