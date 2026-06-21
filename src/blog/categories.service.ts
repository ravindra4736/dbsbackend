import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.category.findMany({ orderBy: { createdAt: 'desc' } });
  }

  findOne(id: string) {
    return this.prisma.category.findUnique({ where: { id } });
  }

  create(data: { name: string; slug: string; description?: string }) {
    return this.prisma.category.create({ data });
  }

  update(id: string, data: Partial<{ name: string; slug: string; description?: string }>) {
    return this.prisma.category.update({ where: { id }, data });
  }

  remove(id: string) {
    return this.prisma.category.delete({ where: { id } });
  }
}
