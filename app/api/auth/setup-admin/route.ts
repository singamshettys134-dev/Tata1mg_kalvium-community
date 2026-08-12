/**
 * POST /api/auth/setup-admin
 *
 * One-time admin account bootstrap.
 * - Disabled automatically once any ADMIN user exists in the DB, so it's
 *   safe to leave deployed — it becomes a no-op after first use.
 * - Protected by SETUP_ADMIN_SECRET (env var) so random users can't call it.
 *
 * Usage (curl):
 *   curl -X POST https://your-app.vercel.app/api/auth/setup-admin \
 *     -H "Content-Type: application/json" \
 *     -d '{"secret":"YOUR_SETUP_ADMIN_SECRET","email":"admin@yourdomain.com","password":"YourStrongPassword123","name":"Super Admin"}'
 *
 * Or just hit it from your browser's DevTools console / Postman / Insomnia.
 *
 * Required env vars:
 *   SETUP_ADMIN_SECRET  — any random string you set; acts as a one-time key.
 *                         Generate one with: openssl rand -base64 24
 *
 * Optional env vars (with defaults):
 *   ADMIN_EMPLOYEE_ID   — defaults to "ADM-001"
 *   ADMIN_DEPARTMENT    — defaults to "Compliance"
 */

import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    // ── 1. Parse body ────────────────────────────────────────────────────────
    let body: { secret?: string; email?: string; password?: string; name?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 });
    }

    const { secret, email, password, name } = body;

    // ── 2. Check the setup secret ────────────────────────────────────────────
    const requiredSecret = process.env.SETUP_ADMIN_SECRET;
    if (!requiredSecret) {
      return NextResponse.json(
        { ok: false, error: 'SETUP_ADMIN_SECRET is not configured. Set it in your environment variables.' },
        { status: 500 },
      );
    }
    if (!secret || secret !== requiredSecret) {
      return NextResponse.json({ ok: false, error: 'Invalid setup secret.' }, { status: 403 });
    }

    // ── 3. Validate inputs ───────────────────────────────────────────────────
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ ok: false, error: 'A valid email is required.' }, { status: 400 });
    }
    if (!password || password.length < 8) {
      return NextResponse.json({ ok: false, error: 'Password must be at least 8 characters.' }, { status: 400 });
    }
    if (!name || name.trim().length < 2) {
      return NextResponse.json({ ok: false, error: 'A display name (at least 2 chars) is required.' }, { status: 400 });
    }

    // ── 4. Guard: disabled once any ADMIN exists ─────────────────────────────
    const existingAdmin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    if (existingAdmin) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'An admin account already exists. This endpoint is disabled once an admin is present. ' +
            'Use the normal login flow or reset the password via your database.',
        },
        { status: 409 },
      );
    }

    // ── 5. Check email not already taken ────────────────────────────────────
    const emailTaken = await prisma.user.findUnique({ where: { email } });
    if (emailTaken) {
      return NextResponse.json(
        { ok: false, error: 'That email is already registered. Choose a different one.' },
        { status: 409 },
      );
    }

    // ── 6. Create the admin ──────────────────────────────────────────────────
    const passwordHash = await bcrypt.hash(password, 12);

    const adminUser = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role: 'ADMIN',
        adminProfile: {
          create: {
            name: name.trim(),
            employeeId: process.env.ADMIN_EMPLOYEE_ID || 'ADM-001',
            department: process.env.ADMIN_DEPARTMENT || 'Compliance',
          },
        },
      },
      include: { adminProfile: true },
    });

    return NextResponse.json(
      {
        ok: true,
        message: 'Admin account created successfully. You can now log in at /auth.',
        admin: {
          id: adminUser.id,
          email: adminUser.email,
          name: adminUser.adminProfile?.name,
          employeeId: adminUser.adminProfile?.employeeId,
        },
      },
      { status: 201 },
    );
  } catch (err) {
    console.error('[POST /api/auth/setup-admin]', err);
    return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 });
  }
}

// Block GET so the route doesn't accidentally show in browser URL previews
export async function GET() {
  return NextResponse.json(
    { ok: false, error: 'Use POST to create the admin account.' },
    { status: 405 },
  );
}
