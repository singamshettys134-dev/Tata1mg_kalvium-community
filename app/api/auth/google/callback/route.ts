import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { signToken, SESSION_COOKIE_NAME, SESSION_MAX_AGE } from '@/lib/auth';
import {
  exchangeCodeForTokens,
  fetchGoogleProfile,
  signPendingGoogleSignup,
  type SignupRole,
} from '@/lib/googleAuth';
import {
  GOOGLE_STATE_COOKIE_NAME,
  GOOGLE_PENDING_COOKIE_NAME,
  GOOGLE_PENDING_MAX_AGE,
} from '@/lib/constants';

function redirectToAuthError(origin: string, message: string) {
  const url = new URL('/auth', origin);
  url.searchParams.set('error', message);
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const code = request.nextUrl.searchParams.get('code');
  const stateRaw = request.nextUrl.searchParams.get('state');
  const stateCookie = request.cookies.get(GOOGLE_STATE_COOKIE_NAME)?.value;

  if (!code || !stateRaw || !stateCookie) {
    return redirectToAuthError(origin, 'Google sign-in was cancelled or expired. Please try again.');
  }

  let parsedState: { csrf: string; role: SignupRole | null };
  try {
    parsedState = JSON.parse(Buffer.from(stateRaw, 'base64url').toString('utf-8'));
  } catch {
    return redirectToAuthError(origin, 'Invalid Google sign-in response. Please try again.');
  }

  if (parsedState.csrf !== stateCookie) {
    return redirectToAuthError(origin, 'Could not verify the Google sign-in request. Please try again.');
  }

  try {
    const redirectUri = new URL('/api/auth/google/callback', origin).toString();
    const tokens = await exchangeCodeForTokens(code, redirectUri);
    const profile = await fetchGoogleProfile(tokens.access_token);

    if (!profile.email_verified) {
      return redirectToAuthError(origin, 'Your Google email is not verified. Please verify it with Google first.');
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: profile.email },
      include: { doctorProfile: true, pharmacistProfile: true, adminProfile: true },
    });

    if (existingUser) {
      if (existingUser.deletedAt) {
        return redirectToAuthError(origin, 'This account is no longer active.');
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

      const destination = existingUser.role === 'DOCTOR' ? '/doctor' : existingUser.role === 'PHARMACIST' ? '/pharmacist' : '/admin';
      const response = NextResponse.redirect(new URL(destination, origin));
      response.cookies.set(SESSION_COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: SESSION_MAX_AGE,
        path: '/',
      });
      response.cookies.delete(GOOGLE_STATE_COOKIE_NAME);
      return response;
    }

    // No existing account — this is a new signup. Google can verify identity
    // but can't supply license numbers / specialization / etc., so send them
    // to a short form to finish registration.
    if (!parsedState.role) {
      return redirectToAuthError(origin, 'No account found for that Google email. Please sign up first.');
    }

    const pendingToken = signPendingGoogleSignup({
      email: profile.email,
      name: profile.name,
      role: parsedState.role,
      googleSub: profile.sub,
    });

    const response = NextResponse.redirect(new URL('/auth/complete-profile', origin));
    response.cookies.set(GOOGLE_PENDING_COOKIE_NAME, pendingToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: GOOGLE_PENDING_MAX_AGE,
      path: '/',
    });
    response.cookies.delete(GOOGLE_STATE_COOKIE_NAME);
    return response;
  } catch (err) {
    console.error('[GET /api/auth/google/callback]', err);
    return redirectToAuthError(origin, 'Something went wrong signing in with Google. Please try again.');
  }
}
