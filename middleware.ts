import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import { SESSION_COOKIE_NAME } from '@/lib/constants';

const ROLE_ROUTES: Record<string, string> = {
  '/admin': 'ADMIN',
  '/doctor': 'DOCTOR',
  '/pharmacist': 'PHARMACIST',
};

const ROLE_HOME: Record<string, string> = {
  ADMIN: '/admin',
  DOCTOR: '/doctor',
  PHARMACIST: '/pharmacist',
};

// jose's jwtVerify needs the secret as bytes and runs fine on the Edge runtime,
// unlike the `jsonwebtoken` package used elsewhere in the app.
function getSecretKey(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not set.');
  }
  return new TextEncoder().encode(secret);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Find matching protected route prefix
  const matchedPrefix = Object.keys(ROLE_ROUTES).find((prefix) => pathname.startsWith(prefix));
  if (!matchedPrefix) return NextResponse.next();

  const requiredRole = ROLE_ROUTES[matchedPrefix];
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return NextResponse.redirect(new URL('/auth', request.url));
  }

  try {
    // SECURITY: verify the token's signature here, not just decode the payload.
    // Previously this only base64-decoded the JWT without checking it was
    // actually signed by the server, so a client could hand-craft a token
    // with role: "ADMIN" and the middleware would route them straight into
    // the admin shell. jwtVerify checks the HMAC signature and expiry (`exp`)
    // in one step, using the same JWT_SECRET that lib/auth.ts signs with.
    const { payload } = await jwtVerify(token, getSecretKey());

    // Wrong role redirect
    if (payload.role !== requiredRole) {
      const home = ROLE_HOME[payload.role as string] ?? '/auth';
      return NextResponse.redirect(new URL(home, request.url));
    }

    return NextResponse.next();
  } catch {
    // Covers invalid signature, malformed token, and expired token alike.
    const res = NextResponse.redirect(new URL('/auth', request.url));
    res.cookies.set(SESSION_COOKIE_NAME, '', { maxAge: 0, path: '/' });
    return res;
  }
}

export const config = {
  matcher: ['/admin/:path*', '/doctor/:path*', '/pharmacist/:path*'],
};
