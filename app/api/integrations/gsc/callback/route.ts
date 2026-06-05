// app/api/integrations/gsc/callback/route.ts
// GET /api/integrations/gsc/callback
// Google redirects here after user approves OAuth

import { NextRequest, NextResponse } from 'next/server';
import { handleGoogleOAuthCallback } from '@/lib/integrations/gsc';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const stateStr = searchParams.get('state');
  const error = searchParams.get('error');

  // Parse state early to identify the client ID
  let clientId: string | null = null;
  let service: 'gsc' | 'ga4' = 'gsc';
  if (stateStr) {
    try {
      const state = JSON.parse(stateStr) as { clientId: string; service: 'gsc' | 'ga4' };
      clientId = state.clientId;
      service = state.service;
    } catch (e) {
      console.error('Failed to parse state in OAuth callback:', e);
    }
  }

  // Helper to get error/success redirect path based on client type
  const getRedirectPath = async () => {
    if (!clientId) return '/dashboard/clients';
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      const { data: client } = await supabase
        .from('clients')
        .select('is_agency_self')
        .eq('id', clientId)
        .single();

      if (client?.is_agency_self) {
        return '/dashboard/my-agency';
      }
      return `/dashboard/clients/${clientId}`;
    } catch (e) {
      console.error('Failed to fetch client in OAuth redirect logic:', e);
      return `/dashboard/clients/${clientId}`;
    }
  };

  // User denied access
  if (error) {
    const redirectPath = await getRedirectPath();
    const redirectUrl = new URL(redirectPath, request.url);
    redirectUrl.searchParams.set('tab', 'seo');
    redirectUrl.searchParams.set('oauth_error', error);
    return NextResponse.redirect(redirectUrl);
  }

  if (!code || !clientId) {
    const redirectPath = await getRedirectPath();
    const redirectUrl = new URL(redirectPath, request.url);
    redirectUrl.searchParams.set('tab', 'seo');
    redirectUrl.searchParams.set('oauth_error', 'missing_code_or_client');
    return NextResponse.redirect(redirectUrl);
  }

  try {
    const origin = request.nextUrl.origin;
    const redirectUri = `${origin}/api/integrations/gsc/callback`;
    const result = await handleGoogleOAuthCallback(code, clientId, service, redirectUri);

    const redirectPath = await getRedirectPath();
    const redirectUrl = new URL(redirectPath, request.url);
    redirectUrl.searchParams.set('tab', 'seo');
    redirectUrl.searchParams.set('oauth_success', result.service);

    if (result.service === 'gsc' && result.propertyUrl) {
      redirectUrl.searchParams.set('property', result.propertyUrl);
    }

    return NextResponse.redirect(redirectUrl);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'OAuth callback failed';
    const redirectPath = await getRedirectPath();
    const redirectUrl = new URL(redirectPath, request.url);
    redirectUrl.searchParams.set('tab', 'seo');
    redirectUrl.searchParams.set('oauth_error', msg);
    return NextResponse.redirect(redirectUrl);
  }
}

