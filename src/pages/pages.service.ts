import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PagesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.page.findMany({ orderBy: { updatedAt: 'desc' } });
  }

  findOne(id: string) {
    return this.prisma.page.findUnique({ where: { id } });
  }

  create(data: {
    title: string;
    slug: string;
    content?: string;
    status?: string;
    seoId?: string;
    publishedAt?: Date;
  }) {
    return this.prisma.page.create({ data: data as any });
  }

  update(id: string, data: Partial<{ title: string; slug: string; content: string; status: string; seoId: string; publishedAt: Date }>) {
    return this.prisma.page.update({ where: { id }, data: data as any });
  }

  remove(id: string) {
    return this.prisma.page.delete({ where: { id } });
  }
}
