import { Global, Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';
import { PermissionResolverService } from './permission-resolver.service';
import { PermissionsController } from './permissions.controller';
import { PermissionsGuard } from '../common/guards/permissions.guard';

@Global()
@Module({
  imports: [PrismaModule, RedisModule],
  controllers: [PermissionsController],
  providers: [PermissionResolverService, PermissionsGuard],
  exports: [PermissionResolverService, PermissionsGuard],
})
export class AuthorizationModule {}
