import { SetMetadata, applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { PermissionCheckMode } from '../types/authorization.types';

export const PERMISSIONS_KEY = 'permissions';
export const PERMISSIONS_MODE_KEY = 'permissions_mode';

/**
 * Require the listed permissions on a route handler or controller.
 * Default mode is "all" (every listed permission required).
 */
export const Permissions = (
  ...permissions: string[]
): ReturnType<typeof SetMetadata> => SetMetadata(PERMISSIONS_KEY, permissions);

/**
 * Control whether any or all listed permissions are required.
 */
export const PermissionsMode = (
  mode: PermissionCheckMode,
): ReturnType<typeof SetMetadata> => SetMetadata(PERMISSIONS_MODE_KEY, mode);

/**
 * Composite decorator: permissions metadata + Swagger authz docs.
 */
export function RequirePermissions(
  ...permissions: string[]
): MethodDecorator & ClassDecorator {
  return applyDecorators(
    Permissions(...permissions),
    ApiBearerAuth(),
    ApiUnauthorizedResponse({
      description: 'Missing or invalid authentication credentials (401)',
    }),
    ApiForbiddenResponse({
      description: 'Authenticated but missing required permissions (403)',
    }),
  );
}

/**
 * Require any one of the listed permissions.
 */
export function RequireAnyPermission(
  ...permissions: string[]
): MethodDecorator & ClassDecorator {
  return applyDecorators(
    Permissions(...permissions),
    PermissionsMode('any'),
    ApiBearerAuth(),
    ApiUnauthorizedResponse({
      description: 'Missing or invalid authentication credentials (401)',
    }),
    ApiForbiddenResponse({
      description: 'Authenticated but missing required permissions (403)',
    }),
  );
}
