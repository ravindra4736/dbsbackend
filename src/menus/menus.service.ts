import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MenusService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.menu.findMany({
      include: { items: { include: { children: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  findOne(id: string) {
    return this.prisma.menu.findUnique({
      where: { id },
      include: { items: { include: { children: true } } },
    });
  }

  create(data: { name: string; slug: string }) {
    return this.prisma.menu.create({ data });
  }

  update(id: string, data: Partial<{ name: string; slug: string }>) {
    return this.prisma.menu.update({ where: { id }, data });
  }

  remove(id: string) {
    return this.prisma.menu.delete({ where: { id } });
  }

  addItem(data: {
    menuId: string;
    parentId?: string;
    label: string;
    url: string;
    external?: boolean;
    order?: number;
  }) {
    return this.prisma.menuItem.create({ data });
  }

  updateItem(id: string, data: Partial<any>) {
    return this.prisma.menuItem.update({ where: { id }, data });
  }

  removeItem(id: string) {
    return this.prisma.menuItem.delete({ where: { id } });
  }
}
