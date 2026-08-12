import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { exchangeGoogleCode } from '@/lib/googleAuth';
import { signToken, signGooglePendingToken, GOOGLE_PENDING_COOKIE_NAME, GOOGLE_PENDING_MAX_AGE } from '@/lib/auth';
import { SESSION_COOKIE_NAME, SESSION_MAX_AGE, GOOGLE_STATE_COOKIE_NAME } from '@/lib/constants';

const ROLE_HOME: Record<string, string> = {
  ADMIN: '/admin',
  DOCTOR: '/doctor',
  PHARMACIST: '/pharmacist',
};

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const expectedState = request.cookies.get(GOOGLE_STATE_COOKIE_NAME)?.value;

  const failUrl = new URL('/auth', request.url);

  if (!code || !state || !expectedState || state !== expectedState) {
    failUrl.searchParams.set('error', 'google_auth_failed');
    return NextResponse.redirect(failUrl);
  }

  try {
    const profile = await exchangeGoogleCode(code);

    const existingUser = await prisma.user.findFirst({
      where: { OR: [{ googleId: profile.sub }, { email: profile.email }] },
      include: { doctorProfile: true, pharmacistProfile: true, adminProfile: true },
    });

    if (existingUser) {
      // Backfill googleId the first time someone signed up with a password
      // and later chooses "Continue with Google" using the same email.
      if (!existingUser.googleId) {
        await prisma.user.update({ where: { id: existingUser.id }, data: { googleId: profile.sub } });
      }

      let profileId = '';
      if (existingUser.role === 'DOCTOR' && existingUser.doctorProfile) profileId = existingUser.doctorProfile.id;
      else if (existingUser.role === 'PHARMACIST' && existingUser.pharmacistProfile) profileId = existingUser.pharmacistProfile.id;
      else if (existingUser.role === 'ADMIN' && existingUser.adminProfile) profileId = existingUser.adminProfile.id;

      const token = signToken({ userId: existingUser.id, role: existingUser.role, profileId });
      await prisma.session.create({
        data: { userId: existingUser.id, token, expiresAt: new Date(Date.now() + SESSION_MAX_AGE * 1000) },
      });
      await prisma.auditLog.create({
        data: { userId: existingUser.id, action: 'LOGIN', details: `Google login from ${profile.email}` },
      });

      const redirectUrl = new URL(ROLE_HOME[existingUser.role] ?? '/auth', request.url);
      const response = NextResponse.redirect(redirectUrl);
      response.cookies.set(SESSION_COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: SESSION_MAX_AGE,
        path: '/',
      });
      response.cookies.set(GOOGLE_STATE_COOKIE_NAME, '', { maxAge: 0, path: '/' });
      return response;
    }

    // No account yet — hand back a short-lived, server-signed proof of the
    // verified Google identity and send them to finish signup (pick role +
    // license/specialization details) on the /auth page.
    const pendingToken = signGooglePendingToken({
      email: profile.email,
      name: profile.name ?? '',
      googleId: profile.sub,
    });

    const redirectUrl = new URL('/auth', request.url);
    redirectUrl.searchParams.set('completeProfile', '1');
    const response = NextResponse.redirect(redirectUrl);
    response.cookies.set(GOOGLE_PENDING_COOKIE_NAME, pendingToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: GOOGLE_PENDING_MAX_AGE,
      path: '/',
    });
    response.cookies.set(GOOGLE_STATE_COOKIE_NAME, '', { maxAge: 0, path: '/' });
    return response;
  } catch (err) {
    console.error('[GET /api/auth/google/callback]', err);
    failUrl.searchParams.set('error', 'google_auth_failed');
    return NextResponse.redirect(failUrl);
  }
}
