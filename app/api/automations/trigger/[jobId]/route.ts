import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const supabase = await createClient();

  // Validate admin authorization
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized Access' }, { status: 401 });
  }

  // Get user profile to check admin role
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profileError || profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden: Admins only' }, { status: 403 });
  }

  // Get job from database
  const { data: job, error: jobError } = await supabase
    .from('cron_jobs')
    .select('*')
    .eq('id', jobId)
    .single();

  if (jobError || !job) {
    return NextResponse.json({ error: 'Cron job not found' }, { status: 404 });
  }

  // Create a run log entry with status 'running'
  const { data: run, error: runError } = await supabase
    .from('cron_job_runs')
    .insert({
      job_id: jobId,
      started_at: new Date().toISOString(),
      status: 'running',
    })
    .select('*')
    .single();

  if (runError || !run) {
    return NextResponse.json({ error: 'Failed to create run log entry' }, { status: 500 });
  }

  const startTime = Date.now();
  let status = 'success';
  let outputPayload: any = { message: 'Trigger successfully completed' };
  let errorPayload: string | null = null;

  try {
    // Determine target URL for n8n execution trigger
    const n8nBaseUrl = process.env.N8N_BASE_URL || 'https://automation.veloxisglobal.com';
    const workflowId = job.n8n_workflow_id;
    
    if (workflowId) {
      // n8n trigger endpoint
      const triggerUrl = `${n8nBaseUrl}/api/v1/workflows/${workflowId}/run`;
      const apiKey = process.env.N8N_API_KEY;

      const response = await fetch(triggerUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-N8N-API-KEY': apiKey || '',
        },
        body: JSON.stringify({
          job_id: jobId,
          run_id: run.id,
          triggered_by: user.id,
          manual: true,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`n8n responded with status ${response.status}: ${errorText}`);
      }

      const responseData = await response.json();
      outputPayload = responseData;
    } else {
      // Mock n8n trigger if no workflow ID configured (e.g. for developer environment testing)
      await new Promise((resolve) => setTimeout(resolve, 800)); // Simulate work
      outputPayload = {
        message: 'No n8n workflow ID configured. Simulating successful local execution trigger.',
        simulation: true,
        run_id: run.id,
      };
    }
  } catch (err: any) {
    status = 'failed';
    errorPayload = err.message || 'Unknown automation execution error';
    outputPayload = null;
  }

  const endTime = new Date().toISOString();

  // Update runs log with result
  await supabase
    .from('cron_job_runs')
    .update({
      ended_at: endTime,
      status,
      output: outputPayload,
      error: errorPayload,
    })
    .eq('id', run.id);

  // Update cron_jobs table status
  await supabase
    .from('cron_jobs')
    .update({
      last_run: endTime,
      last_status: status,
    })
    .eq('id', jobId);

  // Log activity log
  await supabase.from('activity_log').insert({
    user_id: user.id,
    action: 'trigger_cron',
    entity_type: 'cron_job',
    entity_id: jobId,
    title: `Cron Job Manually Fired`,
    description: `Workflow '${job.name}' manually run by Muddassir Ali. Result: ${status}.`,
    metadata: { run_id: run.id, status },
  });

  // Log to audit logs
  await supabase.from('audit_logs').insert({
    user_id: user.id,
    action: 'UPDATE',
    table_name: 'cron_jobs',
    record_id: jobId,
    new_values: { last_run: endTime, last_status: status },
    ip_address: request.headers.get('x-forwarded-for') || null,
    user_agent: request.headers.get('user-agent') || null,
  });

  if (status === 'failed') {
    return NextResponse.json({ error: errorPayload }, { status: 500 });
  }

  return NextResponse.json({ success: true, runId: run.id, result: outputPayload });
}
