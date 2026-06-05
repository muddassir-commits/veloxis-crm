import { NextResponse } from 'next/server';

export const revalidate = 0;

export async function GET() {
  const secret = process.env.CRON_SECRET;
  const isDefined = typeof secret !== 'undefined' && secret !== null;
  const length = secret ? secret.length : 0;
  
  return NextResponse.json({
    defined: isDefined,
    length,
    starts_with: secret ? secret.slice(0, 3) : null,
    ends_with: secret ? secret.slice(-3) : null,
  });
}
