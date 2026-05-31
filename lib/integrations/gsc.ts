// lib/integrations/gsc.ts
// Google Search Console + GA4 integration library
// Uses googleapis package (already installed)

import { google } from 'googleapis';
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';
import { encrypt, decrypt } from '@/lib/utils';
import { SeoKeyword } from '@/types';

// ── Admin Supabase client (server-side only) ─────────────────────────────────
function getSupabaseAdmin() {
  return createSupabaseAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// ── Build OAuth2 client ────────────────────────────────────────────────────────
export function buildOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID!,
    process.env.GOOGLE_CLIENT_SECRET!,
    process.env.GOOGLE_REDIRECT_URI!
  );
}

// ── Build the Google OAuth URL for GSC + GA4 scopes ──────────────────────────
export function getGoogleAuthUrl(clientId: string, service: 'gsc' | 'ga4' = 'gsc') {
  const oauth2Client = buildOAuth2Client();

  const scopes = [
    'https://www.googleapis.com/auth/webmasters.readonly', // GSC
    'https://www.googleapis.com/auth/analytics.readonly',   // GA4
    'openid',
    'email',
  ];

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent', // always re-request to get refresh token
    state: JSON.stringify({ clientId, service }),
  });
}

// ── Exchange code for tokens and save to DB ───────────────────────────────────
export async function handleGoogleOAuthCallback(
  code: string,
  clientId: string,
  service: 'gsc' | 'ga4'
) {
  const supabase = getSupabaseAdmin();
  const oauth2Client = buildOAuth2Client();

  const { tokens } = await oauth2Client.getToken(code);

  if (!tokens.refresh_token) {
    throw new Error('No refresh token received. User may need to revoke and reconnect.');
  }

  const expiresAt = tokens.expiry_date
    ? new Date(tokens.expiry_date).toISOString()
    : new Date(Date.now() + 3600 * 1000).toISOString();

  const encryptedAccess = encrypt(tokens.access_token || '');
  const encryptedRefresh = encrypt(tokens.refresh_token);

  if (service === 'gsc') {
    // Get the list of GSC properties to let user pick
    oauth2Client.setCredentials(tokens);
    const searchconsole = google.searchconsole({ version: 'v1', auth: oauth2Client });
    const sitesResponse = await searchconsole.sites.list();
    const sites = sitesResponse.data.siteEntry ?? [];

    // Default: use first property, or Muddassir can update later
    const propertyUrl = sites[0]?.siteUrl || '';

    await supabase.from('gsc_connections').upsert(
      {
        client_id: clientId,
        property_url: propertyUrl,
        access_token: encryptedAccess,
        refresh_token: encryptedRefresh,
        token_expires: expiresAt,
        is_active: true,
        last_sync: null,
        connected_by: null,
      },
      { onConflict: 'client_id' }
    );

    return { service: 'gsc', propertyUrl, sites: sites.map((s) => s.siteUrl) };
  }

  if (service === 'ga4') {
    await supabase.from('ga4_connections').upsert(
      {
        client_id: clientId,
        property_id: '', // Will be set by user in UI after connecting
        access_token: encryptedAccess,
        refresh_token: encryptedRefresh,
        token_expires: expiresAt,
        is_active: true,
        last_sync: null,
        connected_by: null,
      },
      { onConflict: 'client_id' }
    );

    return { service: 'ga4' };
  }

  throw new Error('Unknown service');
}

