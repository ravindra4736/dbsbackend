import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RedirectsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.redirect.findMany({ orderBy: { createdAt: 'desc' } });
  }

  findOne(id: string) {
    return this.prisma.redirect.findUnique({ where: { id } });
  }

  create(data: { sourceUrl: string; destinationUrl: string; statusCode?: number; enabled?: boolean }) {
    return this.prisma.redirect.create({ data });
  }

  update(id: string, data: Partial<{ sourceUrl: string; destinationUrl: string; statusCode: number; enabled: boolean }>) {
    return this.prisma.redirect.update({ where: { id }, data });
  }

  remove(id: string) {
    return this.prisma.redirect.delete({ where: { id } });
  }
}
