import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { PrismaModule } from './prisma/prisma.module';
import { ConfigModule } from './config/config.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { RolesModule } from './roles/roles.module';
import { RedisModule } from './redis/redis.module';
import { ActivityLogsModule } from './activity-logs/activity-logs.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    RedisModule,
    AuthModule,
    UsersModule,
    RolesModule,
    ActivityLogsModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule { }
