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

    // Monthly revenue for the last 6 months, from real order totals
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const recentOrders = await prisma.order.findMany({
      where: { createdAt: { gte: sixMonthsAgo } },
      select: { createdAt: true, totalCost: true },
    });

    const monthsMap: Record<string, number> = {};
    const monthCursor = new Date(sixMonthsAgo);
    for (let i = 0; i < 6; i++) {
      const label = monthCursor.toLocaleDateString('en-US', { month: 'short' });
      monthsMap[label] = 0;
      monthCursor.setMonth(monthCursor.getMonth() + 1);
    }

    recentOrders.forEach((o) => {
      const label = o.createdAt.toLocaleDateString('en-US', { month: 'short' });
      if (monthsMap[label] !== undefined) monthsMap[label] += o.totalCost;
    });

    const monthlyRevenue = Object.entries(monthsMap).map(([month, revenue]) => ({
      month,
      revenue: Math.round(revenue),
    }));

    // Category breakdown, from order items -> medicine -> category
    const CATEGORY_COLORS: Record<string, string> = {};
    const PALETTE = ['#FF6B6B', '#2563EB', '#00B894', '#F59E0B', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];

    const orderItems = await prisma.orderItem.findMany({
      select: { quantity: true, medicine: { select: { category: { select: { name: true } } } } },
    });

    const categoryCounts: Record<string, number> = {};
    orderItems.forEach((item) => {
      const catName = item.medicine.category?.name ?? 'Others';
      categoryCounts[catName] = (categoryCounts[catName] || 0) + item.quantity;
    });

    const totalCategoryUnits = Object.values(categoryCounts).reduce((a, b) => a + b, 0);
    const categoryData = Object.entries(categoryCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count], i) => {
        if (!CATEGORY_COLORS[name]) CATEGORY_COLORS[name] = PALETTE[i % PALETTE.length];
        return {
          name,
          value: totalCategoryUnits > 0 ? Math.round((count / totalCategoryUnits) * 100) : 0,
          color: CATEGORY_COLORS[name],
        };
      });

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
      monthlyRevenue,
      categoryData,
    });
  } catch (err) {
    console.error('[GET /api/admin/metrics]', err);
    return jsonError('Internal server error', 500);
  }
}
