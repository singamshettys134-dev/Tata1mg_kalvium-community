import { NextRequest } from 'next/server';
import { Prisma, PrescriptionStatus } from '@prisma/client';
import prisma from '@/lib/prisma';
import { requireRole } from '@/lib/auth';
import { jsonError, jsonSuccess } from '@/lib/apiResponse';
import { z } from 'zod';

const CreateRxSchema = z.object({
  patientId: z.string().min(1, 'Patient ID required'),
  notes: z.string().optional(),
  items: z
    .array(
      z.object({
        medicineId: z.string().min(1, 'Medicine ID required'),
        dosage: z.string().min(1, 'Dosage required'),
        frequency: z.string().optional(),
        duration: z.string().min(1, 'Duration required'),
      }),
    )
    .min(1, 'At least one medicine item required'),
});

export async function GET(request: NextRequest) {
  const auth = requireRole(request, 'DOCTOR');
  if (auth.error) return jsonError(auth.error, auth.error === 'Unauthorized' ? 401 : 403);

  try {
    const sp = request.nextUrl.searchParams;
    const statusParam = sp.get('status');

    const where: Prisma.PrescriptionWhereInput = { doctorId: auth.user.profileId };
    if (statusParam) {
      where.status = statusParam.toUpperCase() as PrescriptionStatus;
    }

    const prescriptions = await prisma.prescription.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        patient: { select: { id: true, name: true, phone: true } },
        items: { include: { medicine: true } },
      },
    });

    const formatted = prescriptions.map((rx) => ({
      id: rx.id,
      patient: rx.patient.name,
      patientId: rx.patient.id,
      status: rx.status,
      createdAt: rx.createdAt.toISOString(),
      approvedAt: rx.status === 'VERIFIED' || rx.status === 'DISPENSED' ? rx.updatedAt.toISOString() : null,
      rejectedAt: rx.status === 'REJECTED' ? rx.updatedAt.toISOString() : null,
      medicines: rx.items.map((i) => `${i.medicine.name} ${i.dosage}`).join(', '),
      duration: rx.items[0]?.duration || '30 days',
      notes: rx.notes,
      items: rx.items,
    }));

    return jsonSuccess(formatted);
  } catch (err) {
    console.error('[GET /api/doctor/prescriptions]', err);
    return jsonError('Internal server error', 500);
  }
}

export async function POST(request: NextRequest) {
  const auth = requireRole(request, 'DOCTOR');
  if (auth.error) return jsonError(auth.error, auth.error === 'Unauthorized' ? 401 : 403);

  try {
    const body = await request.json();
    const parsed = CreateRxSchema.safeParse(body);
    if (!parsed.success) return jsonError(parsed.error.errors[0].message);

    const { patientId, notes, items } = parsed.data;

    // Use Prisma transaction for atomic prescription creation
    const prescription = await prisma.$transaction(async (tx) => {
      const rx = await tx.prescription.create({
        data: {
          doctorId: auth.user.profileId,
          patientId,
          notes,
          status: 'PENDING',
          items: {
            create: items.map((item) => ({
              medicineId: item.medicineId,
              dosage: item.dosage,
              frequency: item.frequency,
              duration: item.duration,
            })),
          },
        },
        include: {
          patient: true,
          items: { include: { medicine: true } },
        },
      });

      return rx;
    });

    return jsonSuccess(prescription, 201);
  } catch (err) {
    console.error('[POST /api/doctor/prescriptions]', err);
    return jsonError('Internal server error', 500);
  }
}
