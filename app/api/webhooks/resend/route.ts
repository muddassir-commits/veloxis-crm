import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, data } = body;

    // Resend webhook format usually sends:
    // { type: "email.opened", data: { email_id: "...", created_at: "..." } }
    if (!type || !data || !data.email_id) {
      return NextResponse.json({ error: 'Missing type or email_id' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Find email campaign by resend_email_id
    const { data: campaign, error: fetchErr } = await supabase
      .from('agency_email_campaigns')
      .select('*')
      .eq('resend_email_id', data.email_id)
      .maybeSingle();

    if (fetchErr) throw fetchErr;

    if (!campaign) {
      // If no matching campaign found, just return 200 to acknowledge Resend webhook
      return NextResponse.json({ message: 'No matching campaign found' }, { status: 200 });
    }

    const totalDelivered = campaign.delivered || campaign.emails_sent || 1;

    switch (type) {
      case 'email.opened': {
        const nextOpened = (campaign.opened || 0) + 1;
        const openRate = Number(((nextOpened / totalDelivered) * 100).toFixed(2));
        
        await supabase
          .from('agency_email_campaigns')
          .update({
            opened: nextOpened,
            open_rate: openRate,
          })
          .eq('id', campaign.id);
        break;
      }

      case 'email.clicked': {
        const nextClicked = (campaign.clicked || 0) + 1;
        const clickRate = Number(((nextClicked / totalDelivered) * 100).toFixed(2));
        
        await supabase
          .from('agency_email_campaigns')
          .update({
            clicked: nextClicked,
            click_rate: clickRate,
          })
          .eq('id', campaign.id);
        break;
      }

      case 'email.bounced': {
        await supabase
          .from('agency_email_campaigns')
          .update({
            bounced: (campaign.bounced || 0) + 1,
          })
          .eq('id', campaign.id);
        break;
      }

      case 'email.unsubscribed': {
        await supabase
          .from('agency_email_campaigns')
          .update({
            unsubscribed: (campaign.unsubscribed || 0) + 1,
          })
          .eq('id', campaign.id);
        break;
      }

      default:
        console.warn(`[Resend Webhook]: Unhandled event type: ${type}`);
        break;
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error('[Resend Webhook Error]:', err);
    const message = err instanceof Error ? err.message : 'Failed to process Resend webhook';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
