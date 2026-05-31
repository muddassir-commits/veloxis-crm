// app/api/integrations/google-ads/connect/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { connectGoogleAdsAccount } from '@/lib/integrations/google-ads';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { clientId, customerId, refreshToken } = body as {
      clientId: string;
      customerId: string;
      refreshToken?: string;
    };

    if (!clientId || !customerId) {
      return NextResponse.json(
        { error: 'clientId and customerId are required' },
        { status: 400 }
      );
    }

    const result = await connectGoogleAdsAccount(clientId, customerId, refreshToken);
    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to connect Google Ads';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
