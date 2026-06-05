// lib/integrations/ga4.ts
// Google Analytics 4 Data API integration library

import { google } from 'googleapis';
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';
import { decrypt, encrypt } from '@/lib/utils';
import { buildOAuth2Client } from './gsc';

function getSupabaseAdmin() {
  return createSupabaseAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// ── Sync GA4 data for a client into seo_campaigns ────────────────────────────
export async function syncGa4Data(clientId: string, monthYear?: string) {
  const supabase = getSupabaseAdmin();

  // 1. Get connection
  const { data: conn, error: connError } = await supabase
    .from('ga4_connections')
    .select('*')
    .eq('client_id', clientId)
    .eq('is_active', true)
    .single();

  if (connError || !conn || !conn.property_id) {
    throw new Error('GA4 not connected or property ID not set for this client');
  }

  // 2. Build OAuth2 client with stored tokens
  const oauth2Client = buildOAuth2Client();
  oauth2Client.setCredentials({
    access_token: decrypt(conn.access_token || ''),
    refresh_token: decrypt(conn.refresh_token || ''),
  });

  // Auto-save refreshed tokens
  oauth2Client.on('tokens', async (tokens) => {
    const updates: Record<string, string> = {};
    if (tokens.access_token) updates.access_token = encrypt(tokens.access_token);
    if (tokens.expiry_date) updates.token_expires = new Date(tokens.expiry_date).toISOString();
    if (tokens.refresh_token) updates.refresh_token = encrypt(tokens.refresh_token);
    if (Object.keys(updates).length > 0) {
      await supabase.from('ga4_connections').update(updates).eq('client_id', clientId);
    }
  });

  // 3. Determine date range
  const now = new Date();
  const target = monthYear || formatMonthYear(now);
  const [month, year] = target.split(' ');
  const monthIndex = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].indexOf(month);
  const startDate = new Date(Number(year), monthIndex, 1).toISOString().split('T')[0];
  const endDate = new Date(Number(year), monthIndex + 1, 0).toISOString().split('T')[0];

  // 4. Use googleapis analyticsdata (v1beta) — no extra package needed
  const analyticsdata = google.analyticsdata({ version: 'v1beta', auth: oauth2Client });

  const response = await analyticsdata.properties.runReport({
    property: `properties/${conn.property_id}`,
    requestBody: {
      dateRanges: [{ startDate, endDate }],
      metrics: [
        { name: 'sessions' },
        { name: 'newUsers' },
        { name: 'screenPageViews' },
        { name: 'conversions' },
      ],
      dimensions: [{ name: 'sessionDefaultChannelGroup' }],
    },
  });

  const rows = response.data.rows ?? [];

  // 5. Aggregate totals
  let totalSessions = 0;
  let totalNewUsers = 0;
  let totalConversions = 0;
  let organicTraffic = 0;

  for (const row of rows) {
    const channel = row.dimensionValues?.[0]?.value || '';
    const sessions = parseInt(row.metricValues?.[0]?.value ?? '0');
    const newUsers = parseInt(row.metricValues?.[1]?.value ?? '0');
    const conversions = parseInt(row.metricValues?.[3]?.value ?? '0');

    totalSessions += sessions;
    totalNewUsers += newUsers;
    totalConversions += conversions;

    if (channel.toLowerCase().includes('organic search') || channel.toLowerCase() === 'organic search') {
      organicTraffic += sessions;
    }
  }

  // Fetch previous month's organic traffic to set organic_traffic_prev
  const prevDate = new Date(Number(year), monthIndex - 1, 1);
  const prevMonths = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const prevMonthYear = `${prevMonths[prevDate.getMonth()]} ${prevDate.getFullYear()}`;

  const { data: prevCampaign } = await supabase
    .from('seo_campaigns')
    .select('organic_traffic')
    .eq('client_id', clientId)
    .eq('month_year', prevMonthYear)
    .maybeSingle();

  const organicTrafficPrev = prevCampaign?.organic_traffic || 0;

  // 6. Upsert into seo_campaigns (GA4 fields)
  await supabase.from('seo_campaigns').upsert(
    {
      client_id: clientId,
      month_year: target,
      organic_traffic: organicTraffic,
      organic_traffic_prev: organicTrafficPrev,
      ga4_sessions: totalSessions,
      ga4_new_users: totalNewUsers,
      ga4_conversions: totalConversions,
      data_synced_at: new Date().toISOString(),
    },
    { onConflict: 'client_id,month_year' }
  );

  // 7. Update last_sync
  await supabase
    .from('ga4_connections')
    .update({ last_sync: new Date().toISOString() })
    .eq('client_id', clientId);

  return {
    sessions: totalSessions,
    newUsers: totalNewUsers,
    conversions: totalConversions,
  };
}

// ── Update GA4 Property ID for a client ──────────────────────────────────────
export async function setGa4PropertyId(clientId: string, propertyId: string) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from('ga4_connections')
    .update({ property_id: propertyId })
    .eq('client_id', clientId);

  if (error) throw error;
  return { success: true };
}

// ── Helper ─────────────────────────────────────────────────────────────────────
function formatMonthYear(date: Date): string {
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[date.getMonth()]} ${date.getFullYear()}`;
}
