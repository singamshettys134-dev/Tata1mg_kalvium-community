import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { buildGoogleAuthUrl } from '@/lib/googleAuth';
import { GOOGLE_STATE_COOKIE_NAME, GOOGLE_STATE_MAX_AGE } from '@/lib/constants';

export async function GET(request: NextRequest) {
  const role = request.nextUrl.searchParams.get('role'); // 'DOCTOR' | 'PHARMACIST' | null (null = login-only, existing accounts)

  if (role && role !== 'DOCTOR' && role !== 'PHARMACIST') {
    return NextResponse.json({ ok: false, error: 'Invalid role for Google sign-up' }, { status: 400 });
  }

  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return NextResponse.json(
      { ok: false, error: 'Google sign-in is not configured on this server yet.' },
      { status: 503 },
    );
  }

  const csrf = crypto.randomBytes(24).toString('hex');
  // Bind the intended role to this specific browser round-trip so a caller
  // can't swap roles by editing the query string after the redirect starts.
  const state = JSON.stringify({ csrf, role: role || null });
  const redirectUri = new URL('/api/auth/google/callback', request.nextUrl.origin).toString();

  const authUrl = buildGoogleAuthUrl({ redirectUri, state: Buffer.from(state).toString('base64url') });

  const response = NextResponse.redirect(authUrl);
  response.cookies.set(GOOGLE_STATE_COOKIE_NAME, csrf, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: GOOGLE_STATE_MAX_AGE,
    path: '/',
  });
  return response;
}
