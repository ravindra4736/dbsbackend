import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateActivityLogParams {
  userId?: string;
  action: string;
  entityType?: string;
  entityId?: string;
  description?: string;
  oldValues?: any;
  newValues?: any;
  ipAddress?: string;
  userAgent?: string;
}

export interface GetActivityLogsQuery {
  page?: number;
  limit?: number;
  userId?: string;
  action?: string;
  entityType?: string;
}

@Injectable()
export class ActivityLogsService {
  constructor(private readonly prisma: PrismaService) {}

  async log(data: CreateActivityLogParams) {
    return this.prisma.activityLog.create({
      data: {
        userId: data.userId || null,
        action: data.action,
        entityType: data.entityType || null,
        entityId: data.entityId || null,
        description: data.description || null,
        oldValues: data.oldValues || null,
        newValues: data.newValues || null,
        ipAddress: data.ipAddress || null,
        userAgent: data.userAgent || null,
      },
    });
  }

  async findAll(query: GetActivityLogsQuery) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 25;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query.userId) {
      where.userId = query.userId;
    }
    if (query.action) {
      where.action = query.action;
    }
    if (query.entityType) {
      where.entityType = query.entityType;
    }

    const [total, items] = await Promise.all([
      this.prisma.activityLog.count({ where }),
      this.prisma.activityLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      }),
    ]);

    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
