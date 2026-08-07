import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireRole } from '@/lib/auth';
import { jsonError, jsonSuccess } from '@/lib/apiResponse';

export async function GET(request: NextRequest) {
  const auth = requireRole(request, 'PHARMACIST');
  if (auth.error) return jsonError(auth.error, auth.error === 'Unauthorized' ? 401 : 403);

  try {
    // SECURITY: reports must be scoped to the requesting pharmacist's own
    // pharmacy. Without this filter, any pharmacist could see order volume
    // and revenue for every pharmacy on the platform (cross-tenant data leak).
    const pharmacy = await prisma.pharmacy.findFirst({
      where: { managerId: auth.user.profileId },
    });

    if (!pharmacy) {
      return jsonSuccess({ weeklyOrders: [], totalOrders: 0 });
    }

    const orders = await prisma.order.findMany({
      where: { pharmacyId: pharmacy.id },
      take: 100,
      orderBy: { createdAt: 'desc' },
      select: {
        createdAt: true,
        totalCost: true,
        status: true,
      },
    });

    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const weeklyMap: Record<string, { orders: number; revenue: number }> = {};
    days.forEach((d) => {
      weeklyMap[d] = { orders: 0, revenue: 0 };
    });

    orders.forEach((o) => {
      const dayName = days[new Date(o.createdAt).getDay()];
      if (weeklyMap[dayName]) {
        weeklyMap[dayName].orders += 1;
        weeklyMap[dayName].revenue += Number(o.totalCost || 0);
      }
    });

    const weeklyOrders = days.map((d) => ({
      day: d,
      orders: weeklyMap[d].orders,
      revenue: weeklyMap[d].revenue,
    }));

    return jsonSuccess({
      weeklyOrders,
      totalOrders: orders.length,
    });
  } catch (err) {
    console.error('[GET /api/pharmacist/reports]', err);
    return jsonError('Internal server error', 500);
  }
}
