import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RobotsService {
  constructor(private readonly prisma: PrismaService) {}

  async getRobotsTxt() {
    const content = await this.prisma.setting.findUnique({
      where: { key: 'robots_txt' },
    });

    return content?.value ?? 'User-agent: *\nAllow: /';
  }

  async upsert(content: string) {
    return this.prisma.setting.upsert({
      where: { key: 'robots_txt' },
      create: { key: 'robots_txt', value: content },
      update: { value: content },
    });
  }
}
