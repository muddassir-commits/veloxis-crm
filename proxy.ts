import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { checkRateLimit } from '@/lib/rate-limit';

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // 1. Detect if request is a valid cron/automation call using shared secret on restricted routes
  const secret = request.headers.get('x-cron-secret') || request.headers.get('x-function-secret');
  const isCronSecretValid = !!(secret && secret === process.env.CRON_SECRET);
  const isCronRoute = 
    path.startsWith('/api/cron/') ||
    path.startsWith('/api/finance/generate-monthly-tasks') ||
    path.startsWith('/api/finance/generate-monthly-invoices') ||
    path.startsWith('/api/finance/check-overdue') ||
    path.startsWith('/api/integrations/sync-all');
    
  const isBypassedCron = isCronSecretValid && isCronRoute;

  // 2. Log audit entry for bypassed requests
  if (isBypassedCron) {
    try {
      const adminSupabase = createAdminClient();
      const ip = request.headers.get('x-forwarded-for') || 'unknown';
      const userAgent = request.headers.get('user-agent') || null;
      
      await adminSupabase.from('audit_logs').insert({
        user_id: null,
        action: 'CRON_BYPASS',
        table_name: 'middleware',
        record_id: null,
        new_values: { path },
        ip_address: ip,
        user_agent: userAgent,
      });
    } catch (e) {
      console.error('Failed to log cron bypass audit:', e);
    }
  }

  // ── RATE LIMITING ──────────────────────────────────────────
  if (path.startsWith('/api/') && !isBypassedCron) {
    const ip = (request as NextRequest & { ip?: string }).ip || request.headers.get('x-forwarded-for') || 'unknown';
    
    // Check if it's the login route
    if (path.startsWith('/api/auth/login')) {
      const limitResult = await checkRateLimit(ip, 5, 15 * 60 * 1000);
      if (!limitResult.success) {
        return new NextResponse(
          JSON.stringify({ error: 'Too many login attempts. Please try again after 15 minutes.' }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'Retry-After': String(Math.ceil((limitResult.reset - Date.now()) / 1000)),
            },
          }
        );
      }
    } else {
      // General API rate limit (100 req / minute)
      const limitResult = await checkRateLimit(ip, 100, 60 * 1000);
      if (!limitResult.success) {
        return new NextResponse(
          JSON.stringify({ error: 'Too many requests. Please try again later.' }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'Retry-After': String(Math.ceil((limitResult.reset - Date.now()) / 1000)),
            },
          }
        );
      }
    }
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const host = request.headers.get('host') || '';
  const isProduction = host.includes('veloxisglobal.com');

  if (user) {
    // Fetch profile role bypassing RLS using admin client
    const adminSupabase = createAdminClient();
    const { data: profile } = await adminSupabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const role = profile?.role;

    // Authenticated user on login page redirects based on role
    if (path === '/login') {
      if (role === 'admin') {
        const dest = isProduction ? 'https://ops.veloxisglobal.com/dashboard' : '/dashboard';
        return NextResponse.redirect(new URL(dest, request.url));
      } else if (role === 'employee') {
        const dest = isProduction ? 'https://team.veloxisglobal.com/team' : '/team';
        return NextResponse.redirect(new URL(dest, request.url));
      } else if (role === 'client') {
        const dest = isProduction ? 'https://portal.veloxisglobal.com/portal' : '/portal';
        return NextResponse.redirect(new URL(dest, request.url));
      }
      // If profile is not found or has no role, allow login page
    }

    // Strict host routing for Production subdomains
    if (isProduction) {
      if (role === 'admin' && !host.includes('ops.veloxisglobal.com')) {
        return NextResponse.redirect(new URL(`https://ops.veloxisglobal.com${path}`, request.url));
      }
      if (role === 'employee' && !host.includes('team.veloxisglobal.com')) {
        return NextResponse.redirect(new URL(`https://team.veloxisglobal.com${path}`, request.url));
      }
      if (role === 'client' && !host.includes('portal.veloxisglobal.com')) {
        return NextResponse.redirect(new URL(`https://portal.veloxisglobal.com${path}`, request.url));
      }
    }

    // Protect admin routes
    if (path.startsWith('/dashboard') && role !== 'admin') {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    // Protect employee routes
    if (path.startsWith('/team') && role !== 'employee') {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    // Protect client portal routes
    if (path.startsWith('/portal') && role !== 'client') {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    // Protect integrations API
    if (path.startsWith('/api/integrations') && !isBypassedCron && role !== 'admin') {
      return new NextResponse(
        JSON.stringify({ error: 'Unauthorized Access' }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  } else {
    // Unauthenticated user trying to access protected routes
    if (
      !isBypassedCron && (
        path.startsWith('/dashboard') ||
        path.startsWith('/team') ||
        path.startsWith('/portal') ||
        path.startsWith('/api/integrations')
      )
    ) {
      // Return JSON 401 for unauthorized API access
      if (path.startsWith('/api/')) {
        return new NextResponse(
          JSON.stringify({ error: 'Unauthorized Access' }),
          {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      if (isProduction) {
        if (path.startsWith('/dashboard') && !host.includes('ops.veloxisglobal.com')) {
          return NextResponse.redirect(new URL('https://ops.veloxisglobal.com/login', request.url));
        }
        if (path.startsWith('/team') && !host.includes('team.veloxisglobal.com')) {
          return NextResponse.redirect(new URL('https://team.veloxisglobal.com/login', request.url));
        }
        if (path.startsWith('/portal') && !host.includes('portal.veloxisglobal.com')) {
          return NextResponse.redirect(new URL('https://portal.veloxisglobal.com/login', request.url));
        }
      }
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

