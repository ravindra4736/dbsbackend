import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SitemapService {
  constructor(private readonly prisma: PrismaService) {}

  async generateXml() {
    const pages = await this.prisma.page.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: { updatedAt: 'desc' },
    });
    const blogs = await this.prisma.blog.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: { updatedAt: 'desc' },
    });
    const categories = await this.prisma.category.findMany({
      orderBy: { updatedAt: 'desc' },
    });

    const items = [
      ...pages.map((page) => ({
        loc: `${process.env.APP_URL}/pages/${page.slug}`,
        lastmod: page.updatedAt.toISOString(),
      })),
      ...blogs.map((blog) => ({
        loc: `${process.env.APP_URL}/blogs/${blog.slug}`,
        lastmod: blog.updatedAt.toISOString(),
      })),
      ...categories.map((category) => ({
        loc: `${process.env.APP_URL}/category/${category.slug}`,
        lastmod: category.updatedAt.toISOString(),
      })),
    ];

    return this.buildXml(items);
  }

  private buildXml(items: Array<{ loc: string; lastmod: string }>) {
    const urlset = items
      .map(
        (item) =>
          `<url><loc>${item.loc}</loc><lastmod>${item.lastmod}</lastmod><changefreq>weekly</changefreq></url>`,
      )
      .join('');

    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urlset}</urlset>`;
  }
}
