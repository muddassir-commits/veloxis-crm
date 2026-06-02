import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logAudit } from '@/lib/audit';

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
    // 1. Fetch Clients
    const { data: clients } = await supabase
      .from('clients')
      .select('*')
      .order('name', { ascending: true });

    // 2. Fetch Invoices
    const { data: invoices } = await supabase
      .from('invoices')
      .select(`
        *,
        clients (
          name
        )
      `)
      .order('invoice_number', { ascending: false });

    // 3. Fetch Employees (join profiles)
    const { data: employees } = await supabase
      .from('employees')
      .select(`
        *,
        profiles:id (
          full_name,
          email,
          phone,
          is_active
        )
      `);

    // Build the consolidated master CSV string
    const csvLines: string[] = [];

    // --- SECTION 1: CLIENTS ---
    csvLines.push('=== SECTION 1: CRM CLIENTS ===');
    csvLines.push('Client ID,Name,Company,Email,Industry,Monthly Retainer,Is Agency Self,Status,Created At');
    if (clients) {
      clients.forEach((c) => {
        csvLines.push([
          c.id,
          `"${c.name.replace(/"/g, '""')}"`,
          `"${(c.company || '').replace(/"/g, '""')}"`,
          c.email || '',
          `"${(c.industry || '').replace(/"/g, '""')}"`,
          c.monthly_retainer || '0',
          c.is_agency_self ? 'YES' : 'NO',
          c.status || 'active',
          c.created_at || '',
        ].join(','));
      });
    }
    csvLines.push('\n');

    // --- SECTION 2: INVOICES ---
    csvLines.push('=== SECTION 2: INVOICES ===');
    csvLines.push('Invoice Number,Client Name,Amount,GST Rate %,GST Amount,Total Amount,Status,Issued Date,Due Date,Paid Date,Payment Method');
    if (invoices) {
      invoices.forEach((i) => {
        const clientName = (i.clients as any)?.name || 'Unknown';
        csvLines.push([
          i.invoice_number,
          `"${clientName.replace(/"/g, '""')}"`,
          i.amount || '0',
          i.gst_rate || '18',
          i.gst_amount || '0',
          i.total_amount || '0',
          i.status || 'pending',
          i.issued_date || '',
          i.due_date || '',
          i.paid_date || '',
          i.payment_method || '',
        ].join(','));
      });
    }
    csvLines.push('\n');

    // --- SECTION 3: EMPLOYEES ---
    csvLines.push('=== SECTION 3: EMPLOYEES ===');
    csvLines.push('Employee ID,Full Name,Email,Designation,Stipend Amount,Payment Day,Skills,Status,Join Date');
    if (employees) {
      employees.forEach((e) => {
        const prof = e.profiles as any;
        const fullName = prof?.full_name || 'Unknown';
        const email = prof?.email || '';
        const isActive = prof?.is_active ? 'Active' : 'Inactive';
        const skillsStr = Array.isArray(e.skills) ? e.skills.join('; ') : '';

        csvLines.push([
          e.id,
          `"${fullName.replace(/"/g, '""')}"`,
          email,
          `"${(e.designation || '').replace(/"/g, '""')}"`,
          e.stipend_amount || '0',
          e.payment_day || '5',
          `"${skillsStr.replace(/"/g, '""')}"`,
          isActive,
          e.join_date || '',
        ].join(','));
      });
    }

    const csvContent = csvLines.join('\n');

    // Create file attachment response
    const response = new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="veloxis_master_crm_export.csv"',
      },
    });

    // Register log export action to audit_logs
    await logAudit({
      userId: user.id,
      action: 'EXPORT',
      tableName: 'clients',
      recordId: 'all_tables',
      oldValues: null,
      newValues: { tables: ['clients', 'invoices', 'employees'] },
      request: request,
    });

    return response;
  } catch (err: any) {
    console.error('Export All API error:', err);
    return NextResponse.json({ error: err.message || 'Failed to export master data' }, { status: 500 });
  }
}
