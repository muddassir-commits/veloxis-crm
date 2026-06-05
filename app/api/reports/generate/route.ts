// app/api/reports/generate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import React from 'react';
import { pdf } from '@react-pdf/renderer';
import { PDFReportDocument } from '@/components/admin/reports/pdf-report-document';

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
    const { clientId, monthYear } = body;
    if (!clientId || !monthYear) {
      return NextResponse.json({ error: 'clientId and monthYear are required' }, { status: 400 });
    }

    const adminClient = createAdminClient();

    // 3. Fetch data to compile
    const { data: client, error: clientErr } = await adminClient
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .single();

    if (clientErr || !client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    // Fetch metric tables
    const { data: seo } = await adminClient
      .from('seo_campaigns')
      .select('*')
      .eq('client_id', clientId)
      .eq('month_year', monthYear)
      .maybeSingle();

    const { data: keywords } = await adminClient
      .from('seo_keywords')
      .select('*')
      .eq('client_id', clientId)
      .eq('month_year', monthYear);

    const { data: meta } = await adminClient
      .from('meta_campaigns')
      .select('*')
      .eq('client_id', clientId)
      .eq('month_year', monthYear);

    const { data: gads } = await adminClient
      .from('google_ads_campaigns')
      .select('*')
      .eq('client_id', clientId)
      .eq('month_year', monthYear);

    const { data: social } = await adminClient
      .from('social_media_metrics')
      .select('*')
      .eq('client_id', clientId)
      .eq('month_year', monthYear);

    // 4. Render PDF to stream using separate clean JSX document wrapper
    const reportDoc = React.createElement(PDFReportDocument, {
      client,
      monthYear,
      seo,
      seoKeywords: keywords || [],
      meta: meta || [],
      gads: gads || [],
      social: social || [],
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- react-pdf workaround requires any cast
    const blob = await pdf(reportDoc as any).toBlob();
    const buffer = Buffer.from(await blob.arrayBuffer());

    const fileName = `Report_${monthYear.replace(/\s+/g, '_')}.pdf`;
    const storagePath = `clients/${clientId}/reports/${fileName}`;

    // 5. Upload to storage bucket using service role client
    const { error: uploadError } = await adminClient.storage
      .from('clients')
      .upload(storagePath, buffer, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`Storage upload failed: ${uploadError.message}`);
    }

    // 6. Get Public URL (bucket is public)
    const { data: { publicUrl } } = adminClient.storage
      .from('clients')
      .getPublicUrl(storagePath);

    // 7. Check if file metadata already exists
    const { data: existingFile } = await adminClient
      .from('files')
      .select('id')
      .eq('storage_path', storagePath)
      .maybeSingle();

    let fileId: string;

    if (existingFile) {
      // Update existing file record
      const { data: fileRecord, error: fileErr } = await adminClient
        .from('files')
        .update({
          size_bytes: buffer.length,
          public_url: publicUrl,
          uploaded_by: user.id,
        })
        .eq('id', existingFile.id)
        .select('id')
        .single();

      if (fileErr || !fileRecord) {
        throw new Error(`Failed to update file metadata: ${fileErr?.message}`);
      }
      fileId = fileRecord.id;
    } else {
      // Insert new file record
      const { data: fileRecord, error: fileErr } = await adminClient
        .from('files')
        .insert({
          name: fileName,
          original_name: fileName,
          mime_type: 'application/pdf',
          size_bytes: buffer.length,
          bucket: 'clients',
          storage_path: storagePath,
          public_url: publicUrl,
          department: 'seo',
          client_id: clientId,
          uploaded_by: user.id,
          is_shared_with_client: false,
        })
        .select('id')
        .single();

      if (fileErr || !fileRecord) {
        throw new Error(`Failed to save file metadata: ${fileErr?.message}`);
      }
      fileId = fileRecord.id;
    }

    // 8. Create or update generated_reports row
    const { data: report, error: reportErr } = await adminClient
      .from('generated_reports')
      .upsert({
        client_id: clientId,
        month_year: monthYear,
        file_id: fileId,
        created_by: user.id,
        status: 'draft',
        updated_at: new Date().toISOString()
      }, { onConflict: 'client_id,month_year' })
      .select('*')
      .single();

    if (reportErr || !report) {
      throw new Error(`Failed to save report: ${reportErr?.message}`);
    }

    // 9. Log activity and audit trail
    await adminClient.from('activity_log').insert({
      user_id: user.id,
      client_id: clientId,
      action: 'generate_report',
      entity_type: 'reports',
      entity_id: report.id,
      title: `📊 Monthly report generated for ${client.name}`,
      description: `Performance report generated for ${monthYear} in draft status.`,
    });

    await adminClient.from('audit_logs').insert({
      user_id: user.id,
      action: 'INSERT',
      table_name: 'generated_reports',
      record_id: report.id,
      new_values: report,
    });

    return NextResponse.json({ success: true, report });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- cosmetic catch block error
  } catch (err: any) {
    console.error('Report compilation failed:', err);
    return NextResponse.json({ error: err.message || 'Report compilation failed' }, { status: 500 });
  }
}
