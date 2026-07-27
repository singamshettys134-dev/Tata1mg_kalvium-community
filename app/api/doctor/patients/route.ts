import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireRole } from '@/lib/auth';
import { jsonError, jsonSuccess } from '@/lib/apiResponse';

export async function GET(request: NextRequest) {
  const auth = requireRole(request, 'DOCTOR');
  if (auth.error) return jsonError(auth.error, auth.error === 'Unauthorized' ? 401 : 403);

  try {
    const sp = request.nextUrl.searchParams;
    const search = sp.get('search') || undefined;

    const patients = await prisma.patient.findMany({
      where: {
        prescriptions: {
          some: { doctorId: auth.user.profileId },
        },
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { phone: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: { updatedAt: 'desc' },
      include: {
        prescriptions: {
          where: { doctorId: auth.user.profileId },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    const formatted = patients.map((p) => {
      const lastRx = p.prescriptions[0];
      return {
        id: p.id,
        name: p.name,
        age: new Date().getFullYear() - p.dateOfBirth.getFullYear(),
        gender: p.gender,
        condition: 'General',
        lastVisit: lastRx ? lastRx.createdAt.toISOString() : p.createdAt.toISOString(),
        status: 'Active',
        phone: p.phone,
      };
    });

    return jsonSuccess(formatted);
  } catch (err) {
    console.error('[GET /api/doctor/patients]', err);
    return jsonError('Internal server error', 500);
  }
}
