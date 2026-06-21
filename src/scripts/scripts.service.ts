import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ScriptsService {
  constructor(private readonly prisma: PrismaService) {}

  create(data: {
    name: string;
    location: 'HEAD' | 'BODY_START' | 'BODY_END';
    code: string;
    enabled?: boolean;
    priority?: number;
  }) {
    return this.prisma.script.create({ data });
  }

  findAll() {
    return this.prisma.script.findMany({ orderBy: [{ location: 'asc' }, { priority: 'asc' }] });
  }

  findOne(id: string) {
    return this.prisma.script.findUnique({ where: { id } });
  }

  findByLocation(location: string) {
    return this.prisma.script.findMany({
      where: { location: location as any, enabled: true },
      orderBy: { priority: 'asc' },
    });
  }

  update(id: string, data: Partial<{ name: string; code: string; enabled: boolean; priority: number }>) {
    return this.prisma.script.update({ where: { id }, data });
  }

  remove(id: string) {
    return this.prisma.script.delete({ where: { id } });
  }
}
