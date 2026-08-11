import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';
import { signToken, SESSION_COOKIE_NAME, SESSION_MAX_AGE } from '@/lib/auth';
import { verifyPendingGoogleSignup } from '@/lib/googleAuth';
import { GOOGLE_PENDING_COOKIE_NAME } from '@/lib/constants';
import { CompleteGoogleSignupSchema } from '@/lib/validationSchemas';

export async function POST(request: NextRequest) {
  try {
    const pendingToken = request.cookies.get(GOOGLE_PENDING_COOKIE_NAME)?.value;
    if (!pendingToken) {
      return NextResponse.json({ ok: false, error: 'No pending Google sign-up found. Please start again.' }, { status: 401 });
    }

    const pending = verifyPendingGoogleSignup(pendingToken);
    if (!pending) {
      return NextResponse.json({ ok: false, error: 'Your Google sign-up session expired. Please try again.' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = CompleteGoogleSignupSchema.safeParse({ ...body, role: pending.role });
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: parsed.error.errors[0].message }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email: pending.email } });
    if (existing) {
      return NextResponse.json({ ok: false, error: 'An account with this email already exists. Try signing in instead.' }, { status: 409 });
    }

    // Google accounts don't use a password — set an unusable random hash so
    // password-based login can never succeed for this account.
    const passwordHash = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);

    let profileId = '';
    let user;

    if (parsed.data.role === 'DOCTOR') {
      user = await prisma.user.create({
        data: {
          email: pending.email,
          passwordHash,
          role: 'DOCTOR',
          doctorProfile: {
            create: {
              name: pending.name,
              email: pending.email,
              specialization: parsed.data.specialization,
              licenseNumber: parsed.data.licenseNumber,
              phone: parsed.data.phone,
              status: 'PENDING',
            },
          },
        },
        include: { doctorProfile: true },
      });
      profileId = user.doctorProfile!.id;
    } else {
      user = await prisma.user.create({
        data: {
          email: pending.email,
          passwordHash,
          role: 'PHARMACIST',
          pharmacistProfile: {
            create: {
              name: pending.name,
              email: pending.email,
              licenseNumber: parsed.data.licenseNumber,
              phone: parsed.data.phone,
              qualifications: parsed.data.qualifications,
              status: 'PENDING',
            },
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
      data: { userId: user.id, action: 'LOGIN', details: `Account created via Google sign-up (${pending.email})` },
    });

    const response = NextResponse.json({
      ok: true,
      user: { id: user.id, name: pending.name, email: pending.email, role: user.role, profileId, approvalStatus: 'PENDING' },
    });
    response.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SESSION_MAX_AGE,
      path: '/',
    });
    response.cookies.delete(GOOGLE_PENDING_COOKIE_NAME);
    return response;
  } catch (err) {
    console.error('[POST /api/auth/google/complete]', err);
    return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 });
  }
}
