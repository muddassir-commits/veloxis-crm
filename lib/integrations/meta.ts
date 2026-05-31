// lib/integrations/meta.ts
// Meta Marketing API integration library
// Uses System User Token — no per-client OAuth needed

import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';

function getSupabaseAdmin() {
  return createSupabaseAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const META_BASE = `https://graph.facebook.com/${process.env.META_API_VERSION || 'v19.0'}`;

// ── Verify an Ad Account ID using the System User token ──────────────────────
export async function verifyMetaAdAccount(adAccountId: string): Promise<{
  name: string;
  id: string;
  currency: string;
  status: number;
}> {
  const normalizedId = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`;
  const url = `${META_BASE}/${normalizedId}?fields=id,name,currency,account_status&access_token=${process.env.META_SYSTEM_USER_TOKEN}`;

  const res = await fetch(url);
  const data = await res.json();

  if (data.error) {
    throw new Error(`Meta API error: ${data.error.message}`);
  }

  return {
    name: data.name,
    id: data.id,
    currency: data.currency,
    status: data.account_status, // 1 = active
  };
}

// ── Connect Meta Ads for a client ────────────────────────────────────────────
export async function connectMetaAdAccount(clientId: string, adAccountId: string) {
  const supabase = getSupabaseAdmin();

  // Validate the ad account is accessible
  const account = await verifyMetaAdAccount(adAccountId);
  const normalizedId = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`;

  await supabase.from('meta_connections').upsert(
    {
      client_id: clientId,
      ad_account_id: normalizedId,
      access_token: null, // System user token used globally, not stored per-client
      is_active: true,
      last_sync: null,
    },
    { onConflict: 'client_id' }
  );

  return { success: true, accountName: account.name, accountId: normalizedId };
}

// ── Sync Meta campaign data for a client ─────────────────────────────────────
export async function syncMetaData(clientId: string, monthYear?: string) {
  const supabase = getSupabaseAdmin();

  // 1. Get connection
  const { data: conn, error: connError } = await supabase
    .from('meta_connections')
    .select('*')
    .eq('client_id', clientId)
    .eq('is_active', true)
    .single();

  if (connError || !conn) {
    throw new Error('Meta Ads not connected for this client');
  }

  // 2. Determine date range
  const now = new Date();
  const target = monthYear || formatMonthYear(now);
  const [month, year] = target.split(' ');
  const monthIndex = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].indexOf(month);
  const startDate = new Date(Number(year), monthIndex, 1).toISOString().split('T')[0];
  const endDate = new Date(Number(year), monthIndex + 1, 0).toISOString().split('T')[0];

  // 3. Fetch campaigns from Meta Graph API
  const fields = [
    'id',
    'name',
    'status',
    'objective',
    `insights.time_range({"since":"${startDate}","until":"${endDate}"}){spend,impressions,reach,clicks,actions,ctr,cpm,cpp}`,
  ].join(',');

  const url = `${META_BASE}/${conn.ad_account_id}/campaigns?fields=${encodeURIComponent(fields)}&access_token=${process.env.META_SYSTEM_USER_TOKEN}&limit=50`;

  const res = await fetch(url);
  const data = await res.json();

  if (data.error) {
    throw new Error(`Meta API error: ${data.error.message}`);
  }

  const campaigns = data.data ?? [];
  const syncedCampaigns = [];

  for (const campaign of campaigns) {
    const insights = campaign.insights?.data?.[0] || {};

    const spend = parseFloat(insights.spend ?? '0');
    const impressions = parseInt(insights.impressions ?? '0');
    const reach = parseInt(insights.reach ?? '0');
    const clicks = parseInt(insights.clicks ?? '0');
    const ctr = parseFloat(insights.ctr ?? '0');
    const cpm = parseFloat(insights.cpm ?? '0');

    // Extract lead count from actions
    const actions: Array<{ action_type: string; value: string }> = insights.actions ?? [];
    const leadAction = actions.find((a) => a.action_type === 'lead' || a.action_type === 'onsite_conversion.lead_grouped');
    const leads = leadAction ? parseInt(leadAction.value) : 0;
    const cpl = leads > 0 ? spend / leads : null;

    // Upsert into meta_campaigns table
    const { error: upsertError } = await supabase.from('meta_campaigns').upsert(
      {
        client_id: clientId,
        campaign_name: campaign.name,
        campaign_id: campaign.id,
        month_year: target,
        objective: campaign.objective || null,
        platform: 'meta',
        budget_allocated: 0, // Can be updated manually
        budget_spent: spend,
        impressions,
        reach,
        clicks,
        leads,
        cpl: cpl ? parseFloat(cpl.toFixed(2)) : null,
        ctr: parseFloat(ctr.toFixed(2)),
        cpm: parseFloat(cpm.toFixed(2)),
        status: campaign.status?.toLowerCase() || 'unknown',
        data_synced_at: new Date().toISOString(),
      },
      { onConflict: 'client_id,campaign_id,month_year' }
    );

    if (!upsertError) {
      syncedCampaigns.push({ name: campaign.name, spend, leads });
    }
  }

  // 4. Update last_sync
  await supabase
    .from('meta_connections')
    .update({ last_sync: new Date().toISOString() })
    .eq('client_id', clientId);

  return {
    synced: syncedCampaigns.length,
    totalCampaigns: campaigns.length,
    campaigns: syncedCampaigns,
  };
}

// ── Helper ─────────────────────────────────────────────────────────────────────
function formatMonthYear(date: Date): string {
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[date.getMonth()]} ${date.getFullYear()}`;
}
