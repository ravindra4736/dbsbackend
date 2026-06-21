import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async query(term: string) {
    return {
      pages: await this.prisma.page.findMany({
        where: {
          OR: [
                { title: { contains: term } },
            { content: { contains: term } },
            { slug: { contains: term } },
          ],
          status: 'PUBLISHED',
        },
      }),
      blogs: await this.prisma.blog.findMany({
        where: {
          OR: [
            { title: { contains: term } },
                { excerpt: { contains: term } },
            { content: { contains: term } },
            { slug: { contains: term } },
          ],
          status: 'PUBLISHED',
        },
      }),
    };
  }
}
