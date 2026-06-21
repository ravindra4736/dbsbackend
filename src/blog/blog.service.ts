import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BlogService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(params: { search?: string; page?: number; pageSize?: number }) {
    const { search, page = 1, pageSize = 20 } = params;
    const where = search
      ? {
          OR: [
            { title: { contains: search, mode: 'insensitive' } },
            { excerpt: { contains: search, mode: 'insensitive' } },
            { content: { contains: search, mode: 'insensitive' } },
            { slug: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {};

    return this.prisma.blog.findMany({
      where,
      include: { author: true, categories: { include: { category: true } }, tags: { include: { tag: true } }, seo: true },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { publishedAt: 'desc' },
    });
  }

  findOne(id: string) {
    return this.prisma.blog.findUnique({
      where: { id },
      include: { author: true, categories: { include: { category: true } }, tags: { include: { tag: true } }, seo: true },
    });
  }

  create(data: {
    title: string;
    slug: string;
    excerpt?: string;
    content?: string;
    featuredImage?: string;
    status?: string;
    publishedAt?: Date;
    authorId: string;
    seoId?: string;
    categoryIds?: string[];
    tagIds?: string[];
  }) {
    return this.prisma.blog.create({
      data: {
        title: data.title,
        slug: data.slug,
        excerpt: data.excerpt,
        content: data.content,
        featuredImage: data.featuredImage,
        status: data.status as any,
        publishedAt: data.publishedAt,
        authorId: data.authorId,
        seoId: data.seoId,
        categories: data.categoryIds
          ? {
              create: data.categoryIds.map((categoryId) => ({ categoryId })),
            }
          : undefined,
        tags: data.tagIds
          ? {
              create: data.tagIds.map((tagId) => ({ tagId })),
            }
          : undefined,
      },
    });
  }

  update(id: string, data: Partial<any>) {
    const updateData: any = { ...data };
    if (data.categoryIds) {
      updateData.categories = {
        deleteMany: {},
        create: data.categoryIds.map((categoryId) => ({ categoryId })),
      };
    }
    if (data.tagIds) {
      updateData.tags = {
        deleteMany: {},
        create: data.tagIds.map((tagId) => ({ tagId })),
      };
    }
    return this.prisma.blog.update({ where: { id }, data: updateData });
  }

  remove(id: string) {
    return this.prisma.blog.delete({ where: { id } });
  }
}
