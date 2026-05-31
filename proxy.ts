import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function proxy(request: NextRequest) {
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
  const path = request.nextUrl.pathname;
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
    if (path.startsWith('/api/integrations') && role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  } else {
    // Unauthenticated user trying to access protected routes redirect to login
    if (
      path.startsWith('/dashboard') ||
      path.startsWith('/team') ||
      path.startsWith('/portal') ||
      path.startsWith('/api/integrations')
    ) {
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
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public assets
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
