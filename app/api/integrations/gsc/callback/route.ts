// app/api/integrations/gsc/callback/route.ts
// GET /api/integrations/gsc/callback
// Google redirects here after user approves OAuth

import { NextRequest, NextResponse } from 'next/server';
import { handleGoogleOAuthCallback } from '@/lib/integrations/gsc';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const stateStr = searchParams.get('state');
  const error = searchParams.get('error');

  // User denied access
  if (error) {
    return NextResponse.redirect(
      new URL(`/dashboard/clients?oauth_error=${encodeURIComponent(error)}`, request.url)
    );
  }

  if (!code || !stateStr) {
    return NextResponse.redirect(
      new URL('/dashboard/clients?oauth_error=missing_code', request.url)
    );
  }

  try {
    const state = JSON.parse(stateStr) as { clientId: string; service: 'gsc' | 'ga4' };
    const result = await handleGoogleOAuthCallback(code, state.clientId, state.service);

    // Redirect back to the client's SEO tab with success
    const redirectUrl = new URL(
      `/dashboard/clients/${state.clientId}?tab=seo&oauth_success=${result.service}`,
      request.url
    );

    if (result.service === 'gsc' && result.propertyUrl) {
      redirectUrl.searchParams.set('property', encodeURIComponent(result.propertyUrl));
    }

    return NextResponse.redirect(redirectUrl);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'OAuth callback failed';
    const fallbackUrl = new URL(
      `/dashboard/clients?oauth_error=${encodeURIComponent(msg)}`,
      request.url
    );
    return NextResponse.redirect(fallbackUrl);
  }
}
