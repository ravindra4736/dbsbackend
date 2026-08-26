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
import { AuthorizationModule } from './authorization/authorization.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { CmsModule } from './cms/cms.module';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    RedisModule,
    AuthorizationModule,
    AuthModule,
    UsersModule,
    RolesModule,
    ActivityLogsModule,
    DashboardModule,
    CmsModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
