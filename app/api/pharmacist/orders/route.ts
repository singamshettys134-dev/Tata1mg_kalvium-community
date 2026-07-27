import { NextRequest } from 'next/server';
import { OrderStatus } from '@prisma/client';
import prisma from '@/lib/prisma';
import { requireRole } from '@/lib/auth';
import { jsonError, jsonSuccess } from '@/lib/apiResponse';

export async function GET(request: NextRequest) {
  const auth = requireRole(request, 'PHARMACIST');
  if (auth.error) return jsonError(auth.error, auth.error === 'Unauthorized' ? 401 : 403);

  try {
    const pharmacy = await prisma.pharmacy.findFirst({
      where: { managerId: auth.user.profileId },
    });

    if (!pharmacy) return jsonSuccess([]);

    const orders = await prisma.order.findMany({
      where: { pharmacyId: pharmacy.id },
      orderBy: { createdAt: 'desc' },
      include: {
        patient: true,
        prescription: true,
        address: true,
      },
    });

    const formatted = orders.map((ord) => ({
      id: ord.id,
      patient: ord.patient.name,
      rx: ord.prescriptionId,
      date: ord.createdAt.toLocaleDateString(),
      total: `₹${ord.totalCost}`,
      status: ord.status,
      address: ord.address ? `${ord.address.line1}, ${ord.address.city}` : '',
    }));

    return jsonSuccess(formatted);
  } catch (err) {
    console.error('[GET /api/pharmacist/orders]', err);
    return jsonError('Internal server error', 500);
  }
}

export async function PATCH(request: NextRequest) {
  const auth = requireRole(request, 'PHARMACIST');
  if (auth.error) return jsonError(auth.error, auth.error === 'Unauthorized' ? 401 : 403);

  try {
    const pharmacy = await prisma.pharmacy.findFirst({
      where: { managerId: auth.user.profileId },
    });
    if (!pharmacy) return jsonError('Pharmacist has no assigned pharmacy', 403);

    const body = await request.json();
    if (!body.orderId || !body.status) {
      return jsonError('orderId and status required', 400);
    }

    if (!Object.values(OrderStatus).includes(body.status as OrderStatus)) {
      return jsonError('Invalid order status', 400);
    }

    const order = await prisma.order.findUnique({
      where: { id: body.orderId },
    });

    if (!order) {
      return jsonError('Order not found', 404);
    }

    if (order.pharmacyId !== pharmacy.id) {
      return jsonError('Forbidden: Order does not belong to your pharmacy', 403);
    }

    const updated = await prisma.order.update({
      where: { id: body.orderId },
      data: { status: body.status as OrderStatus },
    });

    return jsonSuccess(updated);
  } catch (err) {
    console.error('[PATCH /api/pharmacist/orders]', err);
    return jsonError('Internal server error', 500);
  }
}
