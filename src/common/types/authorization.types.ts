import type { PermissionSlug } from '../constants/permissions';
import type { RoleSlug } from '../constants/roles';

/**
 * Authenticated request user shape from JwtStrategy.
 * Permissions are resolved separately (not stored in JWT).
 */
export type AuthenticatedUser = {
  userId: string;
  email: string;
  roles: string[];
  sessionId: string;
  /** Populated by PermissionsGuard when resolved for the request. */
  permissions?: string[];
};

export type PermissionCheckMode = 'all' | 'any';

export type ResolvedPermissions = {
  userId: string;
  permissions: PermissionSlug[] | string[];
  roles: string[];
  isSuperAdmin: boolean;
};

export type RolePermissionMap = Partial<Record<RoleSlug, readonly string[]>>;
