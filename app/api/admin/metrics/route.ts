import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireRole } from '@/lib/auth';
import { jsonError, jsonSuccess } from '@/lib/apiResponse';

export async function GET(request: NextRequest) {
  const auth = requireRole(request, 'ADMIN');
  if (auth.error) return jsonError(auth.error, auth.error === 'Unauthorized' ? 401 : 403);

  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const [
      doctorCount,
      pharmacistCount,
      pharmacyCount,
      patientCount,
      prescriptionCount,
      orderCount,
      pendingDoctors,
      pendingPharmacists,
      pendingPharmacies,
      recentPrescriptions,
    ] = await Promise.all([
      prisma.doctorProfile.count(),
      prisma.pharmacistProfile.count(),
      prisma.pharmacy.count(),
      prisma.patient.count(),
      prisma.prescription.count(),
      prisma.order.count(),
      prisma.doctorProfile.count({ where: { status: 'PENDING' } }),
      prisma.pharmacistProfile.count({ where: { status: 'PENDING' } }),
      prisma.pharmacy.count({ where: { status: 'PENDING' } }),
      prisma.prescription.findMany({
        where: { createdAt: { gte: sevenDaysAgo } },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      }),
    ]);

    // Aggregate daily prescriptions for last 7 days
    const daysMap: Record<string, number> = {};
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      daysMap[label] = 0;
    }

    recentPrescriptions.forEach((p) => {
      const label = p.createdAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (daysMap[label] !== undefined) daysMap[label]++;
    });

    const dailyPrescriptions = Object.entries(daysMap).map(([date, count]) => ({ date, count }));

    // Real top doctors query
    const topDoctorsData = await prisma.prescription.groupBy({
      by: ['doctorId'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 5,
    });

    const doctorIds = topDoctorsData.map((d) => d.doctorId);
    const doctorProfiles = await prisma.doctorProfile.findMany({
      where: { id: { in: doctorIds } },
      select: { id: true, name: true },
    });

    const topDoctors = topDoctorsData.map((td) => {
      const doc = doctorProfiles.find((dp) => dp.id === td.doctorId);
      return {
        name: doc ? doc.name : 'Unknown Doctor',
        prescriptions: td._count.id,
      };
    });

    return jsonSuccess({
      counts: {
        doctors: doctorCount,
        pharmacists: pharmacistCount,
        pharmacies: pharmacyCount,
        patients: patientCount,
        prescriptions: prescriptionCount,
        orders: orderCount,
      },
      pendingVerifications: {
        doctors: pendingDoctors,
        pharmacists: pendingPharmacists,
        pharmacies: pendingPharmacies,
      },
      dailyPrescriptions,
      topDoctors,
    });
  } catch (err) {
    console.error('[GET /api/admin/metrics]', err);
    return jsonError('Internal server error', 500);
  }
}
