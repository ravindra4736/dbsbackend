import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  PERMISSIONS_KEY,
  PERMISSIONS_MODE_KEY,
} from '../decorators/permissions.decorator';
import { PermissionResolverService } from '../../authorization/permission-resolver.service';
import type {
  AuthenticatedUser,
  PermissionCheckMode,
} from '../types/authorization.types';

type RequestWithUser = {
  user?: AuthenticatedUser;
};

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly permissionResolver: PermissionResolverService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions =
      this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) || [];

    const mode =
      this.reflector.getAllAndOverride<PermissionCheckMode>(
        PERMISSIONS_MODE_KEY,
        [context.getHandler(), context.getClass()],
      ) || 'all';

    // No permission metadata → allow (JwtAuthGuard / RolesGuard still apply)
    if (requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;

    if (!user || !user.userId) {
      throw new UnauthorizedException(
        'Authentication required to access this resource.',
      );
    }

    const resolved = await this.permissionResolver.resolveForUser(
      user.userId,
      user.roles || [],
    );

    // Attach resolved permissions to the request for downstream handlers
    user.permissions = resolved.permissions as string[];
    request.user = user;

    const allowed = this.permissionResolver.hasPermission(
      resolved,
      requiredPermissions,
      mode,
    );

    if (!allowed) {
      throw new ForbiddenException(
        'You do not have permission to perform this action.',
      );
    }

    return true;
  }
}
