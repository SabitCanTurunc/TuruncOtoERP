import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

// Secret key from environment or fallback
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "TURUNC_ERP_SUPER_SECRET_KEY_12345"
);

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Static files and public paths
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname === '/api/auth/login' ||
    pathname === '/login'
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get('auth_token')?.value;

  if (!token) {
    // If it's an API route, send 401 instead of redirecting
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  try {
    const verified = await jwtVerify(token, JWT_SECRET);
    const payload = verified.payload as any;

    const role = payload.role; // "SUPERADMIN" or "USER"

    // Only superadmin routes
    const superAdminRoutes = ['/finans', '/admin'];
    const superAdminApis = ['/api/transactions', '/api/staff', '/api/users'];

    const isSuperAdminRoute = superAdminRoutes.some(p => pathname.startsWith(p));
    const isSuperAdminApi = superAdminApis.some(p => pathname.startsWith(p));

    if ((isSuperAdminRoute || isSuperAdminApi) && role !== 'SUPERADMIN') {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      return NextResponse.redirect(new URL('/', request.url));
    }

    return NextResponse.next();
  } catch (err) {
    // Token is invalid/expired
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized / Invalid Token' }, { status: 401 });
    }
    // Delete bad cookie
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete('auth_token');
    return response;
  }
}

// Config to run middleware basically on everything except static assets
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
