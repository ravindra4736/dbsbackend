import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error('DATABASE_URL environment variable is not set.');
    }

    // Parse DATABASE_URL and create a MariaDB adapter for Prisma v7
    const parsed = new URL(url);
    const adapterOptions: any = {
      host: parsed.hostname,
      user: parsed.username ? decodeURIComponent(parsed.username) : undefined,
      password: parsed.password ? decodeURIComponent(parsed.password) : undefined,
      allowPublicKeyRetrieval: true,
    };
    if (parsed.pathname && parsed.pathname !== '/') {
      adapterOptions.database = parsed.pathname.replace(/^\//, '');
    }
    if (parsed.port) {
      adapterOptions.port = Number(parsed.port);
    }

    const adapter = new PrismaMariaDb(adapterOptions as any);

    super({ adapter } as any);
  }

  async onModuleInit() {
    await this.$connect();
  }
}
