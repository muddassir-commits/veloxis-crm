// app/api/integrations/ga4/sync/[clientId]/route.ts
// POST /api/integrations/ga4/sync/[clientId] — Pull GA4 data and update seo_campaigns

import { NextRequest, NextResponse } from 'next/server';
import { syncGa4Data } from '@/lib/integrations/ga4';
import { createClient } from '@/lib/supabase/server';

export const revalidate = 0;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const { clientId } = await params;

    if (!clientId) {
      return NextResponse.json({ error: 'clientId is required' }, { status: 400 });
    }

    // Auth check: verify either the CRON_SECRET or an active admin session
    let isAuthorized = false;
    const secret = request.headers.get('x-cron-secret');
    if (secret && secret === process.env.CRON_SECRET) {
      isAuthorized = true;
    }

    const supabase = await createClient();

    if (!isAuthorized) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();
        if (profile && profile.role === 'admin') {
          isAuthorized = true;
        }
      }
    }

    if (!isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await syncGa4Data(clientId);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'GA4 sync failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