// ── Sync GSC data for a client into seo_campaigns ────────────────────────────
export async function syncGscData(clientId: string, monthYear?: string) {
  const supabase = getSupabaseAdmin();

  // 1. Get connection
  const { data: conn, error: connError } = await supabase
    .from('gsc_connections')
    .select('*')
    .eq('client_id', clientId)
    .eq('is_active', true)
    .single();

  if (connError || !conn) {
    throw new Error('GSC not connected for this client');
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
    if (Object.keys(updates).length > 0) {
      await supabase.from('gsc_connections').update(updates).eq('client_id', clientId);
    }
  });

  // 3. Determine date range (current month)
  const now = new Date();
  const target = monthYear || formatMonthYear(now);
  const [month, year] = target.split(' ');
  const monthIndex = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].indexOf(month);
  const startDate = new Date(Number(year), monthIndex, 1).toISOString().split('T')[0];
  const endDate = new Date(Number(year), monthIndex + 1, 0).toISOString().split('T')[0];

  // 4. Query GSC
  const searchconsole = google.searchconsole({ version: 'v1', auth: oauth2Client });

  const [clicksRes] = await Promise.all([
    searchconsole.searchanalytics.query({
      siteUrl: conn.property_url,
      requestBody: {
        startDate,
        endDate,
        dimensions: ['query'],
        rowLimit: 500,
      },
    }),
    searchconsole.searchanalytics.query({
      siteUrl: conn.property_url,
      requestBody: {
        startDate,
        endDate,
        dimensions: ['page'],
        rowLimit: 1,
      },
    }),
  ]);

  const rows = clicksRes.data.rows ?? [];
  const totalClicks = rows.reduce((sum, r) => sum + (r.clicks ?? 0), 0);
  const totalImpressions = rows.reduce((sum, r) => sum + (r.impressions ?? 0), 0);
  const avgCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
  const avgPosition = rows.length > 0
    ? rows.reduce((sum, r) => sum + (r.position ?? 0), 0) / rows.length
    : 0;

  // 5. Count keywords in top positions
  const top3 = rows.filter((r) => (r.position ?? 100) <= 3).length;
  const top10 = rows.filter((r) => (r.position ?? 100) <= 10).length;
  const top20 = rows.filter((r) => (r.position ?? 100) <= 20).length;

  // 6. Fetch existing keywords to perform in-memory diffing
  const { data: allKeywords } = await supabase
    .from('seo_keywords')
    .select('*')
    .eq('client_id', clientId);

  const currentKeywordsMap = new Map<string, SeoKeyword>();
  const historicalKeywordsMap = new Map<string, SeoKeyword[]>();

  for (const kw of (allKeywords as SeoKeyword[]) || []) {
    const key = kw.keyword.toLowerCase();
    if (kw.month_year === target) {
      currentKeywordsMap.set(key, kw);
    } else {
      if (!historicalKeywordsMap.has(key)) {
        historicalKeywordsMap.set(key, []);
      }
      historicalKeywordsMap.get(key)!.push(kw);
    }
  }

  const topQueries = rows.slice(0, 100);
  const keywordsToUpsert: Partial<SeoKeyword>[] = [];

  for (const row of topQueries) {
    const keywordText = row.keys?.[0];
    if (!keywordText) continue;

    const key = keywordText.toLowerCase();
    const currentPos = Math.round(row.position ?? 0);

    const currentRecord = currentKeywordsMap.get(key);
    if (currentRecord) {
      const oldCurrent = currentRecord.current_position;
      const previousPos = currentRecord.previous_position !== null ? currentRecord.previous_position : oldCurrent;
      const bestPos = Math.min(currentRecord.best_position || 100, currentPos, oldCurrent || 100);

      keywordsToUpsert.push({
        id: currentRecord.id,
        client_id: clientId,
        keyword: currentRecord.keyword,
        current_position: currentPos,
        previous_position: previousPos,
        best_position: bestPos,
        month_year: target,
        source: 'gsc_auto',
        updated_at: new Date().toISOString(),
      });
    } else {
      const histRecords = historicalKeywordsMap.get(key);
      let previousPos = null;
      let bestPos = currentPos;
      let targetUrl = null;
      let searchVolume = null;
      let keywordDifficulty = null;
      let intent = 'informational';
      let notes = null;

      if (histRecords && histRecords.length > 0) {
        histRecords.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        const mostRecent = histRecords[0];
        previousPos = mostRecent.current_position;

        const historicalPositions = histRecords.map((r) => r.best_position || r.current_position || 100);
        bestPos = Math.min(currentPos, ...historicalPositions);

        targetUrl = mostRecent.target_url;
        searchVolume = mostRecent.search_volume;
        keywordDifficulty = mostRecent.keyword_difficulty;
        intent = mostRecent.intent || 'informational';
        notes = mostRecent.notes;
      }

      keywordsToUpsert.push({
        client_id: clientId,
        keyword: keywordText,
        target_url: targetUrl,
        current_position: currentPos,
        previous_position: previousPos,
        best_position: bestPos,
        search_volume: searchVolume,
        keyword_difficulty: keywordDifficulty,
        intent,
        month_year: target,
        source: 'gsc_auto',
        notes,
      });
    }
  }

  if (keywordsToUpsert.length > 0) {
    const { error: upsertError } = await supabase.from('seo_keywords').upsert(keywordsToUpsert);
    if (upsertError) throw upsertError;
  }

  // 7. Upsert into seo_campaigns
  await supabase.from('seo_campaigns').upsert(
    {
      client_id: clientId,
      month_year: target,
      gsc_clicks: Math.round(totalClicks),
      gsc_impressions: Math.round(totalImpressions),
      gsc_ctr: parseFloat(avgCtr.toFixed(2)),
      gsc_avg_position: parseFloat(avgPosition.toFixed(1)),
      keywords_tracked: rows.length,
      keywords_top3: top3,
      keywords_top10: top10,
      keywords_top20: top20,
      data_synced_at: new Date().toISOString(),
    },
    { onConflict: 'client_id,month_year' }
  );

  // 8. Update last_sync
  await supabase
    .from('gsc_connections')
    .update({ last_sync: new Date().toISOString() })
    .eq('client_id', clientId);

  return {
    clicks: Math.round(totalClicks),
    impressions: Math.round(totalImpressions),
    ctr: parseFloat(avgCtr.toFixed(2)),
    avgPosition: parseFloat(avgPosition.toFixed(1)),
    keywordsTracked: rows.length,
  };
}

// ── Helper ─────────────────────────────────────────────────────────────────────
function formatMonthYear(date: Date): string {
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[date.getMonth()]} ${date.getFullYear()}`;
}
