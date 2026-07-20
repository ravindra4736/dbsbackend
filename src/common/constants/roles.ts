/**
 * Canonical system role slugs.
 */
export const ROLES = {
  SUPER_ADMIN: 'super-admin',
  ADMIN: 'admin',
  EDITOR: 'editor',
  AUTHOR: 'author',
  SEO_MANAGER: 'seo-manager',
} as const;

export type RoleSlug = (typeof ROLES)[keyof typeof ROLES];

export const SYSTEM_ROLE_SLUGS: RoleSlug[] = Object.values(ROLES);

/** Roles that bypass permission checks. */
export const SUPER_ADMIN_ROLES: readonly RoleSlug[] = [ROLES.SUPER_ADMIN];
