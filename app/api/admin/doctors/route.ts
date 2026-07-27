import { NextRequest } from 'next/server';
import { ApprovalStatus, Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { requireRole } from '@/lib/auth';
import { CreateDoctorSchema, ListQuerySchema } from '@/lib/validationSchemas';
import { jsonError, jsonSuccess } from '@/lib/apiResponse';
import bcrypt from 'bcryptjs';

export async function GET(request: NextRequest) {
  const auth = requireRole(request, 'ADMIN');
  if (auth.error) return jsonError(auth.error, auth.error === 'Unauthorized' ? 401 : 403);

  try {
    const sp = request.nextUrl.searchParams;
    const parsed = ListQuerySchema.safeParse({
      page: sp.get('page') || undefined,
      limit: sp.get('limit') || undefined,
      search: sp.get('search') || undefined,
      status: sp.get('status') || undefined,
      sortBy: sp.get('sortBy') || undefined,
      sortOrder: sp.get('sortOrder') || undefined,
    });
    if (!parsed.success) return jsonError(parsed.error.errors[0].message);

    const { page = 1, limit = 10, search, status, sortBy = 'date', sortOrder = 'desc' } = parsed.data;

    const where: Prisma.DoctorProfileWhereInput = {};
    if (status) where.status = status as ApprovalStatus;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { licenseNumber: { contains: search, mode: 'insensitive' } },
        { specialization: { contains: search, mode: 'insensitive' } },
      ];
    }

    const orderBy: Prisma.DoctorProfileOrderByWithRelationInput =
      sortBy === 'name' ? { name: sortOrder } :
      sortBy === 'status' ? { status: sortOrder } :
      { createdAt: sortOrder };

    const [data, total] = await Promise.all([
      prisma.doctorProfile.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: { user: { select: { createdAt: true } } },
      }),
      prisma.doctorProfile.count({ where }),
    ]);

    return jsonSuccess({
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error('[GET /api/admin/doctors]', err);
    return jsonError('Internal server error', 500);
  }
}

export async function POST(request: NextRequest) {
  const auth = requireRole(request, 'ADMIN');
  if (auth.error) return jsonError(auth.error, auth.error === 'Unauthorized' ? 401 : 403);

  try {
    const body = await request.json();
    const parsed = CreateDoctorSchema.safeParse(body);
    if (!parsed.success) return jsonError(parsed.error.errors[0].message);

    const { name, email, specialization, licenseNumber, phone } = parsed.data;

    // Duplicate guard
    const existing = await prisma.doctorProfile.findUnique({ where: { email } });
    if (existing) return jsonError('A doctor with this email already exists', 409);

    const tempPassword = Math.random().toString(36).slice(-10);
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    const doctor = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role: 'DOCTOR',
        doctorProfile: { create: { name, email, specialization, licenseNumber, phone, status: 'PENDING' } },
      },
      include: { doctorProfile: true },
    });

    await prisma.auditLog.create({
      data: {
        userId: auth.user.userId,
        action: 'CREATE_DOCTOR',
        details: `Created doctor profile for ${email}`,
      },
    });

    return jsonSuccess({ ...doctor.doctorProfile, tempPassword }, 201);
  } catch (err) {
    console.error('[POST /api/admin/doctors]', err);
    return jsonError('Internal server error', 500);
  }
}
