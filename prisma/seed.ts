import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import * as argon2 from 'argon2';
import * as dotenv from 'dotenv';
import { URL } from 'url';
import {
  ALL_PERMISSION_SLUGS,
  PERMISSION_DEFINITIONS,
  PERMISSIONS,
} from '../src/common/constants/permissions';
import { ROLES } from '../src/common/constants/roles';

dotenv.config();

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error('DATABASE_URL environment variable is not set.');
}

const parsed = new URL(url);
const adapterOptions: any = {
  host: parsed.hostname,
  user: parsed.username ? decodeURIComponent(parsed.username) : undefined,
  password: parsed.password ? decodeURIComponent(parsed.password) : undefined,
  allowPublicKeyRetrieval: true,
};
if (parsed.pathname && parsed.pathname !== '/') {
  adapterOptions.database = parsed.pathname.replace(/^\//, '');
}
if (parsed.port) {
  adapterOptions.port = Number(parsed.port);
}

const adapter = new PrismaMariaDb(adapterOptions);
const prisma = new PrismaClient({ adapter } as any);

/** Default role → permission slug mappings (super-admin bypasses at runtime). */
const ROLE_PERMISSION_MAP: Record<string, string[]> = {
  [ROLES.SUPER_ADMIN]: [...ALL_PERMISSION_SLUGS],
  [ROLES.ADMIN]: [...ALL_PERMISSION_SLUGS],
  [ROLES.EDITOR]: [
    PERMISSIONS.USERS_VIEW,
    PERMISSIONS.ROLES_VIEW,
    PERMISSIONS.ACTIVITY_VIEW,
    PERMISSIONS.CMS_PAGES_VIEW,
    PERMISSIONS.CMS_PAGES_CREATE,
    PERMISSIONS.CMS_PAGES_UPDATE,
    PERMISSIONS.CMS_PAGES_DELETE,
    PERMISSIONS.MEDIA_VIEW,
    PERMISSIONS.MEDIA_UPLOAD,
    PERMISSIONS.DASHBOARD_VIEW,
  ],
  [ROLES.AUTHOR]: [
    PERMISSIONS.USERS_VIEW,
    PERMISSIONS.CMS_PAGES_VIEW,
    PERMISSIONS.CMS_PAGES_CREATE,
    PERMISSIONS.CMS_PAGES_UPDATE,
    PERMISSIONS.MEDIA_VIEW,
    PERMISSIONS.MEDIA_UPLOAD,
    PERMISSIONS.DASHBOARD_VIEW,
  ],
  [ROLES.SEO_MANAGER]: [
    PERMISSIONS.USERS_VIEW,
    PERMISSIONS.CMS_PAGES_VIEW,
    PERMISSIONS.CMS_PAGES_UPDATE,
    PERMISSIONS.SETTINGS_VIEW,
    PERMISSIONS.DASHBOARD_VIEW,
  ],
};

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. See .env.example.`,
    );
  }
  return value;
}

function splitAdminName(fullName: string): {
  firstName: string;
  lastName: string | null;
} {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return { firstName: 'Super', lastName: 'Admin' };
  }
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: null };
  }
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(' '),
  };
}

function sameStringSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) {
    return false;
  }
  const left = [...a].sort();
  const right = [...b].sort();
  return left.every((value, index) => value === right[index]);
}

/**
 * Bootstrap Super Admin from env (idempotent).
 * - Creates the user only when missing
 * - Never overwrites an existing password
 * - Assigns super-admin role only when missing
 */
async function seedSuperAdminUser(superAdminRoleId: string): Promise<void> {
  const email = requireEnv('SUPER_ADMIN_EMAIL').toLowerCase();
  const password = requireEnv('SUPER_ADMIN_PASSWORD');
  const fullName = requireEnv('SUPER_ADMIN_NAME');
  const { firstName, lastName } = splitAdminName(fullName);

  console.log('Bootstrapping Super Admin user from environment...');

  const existingUser = await prisma.user.findUnique({
    where: { email },
    include: {
      userRoles: {
        where: { roleId: superAdminRoleId },
      },
    },
  });

  if (!existingUser) {
    // Match AuthService: argon2.hash(password) with library defaults
    const passwordHash = await argon2.hash(password);

    const user = await prisma.user.create({
      data: {
        email,
        firstName,
        lastName,
        passwordHash,
        status: 'ACTIVE',
        emailVerifiedAt: new Date(),
      },
    });

    await prisma.userRole.create({
      data: {
        userId: user.id,
        roleId: superAdminRoleId,
      },
    });

    console.log(
      `Super Admin CREATED: ${email} (role: ${ROLES.SUPER_ADMIN}). Use SUPER_ADMIN_PASSWORD from your environment to log in.`,
    );
    return;
  }

  let roleAssigned = false;
  if (existingUser.userRoles.length === 0) {
    await prisma.userRole.create({
      data: {
        userId: existingUser.id,
        roleId: superAdminRoleId,
      },
    });
    roleAssigned = true;
  }

  // Never overwrite password for an existing account
  if (roleAssigned) {
    console.log(
      `Super Admin ALREADY EXISTED: ${email}. Assigned missing role "${ROLES.SUPER_ADMIN}". Password was not changed.`,
    );
  } else {
    console.log(
      `Super Admin ALREADY EXISTED: ${email}. Role "${ROLES.SUPER_ADMIN}" already assigned. No changes made.`,
    );
  }
}

async function main() {
  console.log('Seeding default permissions (dot notation)...');

  // Remove legacy permissions BEFORE upserting so unique `name` does not collide
  // with renamed slugs (e.g. create:users → users.create).
  const legacy = await prisma.permission.findMany({
    where: {
      OR: [
        { slug: { contains: ':' } },
        { slug: { notIn: [...ALL_PERMISSION_SLUGS] } },
      ],
    },
  });

  if (legacy.length > 0) {
    await prisma.rolePermission.deleteMany({
      where: { permissionId: { in: legacy.map((p) => p.id) } },
    });
    await prisma.permission.deleteMany({
      where: { id: { in: legacy.map((p) => p.id) } },
    });
    console.log(`Removed ${legacy.length} legacy permission(s).`);
  }

  for (const perm of PERMISSION_DEFINITIONS) {
    const existing = await prisma.permission.findUnique({
      where: { slug: perm.slug },
    });

    if (!existing) {
      await prisma.permission.create({
        data: {
          slug: perm.slug,
          name: perm.name,
          description: perm.description,
          resource: perm.resource,
          action: perm.action,
        },
      });
      continue;
    }

    const unchanged =
      existing.name === perm.name &&
      existing.description === perm.description &&
      existing.resource === perm.resource &&
      existing.action === perm.action;

    if (!unchanged) {
      await prisma.permission.update({
        where: { slug: perm.slug },
        data: {
          name: perm.name,
          description: perm.description,
          resource: perm.resource,
          action: perm.action,
        },
      });
    }
  }

  console.log('Seeding default roles...');
  const roles = [
    {
      name: 'Super Admin',
      slug: ROLES.SUPER_ADMIN,
      description: 'Highest access level, can manage everything.',
      isProtected: true,
      isSystem: true,
    },
    {
      name: 'Admin',
      slug: ROLES.ADMIN,
      description:
        'Administrative access for system configuration and user management.',
      isProtected: true,
      isSystem: true,
    },
    {
      name: 'Editor',
      slug: ROLES.EDITOR,
      description: 'Can publish and manage posts including those of other users.',
      isProtected: false,
      isSystem: true,
    },
    {
      name: 'Author',
      slug: ROLES.AUTHOR,
      description: 'Can publish and manage their own posts.',
      isProtected: false,
      isSystem: true,
    },
    {
      name: 'SEO Manager',
      slug: ROLES.SEO_MANAGER,
      description: 'Can manage SEO meta tags, sitemaps, and redirects.',
      isProtected: false,
      isSystem: true,
    },
  ];

  for (const role of roles) {
    const existing = await prisma.role.findUnique({
      where: { slug: role.slug },
    });

    if (!existing) {
      await prisma.role.create({ data: role });
      continue;
    }

    const unchanged =
      existing.name === role.name &&
      existing.description === role.description &&
      existing.isProtected === role.isProtected &&
      existing.isSystem === role.isSystem;

    if (!unchanged) {
      await prisma.role.update({
        where: { slug: role.slug },
        data: {
          name: role.name,
          description: role.description,
          isProtected: role.isProtected,
          isSystem: role.isSystem,
        },
      });
    }
  }

  console.log('Mapping permissions to roles...');
  const seededRoles = await prisma.role.findMany();
  const seededPermissions = await prisma.permission.findMany({
    where: { slug: { in: [...ALL_PERMISSION_SLUGS] } },
  });
  const permissionIdBySlug = new Map(
    seededPermissions.map((permission) => [permission.slug, permission.id]),
  );

  for (const role of seededRoles) {
    const desiredSlugs = ROLE_PERMISSION_MAP[role.slug] || [];
    const desiredPermissionIds = desiredSlugs
      .map((slug) => permissionIdBySlug.get(slug))
      .filter((id): id is string => Boolean(id));

    const existingMappings = await prisma.rolePermission.findMany({
      where: { roleId: role.id },
      select: { permissionId: true },
    });
    const existingPermissionIds = existingMappings.map((row) => row.permissionId);

    if (sameStringSet(existingPermissionIds, desiredPermissionIds)) {
      continue;
    }

    await prisma.rolePermission.deleteMany({
      where: { roleId: role.id },
    });

    if (desiredPermissionIds.length > 0) {
      await prisma.rolePermission.createMany({
        data: desiredPermissionIds.map((permissionId) => ({
          roleId: role.id,
          permissionId,
        })),
      });
    }
  }

  const superAdminRole = await prisma.role.findUnique({
    where: { slug: ROLES.SUPER_ADMIN },
  });

  if (!superAdminRole) {
    throw new Error(
      `Required system role "${ROLES.SUPER_ADMIN}" was not found after seeding roles.`,
    );
  }

  await seedSuperAdminUser(superAdminRole.id);

  console.log('Seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
