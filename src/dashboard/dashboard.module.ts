import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';

@Module({
  imports: [PrismaModule, RedisModule],
  providers: [DashboardService],
  controllers: [DashboardController],
})
export class DashboardModule {}
