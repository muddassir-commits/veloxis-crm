// app/api/integrations/gsc/sync/route.ts
// POST /api/integrations/gsc/sync — Manually trigger GSC data sync for a client

import { NextRequest, NextResponse } from 'next/server';
import { syncGscData } from '@/lib/integrations/gsc';
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

    const result = await syncGscData(clientId, monthYear);

    return NextResponse.json({
      success: true,
      synced: result,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Sync failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
