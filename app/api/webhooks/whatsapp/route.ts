import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

// 1. GET: Verification trigger from Meta Business Portal
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || 'veloxis_verify_token';

  if (mode === 'subscribe' && token === verifyToken) {
    console.log('[WhatsApp Webhook Verified Successfully]');
    return new Response(challenge, { status: 200 });
  }

  return NextResponse.json({ error: 'Verification failed' }, { status: 403 });
}

// 2. POST: Handle message status receipts (delivered, read, replied)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Check if it's a status receipt
    const changes = body?.entry?.[0]?.changes?.[0]?.value;
    const statuses = changes?.statuses;

    if (!statuses || statuses.length === 0) {
      // Return 200 to acknowledge webhook even if empty status receipt
      return NextResponse.json({ success: true });
    }

    const statusObj = statuses[0];
    const { status } = statusObj; // 'delivered', 'read', 'failed'

    const supabase = createAdminClient();

    // Fetch the most recently created active WhatsApp campaign to update stats
    const { data: campaign, error: fetchErr } = await supabase
      .from('agency_whatsapp_campaigns')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fetchErr) throw fetchErr;

    if (!campaign) {
      return NextResponse.json({ message: 'No WhatsApp campaign found' }, { status: 200 });
    }

    const totalSent = campaign.messages_sent || 1;
    const totalDelivered = campaign.delivered || 1;

    switch (status) {
      case 'delivered': {
        const nextDelivered = (campaign.delivered || 0) + 1;
        const deliveryRate = Number(((nextDelivered / totalSent) * 100).toFixed(2));

        await supabase
          .from('agency_whatsapp_campaigns')
          .update({
            delivered: nextDelivered,
            delivery_rate: deliveryRate,
          })
          .eq('id', campaign.id);
        break;
      }

      case 'read': {
        const nextRead = (campaign.read_count || 0) + 1;
        const readRate = Number(((nextRead / totalDelivered) * 100).toFixed(2));

        await supabase
          .from('agency_whatsapp_campaigns')
          .update({
            read_count: nextRead,
            read_rate: readRate,
          })
          .eq('id', campaign.id);
        break;
      }

      case 'failed': {
        // Can be logged or ignored for counts
        break;
      }

      default:
        break;
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error('[WhatsApp Webhook Error]:', err);
    const message = err instanceof Error ? err.message : 'Failed to process WhatsApp webhook';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
