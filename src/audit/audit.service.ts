import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(page = 1, pageSize = 25) {
    return this.prisma.auditLog.findMany({
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
      include: { user: true },
    });
  }

  log(data: {
    userId: string;
    action: string;
    entity?: string;
    entityId?: string;
    ipAddress?: string;
    userAgent?: string;
    metadata?: unknown;
  }) {
    // cast metadata as any to satisfy Prisma JSON input types
    return this.prisma.auditLog.create({ data: data as any });
  }
}
