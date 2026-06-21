import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TagsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.tag.findMany({ orderBy: { createdAt: 'desc' } });
  }

  findOne(id: string) {
    return this.prisma.tag.findUnique({ where: { id } });
  }

  create(data: { name: string; slug: string }) {
    return this.prisma.tag.create({ data });
  }

  update(id: string, data: Partial<{ name: string; slug: string }>) {
    return this.prisma.tag.update({ where: { id }, data });
  }

  remove(id: string) {
    return this.prisma.tag.delete({ where: { id } });
  }
}
