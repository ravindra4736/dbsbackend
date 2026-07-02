import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import * as argon2 from 'argon2';
import * as dotenv from 'dotenv';
import { URL } from 'url';

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

async function main() {
  console.log('Seeding default permissions...');
  const permissions = [
    // Users permissions
    { name: 'Create Users', slug: 'create:users', description: 'Can create system users', resource: 'users', action: 'create' },
    { name: 'Read Users', slug: 'read:users', description: 'Can view system users', resource: 'users', action: 'read' },
    { name: 'Update Users', slug: 'update:users', description: 'Can update system users', resource: 'users', action: 'update' },
    { name: 'Delete Users', slug: 'delete:users', description: 'Can delete system users', resource: 'users', action: 'delete' },
    // Roles permissions
    { name: 'Create Roles', slug: 'create:roles', description: 'Can create system roles', resource: 'roles', action: 'create' },
    { name: 'Read Roles', slug: 'read:roles', description: 'Can view system roles', resource: 'roles', action: 'read' },
    { name: 'Update Roles', slug: 'update:roles', description: 'Can update system roles', resource: 'roles', action: 'update' },
    { name: 'Delete Roles', slug: 'delete:roles', description: 'Can delete system roles', resource: 'roles', action: 'delete' },
    // Activity Log permissions
    { name: 'Read Activity Logs', slug: 'read:activity-logs', description: 'Can view activity logs', resource: 'activity-logs', action: 'read' },
  ];

  for (const perm of permissions) {
    await prisma.permission.upsert({
      where: { slug: perm.slug },
      update: { name: perm.name, description: perm.description, resource: perm.resource, action: perm.action },
      create: perm,
    });
  }

  console.log('Seeding default roles...');
  const roles = [
    {
      name: 'Super Admin',
      slug: 'super-admin',
      description: 'Highest access level, can manage everything.',
      isProtected: true,
      isSystem: true,
    },
    {
      name: 'Admin',
      slug: 'admin',
      description: 'Administrative access for system configuration and user management.',
      isProtected: true,
      isSystem: true,
    },
    {
      name: 'Editor',
      slug: 'editor',
      description: 'Can publish and manage posts including those of other users.',
      isProtected: false,
      isSystem: true,
    },
    {
      name: 'Author',
      slug: 'author',
      description: 'Can publish and manage their own posts.',
      isProtected: false,
      isSystem: true,
    },
    {
      name: 'SEO Manager',
      slug: 'seo-manager',
      description: 'Can manage SEO meta tags, sitemaps, and redirects.',
      isProtected: false,
      isSystem: true,
    },
  ];

  for (const role of roles) {
    await prisma.role.upsert({
      where: { slug: role.slug },
      update: { name: role.name, description: role.description, isProtected: role.isProtected, isSystem: role.isSystem },
      create: role,
    });
  }

  console.log('Mapping permissions to roles...');
  const seededRoles = await prisma.role.findMany();
  const seededPermissions = await prisma.permission.findMany();

  const rolePermMap: Record<string, string[]> = {
    'super-admin': seededPermissions.map((p) => p.slug),
    'admin': seededPermissions.map((p) => p.slug),
    'editor': ['read:users', 'read:roles', 'read:activity-logs'],
    'author': ['read:users'],
    'seo-manager': ['read:users'],
  };

  for (const role of seededRoles) {
    const permSlugs = rolePermMap[role.slug] || [];
    const rolePermissions = seededPermissions.filter((p) => permSlugs.includes(p.slug));

    // Clear existing mapped permissions to keep seeding idempotent
    await prisma.rolePermission.deleteMany({
      where: { roleId: role.id },
    });

    // Create mappings
    if (rolePermissions.length > 0) {
      await prisma.rolePermission.createMany({
        data: rolePermissions.map((p) => ({
          roleId: role.id,
          permissionId: p.id,
        })),
      });
    }
  }

  const superAdminRole = await prisma.role.findUnique({
    where: { slug: 'super-admin' },
  });

  if (!superAdminRole) {
    throw new Error('Super Admin role could not be seeded.');
  }

  console.log('Seeding default Super Admin user...');
  const adminEmail = 'admin@dbsbackend.local';
  const existingUser = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (!existingUser) {
    const passwordHash = await argon2.hash('SuperAdmin123!');
    const user = await prisma.user.create({
      data: {
        email: adminEmail,
        firstName: 'Super',
        lastName: 'Admin',
        passwordHash,
        status: 'ACTIVE',
        emailVerifiedAt: new Date(),
      },
    });

    // Assign super-admin role via UserRole junction table
    await prisma.userRole.create({
      data: {
        userId: user.id,
        roleId: superAdminRole.id,
      },
    });

    console.log('Super Admin user created: admin@dbsbackend.local / SuperAdmin123!');
  } else {
    // Check if user has the super-admin role assigned
    const existingUserRole = await prisma.userRole.findFirst({
      where: {
        userId: existingUser.id,
        roleId: superAdminRole.id,
      },
    });

    if (!existingUserRole) {
      await prisma.userRole.create({
        data: {
          userId: existingUser.id,
          roleId: superAdminRole.id,
        },
      });
      console.log('Super Admin role assigned to existing user.');
    } else {
      console.log('Super Admin user already exists with correct role.');
    }
  }

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
