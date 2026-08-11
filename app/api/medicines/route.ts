import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { jsonError, jsonSuccess } from '@/lib/apiResponse';

// Any authenticated role (doctor, pharmacist, admin) can read the medicine
// catalog — doctors need it to build prescriptions, pharmacists to manage
// inventory. This endpoint previously did not exist, so the frontend had no
// way to populate a real medicine picker.
export async function GET(request: NextRequest) {
  const auth = requireAuth(request);
  if (auth.error) return jsonError(auth.error, 401);

  try {
    const medicines = await prisma.medicine.findMany({
      orderBy: { name: 'asc' },
      include: { category: true, manufacturer: true },
    });

    const formatted = medicines.map((m) => ({
      id: m.id,
      name: m.name,
      genericName: m.genericName,
      strength: m.strength,
      dosageForm: m.dosageForm,
      category: m.category?.name,
      manufacturer: m.manufacturer?.name,
      requiresPrescription: m.requiresPrescription,
    }));

    return jsonSuccess(formatted);
  } catch (err) {
    console.error('[GET /api/medicines]', err);
    return jsonError('Internal server error', 500);
  }
}
