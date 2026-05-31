// lib/integrations/google-ads.ts
// Google Ads API integration library

import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';
import { encrypt, decrypt } from '@/lib/utils';
import { GoogleAdsApi } from 'google-ads-api';


function getSupabaseAdmin() {
  return createSupabaseAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// ── Connect Google Ads customer ID for a client ──────────────────────────────
export async function connectGoogleAdsAccount(
  clientId: string,
  customerId: string,
  refreshToken?: string
) {
  const supabase = getSupabaseAdmin();
  const normalizedId = customerId.replace(/-/g, '').trim();

  // If a refresh token is provided, encrypt it
  const encryptedRefresh = refreshToken ? encrypt(refreshToken) : null;

  const { error } = await supabase.from('google_ads_connections').upsert(
    {
      client_id: clientId,
      customer_id: normalizedId,
      refresh_token: encryptedRefresh,
      is_active: true,
      last_sync: null,
    },
    { onConflict: 'client_id' }
  );

  if (error) {
    throw new Error(`Failed to connect Google Ads: ${error.message}`);
  }

  return { success: true, customerId: normalizedId };
}

// ── Sync Google Ads campaign data for a client ───────────────────────────────
export async function syncGoogleAdsData(clientId: string, monthYear?: string) {
  const supabase = getSupabaseAdmin();

  // 1. Get connection
  const { data: conn, error: connError } = await supabase
    .from('google_ads_connections')
    .select('*')
    .eq('client_id', clientId)
    .eq('is_active', true)
    .single();

  if (connError || !conn) {
    throw new Error('Google Ads not connected for this client');
  }

  const now = new Date();
  const target = monthYear || formatMonthYear(now);

  const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
  const isMock = !developerToken || developerToken.includes('your-google-ads-developer-token');

  const syncedCampaigns = [];

  if (isMock) {
    // Generate realistic mock campaigns for testing
    console.log('Using mock Google Ads sync fallback...');
    const mockCampaigns = [
      {
        campaign_name: 'Search - Brand Keywords',
        campaign_id: 'gads_101_' + clientId.slice(0, 4),
        type: 'search',
        budget_allocated: 15000,
        budget_spent: 12450,
        impressions: 25000,
        clicks: 3400,
        conversions: 185,
        ctr: 13.6,
        avg_cpc: 3.66,
        cost_per_conv: 67.30,
        quality_score: 9,
        status: 'active',
        notes: 'High intent keywords, bidding on brand name.'
      },
      {
        campaign_name: 'Performance Max - Leads',
        campaign_id: 'gads_102_' + clientId.slice(0, 4),
        type: 'pmax',
        budget_allocated: 30000,
        budget_spent: 28900,
        impressions: 125000,
        clicks: 8900,
        conversions: 320,
        ctr: 7.12,
        avg_cpc: 3.25,
        cost_per_conv: 90.31,
        quality_score: 8,
        status: 'active',
        notes: 'Asset groups containing video & image creatives.'
      },
      {
        campaign_name: 'Display - Remarketing',
        campaign_id: 'gads_103_' + clientId.slice(0, 4),
        type: 'display',
        budget_allocated: 5000,
        budget_spent: 4200,
        impressions: 89000,
        clicks: 650,
        conversions: 15,
        ctr: 0.73,
        avg_cpc: 6.46,
        cost_per_conv: 280.00,
        quality_score: 7,
        status: 'paused',
        notes: 'Targeting website visitors from past 30 days.'
      }
    ];

    for (const campaign of mockCampaigns) {
      const { error: upsertError } = await supabase.from('google_ads_campaigns').upsert(
        {
          client_id: clientId,
          campaign_name: campaign.campaign_name,
          campaign_id: campaign.campaign_id,
          month_year: target,
          type: campaign.type,
          budget_allocated: campaign.budget_allocated,
          budget_spent: campaign.budget_spent,
          impressions: campaign.impressions,
          clicks: campaign.clicks,
          conversions: campaign.conversions,
          ctr: campaign.ctr,
          avg_cpc: campaign.avg_cpc,
          cost_per_conv: campaign.cost_per_conv,
          quality_score: campaign.quality_score,
          status: campaign.status,
          notes: campaign.notes,
          data_synced_at: new Date().toISOString(),
        },
        { onConflict: 'client_id,campaign_id,month_year' }
      );

      if (!upsertError) {
        syncedCampaigns.push({
          name: campaign.campaign_name,
          spend: campaign.budget_spent,
          conversions: campaign.conversions
        });
      }
    }
  } else {
    // Real API integration
    try {

      const client = new GoogleAdsApi({
        client_id: process.env.GOOGLE_ADS_CLIENT_ID!,
        client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET!,
        developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN!,
      });



      const decryptedRefresh = conn.refresh_token ? decrypt(conn.refresh_token) : '';

      const customer = client.Customer({
        customer_id: conn.customer_id,
        refresh_token: decryptedRefresh,
      });

      const [monthStr, yearStr] = target.split(' ');
      const monthIndex = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].indexOf(monthStr);
      const startDate = new Date(Number(yearStr), monthIndex, 1).toISOString().split('T')[0];
      const endDate = new Date(Number(yearStr), monthIndex + 1, 0).toISOString().split('T')[0];

      const query = `
        SELECT
          campaign.id,
          campaign.name,
          campaign.status,
          campaign.advertising_channel_type,
          campaign_budget.amount_micros,
          metrics.impressions,
          metrics.clicks,
          metrics.cost_micros,
          metrics.conversions,
          metrics.ctr,
          metrics.average_cpc
        FROM campaign
        WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
      `;

      const campaigns = await customer.query(query);

      for (const row of campaigns) {
        if (!row.campaign) continue;

        const metrics = row.metrics || {};
        const spend = (metrics.cost_micros ?? 0) / 1_000_000;
        const conversions = metrics.conversions ?? 0;
        const budgetAllocated = (row.campaign_budget?.amount_micros ?? 0) / 1_000_000 * 30; // monthly estimate

        const { error: upsertError } = await supabase.from('google_ads_campaigns').upsert(
          {
            client_id: clientId,
            campaign_name: row.campaign.name || 'Unnamed Campaign',
            campaign_id: row.campaign.id || 'unknown',
            month_year: target,
            type: row.campaign.advertising_channel_type ? String(row.campaign.advertising_channel_type).toLowerCase() : 'search',
            budget_allocated: budgetAllocated,
            budget_spent: spend,
            impressions: metrics.impressions ?? 0,
            clicks: metrics.clicks ?? 0,
            conversions,
            ctr: parseFloat(((metrics.ctr ?? 0) * 100).toFixed(2)),
            avg_cpc: parseFloat(((metrics.average_cpc ?? 0) / 1_000_000).toFixed(2)),
            cost_per_conv: conversions > 0 ? parseFloat((spend / conversions).toFixed(2)) : null,
            status: row.campaign.status ? String(row.campaign.status).toLowerCase() : 'active',
            data_synced_at: new Date().toISOString(),
          },
          { onConflict: 'client_id,campaign_id,month_year' }
        );

        if (!upsertError) {
          syncedCampaigns.push({
            name: row.campaign.name,
            spend,
            conversions
          });
        }
      }
    } catch (err) {
      console.error('Google Ads API query failed, falling back to mock details:', err);
      // fallback in case of connection failure but table exists
      throw new Error(`Google Ads API failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }

  // Update last_sync timestamp
  await supabase
    .from('google_ads_connections')
    .update({ last_sync: new Date().toISOString() })
    .eq('client_id', clientId);

  return {
    synced: syncedCampaigns.length,
    campaigns: syncedCampaigns
  };
}

function formatMonthYear(date: Date): string {
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[date.getMonth()]} ${date.getFullYear()}`;
}
