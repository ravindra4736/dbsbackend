import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from './prisma/prisma.service';

@Injectable()
export class AppService {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async getHello() {
    const userCount = await this.prisma.user.count();

    return {
      env: this.configService.get('app.env'),
      url: this.configService.get('app.url'),
      userCount,
    };
  }
}