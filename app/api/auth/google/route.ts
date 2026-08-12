import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { buildGoogleAuthUrl } from '@/lib/googleAuth';
import { GOOGLE_STATE_COOKIE_NAME, GOOGLE_STATE_MAX_AGE } from '@/lib/constants';

export async function GET(request: NextRequest) {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_REDIRECT_URI) {
    return NextResponse.json(
      { ok: false, error: 'Google sign-in is not configured on this server.' },
      { status: 500 },
    );
  }

  const state = crypto.randomBytes(16).toString('hex');
  const authUrl = buildGoogleAuthUrl(state);

  const response = NextResponse.redirect(authUrl);
  response.cookies.set(GOOGLE_STATE_COOKIE_NAME, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: GOOGLE_STATE_MAX_AGE,
    path: '/',
  });
  return response;
}
