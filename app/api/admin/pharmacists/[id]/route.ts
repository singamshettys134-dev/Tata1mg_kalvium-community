import { NextRequest } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import prisma from '@/lib/prisma';
import { requireRole } from '@/lib/auth';
import { jsonError, jsonSuccess } from '@/lib/apiResponse';

const VALID_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024;

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = requireRole(request, 'ADMIN');
  if (auth.error) return jsonError(auth.error, auth.error === 'Unauthorized' ? 401 : 403);

  try {
    const pharmacist = await prisma.pharmacistProfile.findUnique({ where: { id: params.id } });
    if (!pharmacist) return jsonError('Pharmacist not found', 404);

    const formData = await request.formData();
    const file = formData.get('license') as File | null;
    if (!file) return jsonError('No file provided');
    if (!VALID_MIME_TYPES.includes(file.type)) return jsonError('Invalid file type. Accepted: PDF, JPG, PNG, WEBP');
    if (file.size > MAX_FILE_SIZE) return jsonError('File size must be less than 5 MB');

    const ext = path.extname(file.name) || '.bin';
    const fileName = `pharmacist_${params.id}_${Date.now()}${ext}`;
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'licenses', 'pharmacists');
    await fs.mkdir(uploadDir, { recursive: true });
    await fs.writeFile(path.join(uploadDir, fileName), new Uint8Array(await file.arrayBuffer()));

    const fileUrl = `/uploads/licenses/pharmacists/${fileName}`;
    const upload = await prisma.fileUpload.create({
      data: { fileUrl, fileType: 'LICENSE', mimeType: file.type, uploadedBy: auth.user.userId },
    });

    await prisma.verificationRequest.create({
      data: { entityType: 'PHARMACIST', entityId: params.id, status: 'UNDER_REVIEW', supportingDocumentId: upload.id },
    });

    await prisma.auditLog.create({
      data: { userId: auth.user.userId, action: 'UPLOAD_PHARMACIST_LICENSE', details: `Uploaded license for pharmacist ${params.id}` },
    });

    return jsonSuccess({ fileUrl, fileName, fileSize: file.size, uploadId: upload.id }, 201);
  } catch (err) {
    console.error('[POST /api/admin/pharmacists/[id]/license]', err);
    return jsonError('Failed to upload file', 500);
  }
}
