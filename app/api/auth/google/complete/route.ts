import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';
import {
  signToken,
  verifyGooglePendingToken,
  GOOGLE_PENDING_COOKIE_NAME,
} from '@/lib/auth';
import { SESSION_COOKIE_NAME, SESSION_MAX_AGE } from '@/lib/constants';
import { GoogleCompleteProfileSchema } from '@/lib/validationSchemas';

export async function POST(request: NextRequest) {
  try {
    const pendingCookie = request.cookies.get(GOOGLE_PENDING_COOKIE_NAME)?.value;
    if (!pendingCookie) {
      return NextResponse.json({ ok: false, error: 'No pending Google sign-in. Please try again.' }, { status: 400 });
    }
    const pending = verifyGooglePendingToken(pendingCookie);
    if (!pending) {
      return NextResponse.json({ ok: false, error: 'Google sign-in link expired. Please try again.' }, { status: 410 });
    }

    const body = await request.json();
    const parsed = GoogleCompleteProfileSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: parsed.error.errors[0].message }, { status: 400 });
    }
    const { role, specialization, licenseNumber, phone, qualifications } = parsed.data;

    // Someone may have registered manually with this email between the
    // redirect and now (or clicked Google sign-in twice) — don't double-create.
    const existing = await prisma.user.findUnique({ where: { email: pending.email } });
    if (existing) {
      return NextResponse.json({ ok: false, error: 'An account with this email already exists. Please log in instead.' }, { status: 409 });
    }

    // Google users don't set a password — store an unusable random hash so
    // the passwordHash column (required by the schema) stays populated.
    const passwordHash = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);
    const name = pending.name || pending.email.split('@')[0];

    let profileId = '';
    let user;

    if (role === 'DOCTOR') {
      if (!specialization || !licenseNumber || !phone) {
        return NextResponse.json(
          { ok: false, error: 'Doctors require specialization, licenseNumber, and phone' },
          { status: 400 },
        );
      }
      user = await prisma.user.create({
        data: {
          email: pending.email,
          passwordHash,
          googleId: pending.googleId,
          role: 'DOCTOR',
          doctorProfile: {
            create: { name, email: pending.email, specialization, licenseNumber, phone, status: 'PENDING' },
          },
        },
        include: { doctorProfile: true },
      });
      profileId = user.doctorProfile!.id;
    } else {
      if (!qualifications || !licenseNumber || !phone) {
        return NextResponse.json(
          { ok: false, error: 'Pharmacists require qualifications, licenseNumber, and phone' },
          { status: 400 },
        );
      }
      user = await prisma.user.create({
        data: {
          email: pending.email,
          passwordHash,
          googleId: pending.googleId,
          role: 'PHARMACIST',
          pharmacistProfile: {
            create: { name, email: pending.email, licenseNumber, phone, qualifications, status: 'PENDING' },
          },
        },
        include: { pharmacistProfile: true },
      });
      profileId = user.pharmacistProfile!.id;
    }

    const token = signToken({ userId: user.id, role: user.role, profileId });
    await prisma.session.create({
      data: { userId: user.id, token, expiresAt: new Date(Date.now() + SESSION_MAX_AGE * 1000) },
    });
    await prisma.auditLog.create({
      data: { userId: user.id, action: 'SIGNUP', details: `Google signup from ${pending.email}` },
    });

    const response = NextResponse.json({
      ok: true,
      user: { id: user.id, name, email: pending.email, role: user.role, profileId, approvalStatus: 'PENDING' },
    });
    response.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SESSION_MAX_AGE,
      path: '/',
    });
    response.cookies.set(GOOGLE_PENDING_COOKIE_NAME, '', { maxAge: 0, path: '/' });
    return response;
  } catch (err) {
    console.error('[POST /api/auth/google/complete]', err);
    return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 });
  }
}
