import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireRole } from '@/lib/auth';
import { jsonError, jsonSuccess } from '@/lib/apiResponse';
import { z } from 'zod';

const UpdateInventorySchema = z.object({
  medicineId: z.string().min(1),
  stock: z.number().int().min(0),
  price: z.number().positive().optional(),
});

export async function GET(request: NextRequest) {
  const auth = requireRole(request, 'PHARMACIST');
  if (auth.error) return jsonError(auth.error, auth.error === 'Unauthorized' ? 401 : 403);

  try {
    // Get pharmacist's pharmacy
    const pharmacy = await prisma.pharmacy.findFirst({
      where: { managerId: auth.user.profileId },
    });
    if (!pharmacy) return jsonSuccess([]);

    const inventoryItems = await prisma.pharmacyInventory.findMany({
      where: { pharmacyId: pharmacy.id },
      include: {
        medicine: { include: { category: true } },
      },
    });

    const formatted = inventoryItems.map((item) => ({
      id: item.id,
      medicineId: item.medicineId,
      name: item.medicine.name,
      category: item.medicine.category.name,
      stock: item.stock,
      minStock: item.minStock,
      price: `₹${item.price}`,
      status: item.stock === 0 ? 'Out of Stock' : item.stock <= item.minStock ? 'Low Stock' : 'In Stock',
    }));

    return jsonSuccess(formatted);
  } catch (err) {
    console.error('[GET /api/pharmacist/inventory]', err);
    return jsonError('Internal server error', 500);
  }
}

export async function PATCH(request: NextRequest) {
  const auth = requireRole(request, 'PHARMACIST');
  if (auth.error) return jsonError(auth.error, auth.error === 'Unauthorized' ? 401 : 403);

  try {
    const body = await request.json();
    const parsed = UpdateInventorySchema.safeParse(body);
    if (!parsed.success) return jsonError(parsed.error.errors[0].message);

    const { medicineId, stock, price } = parsed.data;

    const pharmacy = await prisma.pharmacy.findFirst({
      where: { managerId: auth.user.profileId },
    });
    if (!pharmacy) return jsonError('Pharmacist has no assigned pharmacy', 400);

    const updated = await prisma.pharmacyInventory.upsert({
      where: {
        pharmacyId_medicineId: {
          pharmacyId: pharmacy.id,
          medicineId,
        },
      },
      update: {
        stock,
        ...(price ? { price } : {}),
      },
      create: {
        pharmacyId: pharmacy.id,
        medicineId,
        stock,
        minStock: 20,
        price: price || 50.0,
        status: 'ACTIVE',
      },
    });

    return jsonSuccess(updated);
  } catch (err) {
    console.error('[PATCH /api/pharmacist/inventory]', err);
    return jsonError('Internal server error', 500);
  }
}
