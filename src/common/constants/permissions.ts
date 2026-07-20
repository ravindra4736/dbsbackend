/**
 * Canonical permission slugs (dot notation).
 * Single source of truth for seed data, guards, and Swagger docs.
 */
export const PERMISSIONS = {
  // Users
  USERS_VIEW: 'users.view',
  USERS_CREATE: 'users.create',
  USERS_UPDATE: 'users.update',
  USERS_DELETE: 'users.delete',

  // Roles
  ROLES_VIEW: 'roles.view',
  ROLES_CREATE: 'roles.create',
  ROLES_UPDATE: 'roles.update',
  ROLES_DELETE: 'roles.delete',

  // Permissions management
  PERMISSIONS_VIEW: 'permissions.view',
  PERMISSIONS_ASSIGN: 'permissions.assign',

  // Activity logs
  ACTIVITY_VIEW: 'activity.view',

  // CMS pages
  CMS_PAGES_VIEW: 'cms.pages.view',
  CMS_PAGES_CREATE: 'cms.pages.create',
  CMS_PAGES_UPDATE: 'cms.pages.update',
  CMS_PAGES_DELETE: 'cms.pages.delete',

  // Media
  MEDIA_VIEW: 'media.view',
  MEDIA_UPLOAD: 'media.upload',
  MEDIA_DELETE: 'media.delete',

  // Settings
  SETTINGS_VIEW: 'settings.view',
  SETTINGS_UPDATE: 'settings.update',

  // Dashboard
  DASHBOARD_VIEW: 'dashboard.view',
} as const;

export type PermissionSlug = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ALL_PERMISSION_SLUGS: PermissionSlug[] =
  Object.values(PERMISSIONS);

/** Seed metadata for each permission (name, resource, action). */
export const PERMISSION_DEFINITIONS: ReadonlyArray<{
  slug: PermissionSlug;
  name: string;
  description: string;
  resource: string;
  action: string;
}> = [
  {
    slug: PERMISSIONS.USERS_VIEW,
    name: 'View Users',
    description: 'Can view system users',
    resource: 'users',
    action: 'view',
  },
  {
    slug: PERMISSIONS.USERS_CREATE,
    name: 'Create Users',
    description: 'Can create system users',
    resource: 'users',
    action: 'create',
  },
  {
    slug: PERMISSIONS.USERS_UPDATE,
    name: 'Update Users',
    description: 'Can update system users',
    resource: 'users',
    action: 'update',
  },
  {
    slug: PERMISSIONS.USERS_DELETE,
    name: 'Delete Users',
    description: 'Can delete system users',
    resource: 'users',
    action: 'delete',
  },
  {
    slug: PERMISSIONS.ROLES_VIEW,
    name: 'View Roles',
    description: 'Can view system roles',
    resource: 'roles',
    action: 'view',
  },
  {
    slug: PERMISSIONS.ROLES_CREATE,
    name: 'Create Roles',
    description: 'Can create system roles',
    resource: 'roles',
    action: 'create',
  },
  {
    slug: PERMISSIONS.ROLES_UPDATE,
    name: 'Update Roles',
    description: 'Can update system roles',
    resource: 'roles',
    action: 'update',
  },
  {
    slug: PERMISSIONS.ROLES_DELETE,
    name: 'Delete Roles',
    description: 'Can delete system roles',
    resource: 'roles',
    action: 'delete',
  },
  {
    slug: PERMISSIONS.PERMISSIONS_VIEW,
    name: 'View Permissions',
    description: 'Can view permission catalog',
    resource: 'permissions',
    action: 'view',
  },
  {
    slug: PERMISSIONS.PERMISSIONS_ASSIGN,
    name: 'Assign Permissions',
    description: 'Can assign permissions to roles',
    resource: 'permissions',
    action: 'assign',
  },
  {
    slug: PERMISSIONS.ACTIVITY_VIEW,
    name: 'View Activity Logs',
    description: 'Can view activity logs',
    resource: 'activity',
    action: 'view',
  },
  {
    slug: PERMISSIONS.CMS_PAGES_VIEW,
    name: 'View CMS Pages',
    description: 'Can view CMS pages',
    resource: 'cms.pages',
    action: 'view',
  },
  {
    slug: PERMISSIONS.CMS_PAGES_CREATE,
    name: 'Create CMS Pages',
    description: 'Can create CMS pages',
    resource: 'cms.pages',
    action: 'create',
  },
  {
    slug: PERMISSIONS.CMS_PAGES_UPDATE,
    name: 'Update CMS Pages',
    description: 'Can update CMS pages',
    resource: 'cms.pages',
    action: 'update',
  },
  {
    slug: PERMISSIONS.CMS_PAGES_DELETE,
    name: 'Delete CMS Pages',
    description: 'Can delete CMS pages',
    resource: 'cms.pages',
    action: 'delete',
  },
  {
    slug: PERMISSIONS.MEDIA_VIEW,
    name: 'View Media',
    description: 'Can view media library',
    resource: 'media',
    action: 'view',
  },
  {
    slug: PERMISSIONS.MEDIA_UPLOAD,
    name: 'Upload Media',
    description: 'Can upload media files',
    resource: 'media',
    action: 'upload',
  },
  {
    slug: PERMISSIONS.MEDIA_DELETE,
    name: 'Delete Media',
    description: 'Can delete media files',
    resource: 'media',
    action: 'delete',
  },
  {
    slug: PERMISSIONS.SETTINGS_VIEW,
    name: 'View Settings',
    description: 'Can view system settings',
    resource: 'settings',
    action: 'view',
  },
  {
    slug: PERMISSIONS.SETTINGS_UPDATE,
    name: 'Update Settings',
    description: 'Can update system settings',
    resource: 'settings',
    action: 'update',
  },
  {
    slug: PERMISSIONS.DASHBOARD_VIEW,
    name: 'View Dashboard',
    description: 'Can view admin dashboard',
    resource: 'dashboard',
    action: 'view',
  },
];
