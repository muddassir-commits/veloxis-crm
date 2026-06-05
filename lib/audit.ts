import { createAdminClient } from '@/lib/supabase/admin';
import { headers } from 'next/headers';
import { AuditLogParams } from '@/types';

export async function logAudit({
  userId,
  action,
  tableName,
  recordId,
  oldValues,
  newValues,
  request,
}: AuditLogParams) {
  try {
    let ipAddress = 'unknown';
    let userAgent = 'system';

    // 1. Try to read request parameters
    if (request) {
      ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
      userAgent = request.headers.get('user-agent') || 'system';
    } else {
      // 2. Fallback to reading headers dynamically
      try {
        const reqHeaders = await headers();
        ipAddress = reqHeaders.get('x-forwarded-for') || 'unknown';
        userAgent = reqHeaders.get('user-agent') || 'system';
      } catch {
        // Can fail if run outside of dynamic render / request context (e.g. static build or worker)
      }
    }

    const supabase = createAdminClient();

    const { error } = await supabase.from('audit_logs').insert({
      user_id: userId,
      action,
      table_name: tableName,
      record_id: recordId,
      old_values: oldValues || null,
      new_values: newValues || null,
      ip_address: ipAddress,
      user_agent: userAgent,
      created_at: new Date().toISOString(),
    });

    if (error) {
      console.error('Failed to insert audit log into database:', error);
    }
  } catch (err) {
    console.error('Audit logger crashed:', err);
  }
}
