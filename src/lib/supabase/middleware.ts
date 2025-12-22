import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
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
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Do not run code between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isLoginPage = request.nextUrl.pathname === '/login';
  const isPublicPath = request.nextUrl.pathname.startsWith('/_next') ||
    request.nextUrl.pathname.startsWith('/api') ||
    request.nextUrl.pathname === '/favicon.ico';

  // If user is not logged in and trying to access protected routes
  if (!user && !isLoginPage && !isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // If user is logged in, check their role
  if (user && !isPublicPath) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const isAdminOrPersonnel = profile?.role === 'admin' || profile?.role === 'personnel';

    // If user doesn't have admin/personnel role, redirect to unauthorized
    if (!isAdminOrPersonnel && !isLoginPage) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('error', 'unauthorized');
      // Sign out the user
      await supabase.auth.signOut();
      return NextResponse.redirect(url);
    }

    // If user is logged in and has proper role, redirect from login to dashboard
    if (isLoginPage && isAdminOrPersonnel) {
      const url = request.nextUrl.clone();
      url.pathname = '/';
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
