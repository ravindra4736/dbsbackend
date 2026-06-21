import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PermissionsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.permission.findMany({ orderBy: { createdAt: 'desc' } });
  }

  findOne(id: string) {
    return this.prisma.permission.findUnique({ where: { id } });
  }

  create(data: { name: string; description?: string }) {
    return this.prisma.permission.create({ data });
  }

  update(id: string, data: { name?: string; description?: string }) {
    return this.prisma.permission.update({ where: { id }, data });
  }

  remove(id: string) {
    return this.prisma.permission.delete({ where: { id } });
  }
}
