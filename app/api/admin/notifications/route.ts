import { NextRequest } from 'next/server';
import { NotificationType } from '@prisma/client';
import prisma from '@/lib/prisma';
import { requireAuth, requireRole } from '@/lib/auth';
import { CreateNotificationSchema, ListQuerySchema } from '@/lib/validationSchemas';
import { jsonError, jsonSuccess } from '@/lib/apiResponse';

export async function GET(request: NextRequest) {
  const auth = requireAuth(request);
  if (auth.error) return jsonError(auth.error, 401);

  try {
    const sp = request.nextUrl.searchParams;
    const parsed = ListQuerySchema.safeParse({
      page: sp.get('page') || undefined,
      limit: sp.get('limit') || undefined,
    });

    const page = parsed.success && parsed.data.page ? parsed.data.page : 1;
    const limit = parsed.success && parsed.data.limit ? parsed.data.limit : 20;

    const where = { userId: auth.user.userId };

    const [data, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.notification.count({ where }),
    ]);

    const formattedData = data.map((n) => ({
      id: n.id,
      userId: n.userId,
      title: n.title || 'Notification',
      body: n.body || n.message,
      message: n.message,
      type: n.type,
      read: n.read,
      createdAt: n.createdAt.toISOString(),
      time: n.createdAt.toISOString(),
    }));

    return jsonSuccess({
      data: formattedData,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error('[GET /api/admin/notifications]', err);
    return jsonError('Internal server error', 500);
  }
}

export async function POST(request: NextRequest) {
  const auth = requireAuth(request);
  if (auth.error) return jsonError(auth.error, 401);

  try {
    const body = await request.json();

    if (body.action === 'markAllRead') {
      await prisma.notification.updateMany({
        where: { userId: auth.user.userId, read: false },
        data: { read: true },
      });

      const updatedList = await prisma.notification.findMany({
        where: { userId: auth.user.userId },
        orderBy: { createdAt: 'desc' },
        take: 20,
      });

      return jsonSuccess(updatedList);
    }

    const adminAuth = requireRole(request, 'ADMIN');
    if (adminAuth.error) return jsonError(adminAuth.error, adminAuth.error === 'Unauthorized' ? 401 : 403);

    const parsed = CreateNotificationSchema.safeParse(body);
    if (!parsed.success) return jsonError(parsed.error.errors[0].message);

    const { userId, message, type = 'INFO' } = parsed.data;

    const notification = await prisma.notification.create({
      data: {
        userId,
        message,
        title: body.title || 'System Notification',
        body: body.body || message,
        type: type as NotificationType,
        read: false,
      },
    });

    return jsonSuccess(notification, 201);
  } catch (err) {
    console.error('[POST /api/admin/notifications]', err);
    return jsonError('Internal server error', 500);
  }
}
