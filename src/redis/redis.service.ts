import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: Redis;
  private readonly logger = new Logger(RedisService.name);

  constructor(private readonly configService: ConfigService) {
    this.client = new Redis({
      host: this.configService.get<string>('redis.host'),
      port: this.configService.get<number>('redis.port'),
    });
  }

  async onModuleInit() {
    this.client.on('connect', () => this.logger.log('Redis connected')); 
    this.client.on('error', (error) => this.logger.error('Redis error', error));
    await this.client.ping();
  }

  async onModuleDestroy() {
    await this.client.quit();
  }

  getClient(): Redis {
    return this.client;
  }

  async get<T>(key: string): Promise<T | null> {
    const value = await this.client.get(key);
    return value ? (JSON.parse(value) as T) : null;
  }

  async set(key: string, value: unknown, ttlSeconds?: number) {
    if (ttlSeconds) {
      await this.client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
      return;
    }

    await this.client.set(key, JSON.stringify(value));
  }

  async del(key: string) {
    await this.client.del(key);
  }
}
