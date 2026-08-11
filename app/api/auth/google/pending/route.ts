import { NextRequest, NextResponse } from 'next/server';
import { verifyPendingGoogleSignup } from '@/lib/googleAuth';
import { GOOGLE_PENDING_COOKIE_NAME } from '@/lib/constants';

export async function GET(request: NextRequest) {
  const token = request.cookies.get(GOOGLE_PENDING_COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.json({ ok: false, error: 'No pending Google sign-up found.' }, { status: 404 });
  }

  const pending = verifyPendingGoogleSignup(token);
  if (!pending) {
    return NextResponse.json({ ok: false, error: 'Your Google sign-up session expired. Please try again.' }, { status: 401 });
  }

  return NextResponse.json({ ok: true, data: { email: pending.email, name: pending.name, role: pending.role } });
}
