import { NextRequest } from 'next/server';
import crypto from 'crypto';
import prisma from '@/lib/prisma';
import { jsonError, jsonSuccess } from '@/lib/apiResponse';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email || typeof email !== 'string') {
      return jsonError('Email is required', 400);
    }

    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });

    if (user) {
      const token = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          token,
          expiresAt,
        },
      });
    }

    return jsonSuccess({
      message: 'If an account with that email exists, password reset instructions have been sent.',
    });
  } catch (err) {
    console.error('[POST /api/auth/reset-password]', err);
    return jsonError('Internal server error', 500);
  }
}
