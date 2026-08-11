import { NextRequest } from 'next/server';
import { PrescriptionStatus } from '@prisma/client';
import prisma from '@/lib/prisma';
import { requireRole } from '@/lib/auth';
import { jsonError, jsonSuccess } from '@/lib/apiResponse';
import { z } from 'zod';

const UpdateRxStatusSchema = z.object({
  status: z.enum(['VERIFIED', 'REJECTED', 'DISPENSED']),
  notes: z.string().optional(),
});

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = requireRole(request, 'PHARMACIST');
  if (auth.error) return jsonError(auth.error, auth.error === 'Unauthorized' ? 401 : 403);

  try {
    const body = await request.json();
    const parsed = UpdateRxStatusSchema.safeParse(body);
    if (!parsed.success) return jsonError(parsed.error.errors[0].message);

    const { status, notes } = parsed.data;

    // Use Prisma transaction to atomically inspect & transition prescription status
    const result = await prisma.$transaction(async (tx) => {
      // 1. Fetch current prescription state
      const currentRx = await tx.prescription.findUnique({
        where: { id: params.id },
        include: { orders: true },
      });

      if (!currentRx) {
        return { error: 'Prescription not found', code: 404 };
      }

      // 2. Check if already DISPENSED or REJECTED
      if (currentRx.status === 'DISPENSED') {
        return { error: 'Prescription has already been dispensed and cannot be filled again.', code: 409 };
      }

      if (currentRx.status === 'PENDING' && status === 'DISPENSED') {
        return { error: 'Prescription must be VERIFIED before it can be DISPENSED.', code: 400 };
      }

      if (currentRx.status === 'REJECTED' && status === 'DISPENSED') {
        return { error: 'Cannot dispense a rejected prescription.', code: 400 };
      }

      // 3. Check if another pharmacy has already completed an order for this prescription
      const completedOrder = currentRx.orders.find(
        (order) => order.status === 'DELIVERED' || order.status === 'READY_FOR_DELIVERY' || order.status === 'OUT_FOR_DELIVERY',
      );

      if (completedOrder) {
        return { error: 'Prescription has already been fulfilled by another pharmacy.', code: 409 };
      }

      // 4. Atomic update using updateMany to guarantee single-fill protection against concurrent requests
      const updateCount = await tx.prescription.updateMany({
        where: {
          id: params.id,
          status: { notIn: ['DISPENSED'] },
        },
        data: {
          status: status as PrescriptionStatus,
          ...(notes ? { notes } : {}),
        },
      });

      if (updateCount.count === 0) {
        return { error: 'Prescription status was modified by another concurrent request.', code: 409 };
      }

      // 5. Fetch updated prescription for output response
      const updated = await tx.prescription.findUnique({
        where: { id: params.id },
        include: { patient: true, doctor: true },
      });

      return { data: updated };
    });

    if (result.error) {
      return jsonError(result.error, result.code);
    }

    return jsonSuccess(result.data);
  } catch (err) {
    console.error('[PATCH /api/pharmacist/prescriptions/[id]]', err);
    return jsonError('Internal server error', 500);
  }
}
