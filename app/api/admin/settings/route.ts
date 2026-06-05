import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logAudit } from '@/lib/audit';

export async function GET(req: Request) {
  try {
    const supabase = await createClient();

    // 1. Authenticate user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Fetch role authorization check
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 3. Fetch all settings
    const { data: settings, error } = await supabase
      .from('agency_settings')
      .select('*');

    if (error) {
      throw error;
    }

    // 4. Map settings rows to key-value dictionary
    const settingsMap: Record<string, unknown> = {};
    if (settings) {
      settings.forEach((item) => {
        settingsMap[item.key] = item.value;
      });
    }

    return NextResponse.json(settingsMap);
  } catch (err) {
    console.error('Settings GET API error:', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to retrieve settings' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();

    // 1. Authenticate user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Fetch role authorization check
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 3. Parse input settings dictionary
    const settingsObject = await req.json();
    if (!settingsObject || typeof settingsObject !== 'object') {
      return NextResponse.json({ error: 'Invalid settings body' }, { status: 400 });
    }

    // 4. Fetch existing settings to audit changes correctly
    const { data: existingSettings } = await supabase
      .from('agency_settings')
      .select('*');

    const existingMap: Record<string, unknown> = {};
    if (existingSettings) {
      existingSettings.forEach((item) => {
        existingMap[item.key] = item.value;
      });
    }

    // 5. Batch upsert keys
    for (const [key, value] of Object.entries(settingsObject)) {
      const oldValue = existingMap[key];

      const { error } = await supabase
        .from('agency_settings')
        .upsert({
          key,
          value,
          updated_by: user.id,
          updated_at: new Date().toISOString(),
        });

      if (error) {
        throw error;
      }

      // Log audit only if the value actually changed
      if (JSON.stringify(oldValue) !== JSON.stringify(value)) {
        await logAudit({
          userId: user.id,
          action: 'UPDATE',
          tableName: 'agency_settings',
          recordId: key,
          oldValues: oldValue !== undefined ? { value: oldValue } : null,
          newValues: { value },
          request: req,
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Settings POST API error:', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to update settings' }, { status: 500 });
  }
}
