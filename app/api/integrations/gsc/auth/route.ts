// app/api/integrations/gsc/auth/route.ts
// GET /api/integrations/gsc/auth?client_id=X&service=gsc|ga4 — Redirects directly to Google OAuth consent screen

import { NextRequest, NextResponse } from 'next/server';
import { getGoogleAuthUrl } from '@/lib/integrations/gsc';

export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('client_id');
    const service = (searchParams.get('service') || 'gsc') as 'gsc' | 'ga4';

    if (!clientId) {
      return NextResponse.json({ error: 'client_id is required' }, { status: 400 });
    }

    const origin = request.nextUrl.origin;
    const redirectUri = `${origin}/api/integrations/gsc/callback`;
    const authUrl = getGoogleAuthUrl(clientId, service, redirectUri);

    return NextResponse.redirect(authUrl);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error starting OAuth flow';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
