import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const supabase = await createClient();

  // Validate admin authorization
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized Access' }, { status: 401 });
  }

  // Check admin role in profiles
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden: Admins only' }, { status: 403 });
  }

  try {
    // Fetch last 500 audit logs for CSV export
    const { data: logs, error: logsError } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);

    if (logsError) throw logsError;

    // Build CSV content
    const headers = [
      'Log ID',
      'User ID',
      'Action Type',
      'Table Affected',
      'Record UUID',
      'IP Address',
      'User Agent',
      'Timestamp'
    ];

    const rows = (logs || []).map((log) => [
      log.id,
      log.user_id || 'system',
      `"${log.action.replace(/"/g, '""')}"`,
      `"${(log.table_name || '').replace(/"/g, '""')}"`,
      log.record_id || '',
      log.ip_address || '',
      `"${(log.user_agent || '').replace(/"/g, '""')}"`,
      log.created_at
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.join(','))
    ].join('\n');

    // Create file attachment response
    const response = new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="veloxis_audit_logs_export.csv"',
      },
    });

    // Register log export action to audit_logs
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      action: 'EXPORT',
      table_name: 'audit_logs',
      ip_address: request.headers.get('x-forwarded-for') || null,
      user_agent: request.headers.get('user-agent') || null,
    });

    return response;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- cosmetic catch block error
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to export logs' }, { status: 500 });
  }
}
