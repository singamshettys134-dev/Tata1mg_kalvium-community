import { NextRequest, NextResponse } from 'next/server';
import { verifyGooglePendingToken, GOOGLE_PENDING_COOKIE_NAME } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const token = request.cookies.get(GOOGLE_PENDING_COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.json({ ok: false, error: 'No pending Google sign-in.' }, { status: 404 });
  }

  const payload = verifyGooglePendingToken(token);
  if (!payload) {
    return NextResponse.json({ ok: false, error: 'Google sign-in link expired. Please try again.' }, { status: 410 });
  }

  return NextResponse.json({ ok: true, email: payload.email, name: payload.name });
}
