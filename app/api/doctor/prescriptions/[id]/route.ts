import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireRole } from '@/lib/auth';
import { jsonError, jsonSuccess } from '@/lib/apiResponse';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = requireRole(request, 'DOCTOR');
  if (auth.error) return jsonError(auth.error, auth.error === 'Unauthorized' ? 401 : 403);

  const prescription = await prisma.prescription.findUnique({
    where: { id: params.id },
    include: {
      patient: true,
      doctor: true,
      items: { include: { medicine: true } },
      documents: { include: { fileUpload: true } },
    },
  });

  if (!prescription) return jsonError('Prescription not found', 404);
  if (prescription.doctorId !== auth.user.profileId) {
    return jsonError('Forbidden', 403);
  }
  return jsonSuccess(prescription);
}
