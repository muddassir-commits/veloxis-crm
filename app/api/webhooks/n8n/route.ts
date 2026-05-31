import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ message: 'Placeholder Route OK' });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log('[n8n Webhook Outbound Triggered]', body);
    
    // In production n8n workflows: forward this details to n8n webhook URL
    // e.g. using fetch(`${process.env.N8N_BASE_URL}/webhook/invoice_paid`, ...)
    
    return NextResponse.json({ success: true, message: 'Webhook triggered successfully' });
  } catch {
    return NextResponse.json({ error: 'Failed to process webhook' }, { status: 500 });
  }
}
