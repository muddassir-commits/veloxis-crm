// app/api/reports/send/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendEmail } from '@/lib/email';
import { render } from '@react-email/components';
import React from 'react';
import { ReportNotificationEmail } from '@/lib/emails/report-notification';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();

    // 1. Authenticate user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse body
    const body = await req.json();
    const { reportId } = body;
    if (!reportId) {
      return NextResponse.json({ error: 'reportId is required' }, { status: 400 });
    }

    const adminClient = createAdminClient();

    // 3. Fetch report details
    const { data: report, error: reportErr } = await adminClient
      .from('generated_reports')
      .select(`
        *,
        client:client_id (
          id,
          name,
          email,
          portal_user_id
        ),
        files:file_id (
          name,
          storage_path,
          public_url
        )
      `)
      .eq('id', reportId)
      .single();

    if (reportErr || !report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    const client = report.client;
    if (!client.email) {
      return NextResponse.json({ error: 'Client has no email registered for notifications' }, { status: 400 });
    }

    if (!report.files?.storage_path) {
      return NextResponse.json({ error: 'Report PDF file not found. Please re-generate the report.' }, { status: 400 });
    }

    // 4. Download file from storage
    const { data: fileData, error: downloadErr } = await adminClient.storage
      .from('clients')
      .download(report.files.storage_path);

    if (downloadErr || !fileData) {
      throw new Error(`Failed to download report PDF from storage: ${downloadErr?.message}`);
    }

    const fileBuffer = Buffer.from(await fileData.arrayBuffer());

    // 5. Render email template
    const portalUrl = 'https://portal.veloxisglobal.com/portal/reports';
    const emailHtml = await render(
      React.createElement(ReportNotificationEmail, {
        clientName: client.name,
        monthYear: report.month_year,
        portalUrl,
      })
    );

    // 6. Send email using shared email utility
    await sendEmail({
      to: client.email,
      subject: `Monthly Performance Report: ${report.month_year}`,
      html: emailHtml,
      attachments: [
        {
          filename: report.files.name,
          content: fileBuffer,
        },
      ],
    });

    // 7. Update report status to 'sent'
    const { error: reportUpdateErr } = await adminClient
      .from('generated_reports')
      .update({ status: 'sent', updated_at: new Date().toISOString() })
      .eq('id', reportId);

    if (reportUpdateErr) {
      throw new Error(`Failed to update report status: ${reportUpdateErr.message}`);
    }

    // 8. Update files sharing status to true (visible to client portal)
    const { error: fileUpdateErr } = await adminClient
      .from('files')
      .update({ is_shared_with_client: true })
      .eq('id', report.file_id);

    if (fileUpdateErr) {
      throw new Error(`Failed to update file sharing status: ${fileUpdateErr.message}`);
    }

    // 9. Create Client Portal system notification if portal user is linked
    if (client.portal_user_id) {
      await adminClient.from('notifications').insert({
        user_id: client.portal_user_id,
        type: 'report_shared',
        title: `📊 Performance Report Ready: ${report.month_year}`,
        message: `Your monthly performance report has been published and is available for download.`,
        link: `/portal/reports`,
        is_read: false,
        priority: 'normal',
      });
    }

    // 10. Log activity and audit trail
    await adminClient.from('activity_log').insert({
      user_id: user.id,
      client_id: client.id,
      action: 'send_report',
      entity_type: 'reports',
      entity_id: report.id,
      title: `📨 Report sent to ${client.name}`,
      description: `Report for ${report.month_year} successfully sent via email and shared to portal.`,
    });

    await adminClient.from('audit_logs').insert({
      user_id: user.id,
      action: 'UPDATE',
      table_name: 'generated_reports',
      record_id: report.id,
      new_values: { ...report, status: 'sent' },
    });

    return NextResponse.json({ success: true });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- cosmetic catch block error
  } catch (err: any) {
    console.error('Report delivery failed:', err);
    return NextResponse.json({ error: err.message || 'Report delivery failed' }, { status: 500 });
  }
}
