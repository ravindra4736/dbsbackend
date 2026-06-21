import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SeoService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.seoMeta.findMany({ orderBy: { createdAt: 'desc' } });
  }

  findOne(id: string) {
    return this.prisma.seoMeta.findUnique({ where: { id } });
  }

  create(data: {
    metaTitle?: string;
    metaDescription?: string;
    canonicalUrl?: string;
    robotsIndex?: boolean;
    robotsFollow?: boolean;
    ogTitle?: string;
    ogDescription?: string;
    ogImage?: string;
    twitterTitle?: string;
    twitterDescription?: string;
    twitterImage?: string;
    schemaJson?: unknown;
  }) {
    return this.prisma.seoMeta.create({ data: data as any });
  }

  update(id: string, data: Partial<any>) {
    return this.prisma.seoMeta.update({ where: { id }, data: data as any });
  }

  remove(id: string) {
    return this.prisma.seoMeta.delete({ where: { id } });
  }
}
