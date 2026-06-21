import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class SettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async findAll() {
    const cached = await this.redis.get('settings:all');
    if (cached) {
      return cached;
    }

    const settings = await this.prisma.setting.findMany({ orderBy: { createdAt: 'asc' } });
    await this.redis.set('settings:all', settings, 300);
    return settings;
  }

  findOne(key: string) {
    return this.prisma.setting.findUnique({ where: { key } });
  }

  async upsert(key: string, value: unknown, group?: string, label?: string, description?: string) {
    const record = await this.prisma.setting.upsert({
      where: { key },
      create: { key, value: value as any, group, label, description },
      update: { value: value as any, group, label, description },
    });
    await this.redis.del('settings:all');
    return record;
  }

  remove(key: string) {
    return this.prisma.setting.delete({ where: { key } });
  }
}
