// app/api/integrations/ga4/route.ts
// POST /api/integrations/ga4/property — Set or update GA4 Property ID for a client
// Body: { clientId, propertyId }

import { NextRequest, NextResponse } from 'next/server';
import { setGa4PropertyId } from '@/lib/integrations/ga4';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { clientId, propertyId } = body as { clientId: string; propertyId: string };

    if (!clientId || !propertyId) {
      return NextResponse.json(
        { error: 'clientId and propertyId are required' },
        { status: 400 }
      );
    }

    await setGa4PropertyId(clientId, propertyId);

    return NextResponse.json({ success: true, message: `GA4 Property ID set to ${propertyId}` });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to update GA4 property';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ status: 'GA4 Integration API — use POST to set property ID' });
}
