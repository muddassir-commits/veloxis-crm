import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate user and verify admin role
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    const adminSupabase = createAdminClient();
    const { data: profile, error: profileError } = await adminSupabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 403 });
    }

    // 2. Parse payload
    const { type, payload } = await req.json();

    if (!type || !payload) {
      return NextResponse.json({ error: 'Missing required parameters: type and payload' }, { status: 400 });
    }

    // 3. Process insert based on type
    if (type === 'social') {
      const {
        client_id,
        platform,
        month_year,
        followers,
        new_followers,
        reach,
        impressions,
        engagements,
        posts_published,
        profile_visits,
        website_clicks,
      } = payload;

      if (!client_id || !platform || !month_year) {
        return NextResponse.json({ error: 'Missing client_id, platform, or month_year' }, { status: 400 });
      }

      // Calculate engagement rate: (engagements / impressions) * 100
      const engagement_rate = impressions > 0 ? Number(((engagements / impressions) * 100).toFixed(2)) : 0;

      const { data, error } = await adminSupabase
        .from('social_media_metrics')
        .insert({
          client_id,
          platform,
          month_year,
          followers: Number(followers || 0),
          new_followers: Number(new_followers || 0),
          reach: Number(reach || 0),
          impressions: Number(impressions || 0),
          engagements: Number(engagements || 0),
          engagement_rate,
          posts_published: Number(posts_published || 0),
          profile_visits: Number(profile_visits || 0),
          website_clicks: Number(website_clicks || 0),
        })
        .select('*')
        .single();

      if (error) throw error;
      return NextResponse.json({ success: true, data });

    } else if (type === 'ad') {
      const {
        platform,
        campaign_name,
        campaign_id,
        month_year,
        objective,
        budget_allocated,
        budget_spent,
        impressions,
        clicks,
        leads,
        status,
        notes,
      } = payload;

      if (!platform || !campaign_name || !month_year) {
        return NextResponse.json({ error: 'Missing platform, campaign_name, or month_year' }, { status: 400 });
      }

      const spent = Number(budget_spent || 0);
      const leadCount = Number(leads || 0);
      const clickCount = Number(clicks || 0);
      const impCount = Number(impressions || 0);

      // Auto-calculations
      const cpl = leadCount > 0 ? Number((spent / leadCount).toFixed(2)) : 0;
      const ctr = impCount > 0 ? Number(((clickCount / impCount) * 100).toFixed(2)) : 0;
      const cpm = impCount > 0 ? Number(((spent / impCount) * 1000).toFixed(2)) : 0;

      const { data, error } = await adminSupabase
        .from('agency_own_ad_campaigns')
        .insert({
          platform,
          campaign_name,
          campaign_id: campaign_id || null,
          month_year,
          objective: objective || null,
          budget_allocated: Number(budget_allocated || 0),
          budget_spent: spent,
          impressions: impCount,
          clicks: clickCount,
          leads: leadCount,
          cpl,
          ctr,
          cpm,
          status: status || 'active',
          notes: notes || null,
        })
        .select('*')
        .single();

      if (error) throw error;
      return NextResponse.json({ success: true, data });

    } else if (type === 'email') {
      const {
        name,
        subject,
        month_year,
        campaign_type,
        provider,
        emails_sent,
        delivered,
        opened,
        clicked,
        unsubscribed,
        bounced,
        notes,
        status,
        resend_email_id,
      } = payload;

      if (!name || !month_year) {
        return NextResponse.json({ error: 'Missing name or month_year' }, { status: 400 });
      }

      const delCount = Number(delivered || 0);
      const openCount = Number(opened || 0);
      const clickCount = Number(clicked || 0);

      // Auto-calculations
      const open_rate = delCount > 0 ? Number(((openCount / delCount) * 100).toFixed(2)) : 0;
      const click_rate = delCount > 0 ? Number(((clickCount / delCount) * 100).toFixed(2)) : 0;

      const { data, error } = await adminSupabase
        .from('agency_email_campaigns')
        .insert({
          name,
          subject: subject || null,
          month_year,
          campaign_type: campaign_type || 'newsletter',
          provider: provider || 'resend',
          emails_sent: Number(emails_sent || 0),
          delivered: delCount,
          opened: openCount,
          clicked: clickCount,
          unsubscribed: Number(unsubscribed || 0),
          bounced: Number(bounced || 0),
          open_rate,
          click_rate,
          notes: notes || null,
          status: status || 'sent',
          resend_email_id: resend_email_id || null,
          sent_at: status === 'sent' ? new Date().toISOString() : null,
        })
        .select('*')
        .single();

      if (error) throw error;
      return NextResponse.json({ success: true, data });

    } else if (type === 'whatsapp') {
      const {
        name,
        month_year,
        campaign_type,
        template_name,
        messages_sent,
        delivered,
        read_count,
        replied,
        status,
        notes,
      } = payload;

      if (!name || !month_year) {
        return NextResponse.json({ error: 'Missing name or month_year' }, { status: 400 });
      }

      const sentCount = Number(messages_sent || 0);
      const delCount = Number(delivered || 0);
      const rCount = Number(read_count || 0);
      const repCount = Number(replied || 0);

      // Auto-calculations
      const delivery_rate = sentCount > 0 ? Number(((delCount / sentCount) * 100).toFixed(2)) : 0;
      const read_rate = sentCount > 0 ? Number(((rCount / sentCount) * 100).toFixed(2)) : 0;
      const reply_rate = sentCount > 0 ? Number(((repCount / sentCount) * 100).toFixed(2)) : 0;

      const { data, error } = await adminSupabase
        .from('agency_whatsapp_campaigns')
        .insert({
          name,
          month_year,
          campaign_type: campaign_type || 'broadcast',
          template_name: template_name || null,
          messages_sent: sentCount,
          delivered: delCount,
          read_count: rCount,
          replied: repCount,
          delivery_rate,
          read_rate,
          reply_rate,
          status: status || 'active',
          notes: notes || null,
        })
        .select('*')
        .single();

      if (error) throw error;
      return NextResponse.json({ success: true, data });

    } else {
      return NextResponse.json({ error: `Invalid campaign type: ${type}` }, { status: 400 });
    }
  } catch (err: unknown) {
    console.error('Agency logging API error:', err);
    const message = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
