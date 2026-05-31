import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const supabase = await createClient();
  await supabase.auth.signOut();

  const requestUrl = new URL(request.url);
  return NextResponse.redirect(
    new URL('/login', requestUrl.origin),
    {
      status: 303, // See Other (forces a GET redirect)
    }
  );
}

export async function GET(request: Request) {
  const supabase = await createClient();
  await supabase.auth.signOut();

  const requestUrl = new URL(request.url);
  return NextResponse.redirect(
    new URL('/login', requestUrl.origin),
    {
      status: 302,
    }
  );
}
