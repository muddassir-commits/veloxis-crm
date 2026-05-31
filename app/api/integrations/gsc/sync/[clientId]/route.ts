// app/api/integrations/gsc/sync/[clientId]/route.ts
// POST /api/integrations/gsc/sync/[clientId] — Pull GSC data and update seo_campaigns/seo_keywords

import { NextRequest, NextResponse } from 'next/server';
import { syncGscData } from '@/lib/integrations/gsc';
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

    const supabase = await createClient();
    // Get client name to return
    const { data: client } = await supabase
      .from('clients')
      .select('name')
      .eq('id', clientId)
      .single();

    const result = await syncGscData(clientId);

    return NextResponse.json({
      synced: true,
      client: client?.name || 'Unknown',
      data: result,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'GSC sync failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
