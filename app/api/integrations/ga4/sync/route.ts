// app/api/integrations/ga4/sync/route.ts
// POST /api/integrations/ga4/sync — Trigger GA4 data sync for a client

import { NextRequest, NextResponse } from 'next/server';
import { syncGa4Data } from '@/lib/integrations/ga4';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { clientId, monthYear } = body as { clientId: string; monthYear?: string };

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

    const result = await syncGa4Data(clientId, monthYear);

    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'GA4 sync failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
