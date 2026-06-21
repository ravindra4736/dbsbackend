import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async getStats() {
    const cached = await this.redis.get('dashboard:stats');
    if (cached) {
      return cached;
    }

    const [users, blogs, pages, media, auditLogs] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.blog.count(),
      this.prisma.page.count(),
      this.prisma.media.count(),
      this.prisma.auditLog.count(),
    ]);

    const result = {
      totalUsers: users,
      totalBlogs: blogs,
      totalPages: pages,
      totalMedia: media,
      totalAuditLogs: auditLogs,
    };

    await this.redis.set('dashboard:stats', result, 60);
    return result;
  }
}
