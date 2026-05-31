// app/api/integrations/sync-all/route.ts
// POST /api/integrations/sync-all — Sync all connected clients (triggered by n8n cron or admin UI)

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { syncGscData } from '@/lib/integrations/gsc';
import { syncGa4Data } from '@/lib/integrations/ga4';
import { syncMetaData } from '@/lib/integrations/meta';
import { syncGoogleAdsData } from '@/lib/integrations/google-ads';

export const revalidate = 0;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  let isAuthorized = false;

  // 1. Check CRON_SECRET header
  const secret = request.headers.get('x-function-secret');
  if (secret && secret === process.env.CRON_SECRET) {
    isAuthorized = true;
  }

  // 2. Check Admin Session if no secret header
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

  // 3. Optional: Log to cron_job_runs if job exists
  const { data: job } = await supabase
    .from('cron_jobs')
    .select('id')
    .eq('name', 'sync_all')
    .maybeSingle();

  let runId = null;
  if (job) {
    const { data: run } = await supabase
      .from('cron_job_runs')
      .insert({
        job_id: job.id,
        status: 'running',
        started_at: new Date().toISOString(),
      })
      .select('id')
      .single();
    if (run) runId = run.id;
  }

  try {
    // 4. Fetch GSC connections
    const { data: gscConns } = await supabase
      .from('gsc_connections')
      .select('client_id')
      .eq('is_active', true);

    // 5. Fetch GA4 connections
    const { data: ga4Conns } = await supabase
      .from('ga4_connections')
      .select('client_id')
      .eq('is_active', true);

    // 6. Fetch Meta connections
    const { data: metaConns } = await supabase
      .from('meta_connections')
      .select('client_id')
      .eq('is_active', true);

    // 7. Fetch Google Ads connections (with try/catch for schema safety)
    let googleAdsConns: { client_id: string }[] = [];
    try {

      const { data } = await supabase
        .from('google_ads_connections')
        .select('client_id')
        .eq('is_active', true);
      googleAdsConns = data || [];
    } catch (e) {
      console.warn('Could not query google_ads_connections. Ensure table migration runs.', e);
    }

    interface SyncResult {
      client_id: string;
      status: 'success' | 'failed';
      error?: string;
    }

    const gscResults: SyncResult[] = [];
    const ga4Results: SyncResult[] = [];
    const metaResults: SyncResult[] = [];
    const googleAdsResults: SyncResult[] = [];

    // Sync Search Console
    if (gscConns && gscConns.length > 0) {
      for (const conn of gscConns) {
        try {
          await syncGscData(conn.client_id);
          gscResults.push({ client_id: conn.client_id, status: 'success' });
        } catch (e: unknown) {
          const errMsg = e instanceof Error ? e.message : String(e);
          gscResults.push({ client_id: conn.client_id, status: 'failed', error: errMsg });
        }
      }
    }

    // Sync GA4
    if (ga4Conns && ga4Conns.length > 0) {
      for (const conn of ga4Conns) {
        try {
          await syncGa4Data(conn.client_id);
          ga4Results.push({ client_id: conn.client_id, status: 'success' });
        } catch (e: unknown) {
          const errMsg = e instanceof Error ? e.message : String(e);
          ga4Results.push({ client_id: conn.client_id, status: 'failed', error: errMsg });
        }
      }
    }

    // Sync Meta Ads
    if (metaConns && metaConns.length > 0) {
      for (const conn of metaConns) {
        try {
          await syncMetaData(conn.client_id);
          metaResults.push({ client_id: conn.client_id, status: 'success' });
        } catch (e: unknown) {
          const errMsg = e instanceof Error ? e.message : String(e);
          metaResults.push({ client_id: conn.client_id, status: 'failed', error: errMsg });
        }
      }
    }

    // Sync Google Ads
    if (googleAdsConns && googleAdsConns.length > 0) {
      for (const conn of googleAdsConns) {
        try {
          await syncGoogleAdsData(conn.client_id);
          googleAdsResults.push({ client_id: conn.client_id, status: 'success' });
        } catch (e: unknown) {
          const errMsg = e instanceof Error ? e.message : String(e);
          googleAdsResults.push({ client_id: conn.client_id, status: 'failed', error: errMsg });
        }
      }
    }

    const output = {
      gsc: gscResults,
      ga4: ga4Results,
      meta: metaResults,
      google_ads: googleAdsResults,
    };

    const hasFailures =
      gscResults.some((r) => r.status === 'failed') ||
      ga4Results.some((r) => r.status === 'failed') ||
      metaResults.some((r) => r.status === 'failed') ||
      googleAdsResults.some((r) => r.status === 'failed');

    // 8. Complete cron run log
    if (runId) {
      await supabase
        .from('cron_job_runs')
        .update({
          status: hasFailures ? 'failed' : 'success',
          ended_at: new Date().toISOString(),
          output: output,
          error: hasFailures ? 'Some client syncs failed' : null,
        })
        .eq('id', runId);
    }

    // 9. Update last_run on the job record
    if (job) {
      await supabase
        .from('cron_jobs')
        .update({
          last_run: new Date().toISOString(),
          last_status: hasFailures ? 'failed' : 'success',
        })
        .eq('id', job.id);
    }

    return NextResponse.json({
      success: true,
      message: 'Sync completed',
      results: output,
    });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    if (runId) {
      await supabase
        .from('cron_job_runs')
        .update({
          status: 'failed',
          ended_at: new Date().toISOString(),
          error: errMsg,
        })
        .eq('id', runId);
    }

    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
